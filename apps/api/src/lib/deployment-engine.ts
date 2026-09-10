import { constants } from "node:fs";
import { access, statfs } from "node:fs/promises";
import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { appById } from "../apps.config.js";
import { env } from "../env.js";
import type {
  AppDefinition,
  CommandDefinition,
  DeployAction,
  FinalDeployStatus,
} from "../types/index.js";
import { prisma } from "./prisma.js";
import { sendDeployNotification } from "./resend.js";

export type DeploymentEvent =
  | { type: "log"; data: string }
  | { type: "stage"; data: string }
  | { type: "exit"; status: FinalDeployStatus };

type Subscriber = (event: DeploymentEvent) => void | Promise<void>;
type RunningDeployment = {
  appId: string;
  process: ChildProcessWithoutNullStreams;
  logs: string[];
  subscribers: Set<Subscriber>;
  completion: Promise<FinalDeployStatus>;
  resolveCompletion: (status: FinalDeployStatus) => void;
  requestedStatus?: FinalDeployStatus;
  startedAt: number;
  heartbeat: NodeJS.Timeout;
  timeout: NodeJS.Timeout;
  finished: boolean;
  writeChain: Promise<void>;
};

type StartRequest = {
  appId: string;
  action?: DeployAction;
  actor?: string;
  requesterIp?: string | null;
};

const ACTIVE_STATUSES = ["queued", "running", "verifying"];
const runningDeployments = new Map<string, RunningDeployment>();
const secretPatterns = [
  /((?:token|password|secret|api[_-]?key)\s*[=:]\s*)\S+/gi,
  /\b(?:re|sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}\b/g,
];

function resolvePath(value: string) {
  if (value === "~") return homedir();
  return value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}

function redact(value: string) {
  return secretPatterns.reduce(
    (output, pattern) =>
      output.replace(
        pattern,
        (_match, first?: unknown) =>
          `${typeof first === "string" ? first : ""}[REDACTED]`,
      ),
    value,
  );
}

function git(cwd: string | undefined, args: string[]) {
  if (!cwd) return null;
  const result = spawnSync("git", args, {
    cwd: resolvePath(cwd),
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

function metadata(cwd?: string) {
  return {
    branch: git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]),
    revision: git(cwd, ["rev-parse", "HEAD"]),
    commitMessage: git(cwd, ["log", "-1", "--pretty=%s"]),
  };
}

function emit(deployId: string, event: DeploymentEvent) {
  const running = runningDeployments.get(deployId);
  if (!running) return;
  for (const subscriber of running.subscribers) void subscriber(event);
}

async function persistLog(deployId: string, raw: string) {
  const data = redact(raw);
  const running = runningDeployments.get(deployId);
  if (running) {
    running.logs.push(data);
    let total = running.logs.reduce(
      (sum, chunk) => sum + Buffer.byteLength(chunk),
      0,
    );
    while (total > env.LOG_MAX_BYTES && running.logs.length > 1) {
      total -= Buffer.byteLength(running.logs.shift() ?? "");
    }
  }
  emit(deployId, { type: "log", data });
  const write = async () => {
    try {
      await prisma.$executeRaw`
        UPDATE "Deploy"
        SET "logs" = RIGHT("logs" || ${data}, ${env.LOG_MAX_BYTES}),
            "logBytes" = "logBytes" + ${Buffer.byteLength(data)},
            "heartbeatAt" = NOW()
        WHERE "id" = ${deployId}
      `;
    } catch (error) {
      console.error(`Failed to persist logs for ${deployId}`, error);
    }
  };
  if (running) {
    running.writeChain = running.writeChain.then(write);
    await running.writeChain;
  } else {
    await write();
  }
}

async function setStage(deployId: string, stage: string) {
  await prisma.deploy.update({
    where: { id: deployId },
    data: { stage, status: stage },
  });
  emit(deployId, { type: "stage", data: stage });
}

async function verifyHealth(
  deployId: string,
  config: NonNullable<AppDefinition["healthCheck"]>,
) {
  const retries = config.retries ?? 10;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (runningDeployments.get(deployId)?.requestedStatus) return false;
    try {
      const response = await fetch(config.url, {
        signal: AbortSignal.timeout(config.timeoutMs ?? 5_000),
      });
      await persistLog(
        deployId,
        `[verify ${attempt}/${retries}] ${config.url} → ${response.status}\n`,
      );
      if (response.ok) return true;
    } catch (error) {
      await persistLog(
        deployId,
        `[verify ${attempt}/${retries}] ${error instanceof Error ? error.message : "request failed"}\n`,
      );
    }
    if (attempt < retries)
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs ?? 3_000),
      );
  }
  return false;
}

async function notifyWithRetry(
  params: Parameters<typeof sendDeployNotification>[0],
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await sendDeployNotification(params);
      return;
    } catch (error) {
      if (attempt === 3)
        console.error("Failed to send deploy notification", error);
    }
  }
}

async function finish(
  deployId: string,
  appId: string,
  status: FinalDeployStatus,
  exitCode: number | null,
) {
  const running = runningDeployments.get(deployId);
  if (!running || running.finished) return;
  running.finished = true;
  clearInterval(running.heartbeat);
  clearTimeout(running.timeout);
  const finishedAt = new Date();
  const logs = running.logs.join("");
  await running.writeChain;
  const failureSummary =
    status === "success"
      ? null
      : logs
          .split(/\r?\n/)
          .filter(Boolean)
          .slice(-3)
          .join(" · ")
          .slice(0, 500) || `Deployment ${status}`;
  const app: AppDefinition | undefined = appById.get(appId);
  const current = app ? metadata(app.deploy.cwd) : { revision: null };
  const deployRecord = await prisma.deploy
    .findUnique({
      where: { id: deployId },
      select: {
        previousRevision: true,
        app: { select: { currentRevision: true } },
      },
    })
    .catch((error) => {
      console.error("Failed to load deployment metadata", error);
      return null;
    });

  try {
    await prisma.$transaction([
      prisma.deploy.update({
        where: { id: deployId },
        data: {
          status,
          stage: status,
          exitCode,
          failureSummary,
          finishedAt,
          heartbeatAt: finishedAt,
          durationMs: Math.max(0, finishedAt.getTime() - running.startedAt),
          revision: current.revision,
        },
      }),
      prisma.app.update({
        where: { name: appId },
        data: {
          status,
          lastDeployedAt: finishedAt,
          ...(status === "success" && current.revision
            ? {
                currentRevision: current.revision,
                previousRevision:
                  deployRecord?.app.currentRevision ??
                  deployRecord?.previousRevision ??
                  null,
              }
            : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          action: `deployment.${status}`,
          appName: appId,
          deployId,
          actor: "system",
        },
      }),
    ]);
  } catch (error) {
    console.error("Failed to finalize deployment", error);
  } finally {
    emit(deployId, { type: "exit", status });
    running.resolveCompletion(status);
    runningDeployments.delete(deployId);
  }
  const notifyForStatus = app?.notifications?.on ?? ["success", "failed"];
  if (
    app &&
    app.notifications?.enabled !== false &&
    notifyForStatus.includes(status)
  ) {
    void notifyWithRetry({ appLabel: app.label, status, deployId, logs });
  }
}

export const deploymentEngine = {
  async start({
    appId,
    action = "deploy",
    actor = "pin-user",
    requesterIp = null,
  }: StartRequest) {
    const appConfig: AppDefinition | undefined = appById.get(appId);
    if (!appConfig) throw new Error("App not found");
    const command: CommandDefinition | undefined =
      action === "rollback" ? appConfig.rollback : appConfig.deploy;
    if (!command) throw new Error("Rollback is not configured for this app");
    const commandPath = resolvePath(command.command);
    const cwd = command.cwd ? resolvePath(command.cwd) : undefined;
    await access(commandPath, constants.X_OK);
    if (cwd) await access(cwd, constants.R_OK | constants.X_OK);
    if (cwd && appConfig.minFreeDiskMb) {
      const disk = await statfs(cwd);
      const freeBytes = Number(disk.bavail) * Number(disk.bsize);
      if (freeBytes < appConfig.minFreeDiskMb * 1024 * 1024) {
        throw new Error(
          `Preflight failed: less than ${appConfig.minFreeDiskMb} MB disk space is available`,
        );
      }
    }

    const app = await prisma.app.upsert({
      where: { name: appId },
      update: {},
      create: { name: appId },
    });
    if (action === "rollback" && !app.previousRevision) {
      throw new Error(
        "No previous successful revision is available to roll back to",
      );
    }
    const before = metadata(cwd);
    const deploy = await prisma.deploy.create({
      data: {
        appId: app.id,
        status: "queued",
        stage: "queued",
        action,
        environment: appConfig.environment,
        previousRevision: app.currentRevision ?? before.revision,
        ...before,
        requestedBy: actor,
        requesterIp,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          action: `deployment.${action}.requested`,
          appName: appId,
          deployId: deploy.id,
          actor,
          requesterIp,
        },
      })
      .catch((error) =>
        console.error("Failed to persist deployment audit event", error),
      );

    const child = spawn(commandPath, command.args ?? [], {
      cwd,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        SHIPYARD_DEPLOY_ID: deploy.id,
        SHIPYARD_ACTION: action,
        SHIPYARD_TARGET_REVISION:
          action === "rollback" ? (app.previousRevision ?? "") : "",
      },
    });
    let resolveCompletion!: (status: FinalDeployStatus) => void;
    const completion = new Promise<FinalDeployStatus>((resolve) => {
      resolveCompletion = resolve;
    });
    const startedAt = Date.now();
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const timeoutMs = (appConfig.deploy.timeoutSeconds ?? 600) * 1_000;
    const running: RunningDeployment = {
      appId,
      process: child,
      logs: [],
      subscribers: new Set(),
      completion,
      resolveCompletion,
      startedAt,
      heartbeat: setInterval(() => {
        void prisma.deploy
          .update({
            where: { id: deploy.id },
            data: { heartbeatAt: new Date() },
          })
          .catch((error) =>
            console.error("Failed to persist heartbeat", error),
          );
      }, 15_000),
      timeout: setTimeout(() => {
        void deploymentEngine.cancel(deploy.id, "timed_out");
      }, timeoutMs),
      finished: false,
      writeChain: Promise.resolve(),
    };
    runningDeployments.set(deploy.id, running);
    child.stdout.on("data", (chunk: Buffer) => {
      void persistLog(deploy.id, chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer) => {
      void persistLog(deploy.id, chunk.toString());
    });
    child.on("error", (error) => {
      void persistLog(deploy.id, `Failed to start: ${error.message}\n`);
    });
    child.on("close", async (code) => {
      await initialization;
      const current = runningDeployments.get(deploy.id);
      if (!current || current.finished) return;
      if (current.requestedStatus)
        return finish(deploy.id, appId, current.requestedStatus, code);
      if (code !== 0) return finish(deploy.id, appId, "failed", code);
      if (appConfig.healthCheck) {
        try {
          await setStage(deploy.id, "verifying");
        } catch (error) {
          await persistLog(
            deploy.id,
            `[shipyard] Failed to enter verification stage: ${error instanceof Error ? error.message : "database error"}\n`,
          );
          return finish(deploy.id, appId, "failed", code);
        }
        const healthy = await verifyHealth(deploy.id, appConfig.healthCheck);
        return finish(deploy.id, appId, healthy ? "success" : "failed", code);
      }
      return finish(deploy.id, appId, "success", code);
    });
    try {
      await prisma.$transaction([
        prisma.deploy.update({
          where: { id: deploy.id },
          data: {
            status: "running",
            stage: "running",
            startedAt: new Date(startedAt),
            heartbeatAt: new Date(),
          },
        }),
        prisma.app.update({
          where: { id: app.id },
          data: { status: "running" },
        }),
      ]);
      resolveInitialization();
    } catch (error) {
      clearInterval(running.heartbeat);
      clearTimeout(running.timeout);
      runningDeployments.delete(deploy.id);
      resolveInitialization();
      child.kill("SIGTERM");
      await prisma.deploy
        .update({
          where: { id: deploy.id },
          data: {
            status: "failed",
            stage: "failed",
            finishedAt: new Date(),
            failureSummary: "Failed to persist running deployment state",
          },
        })
        .catch(() => undefined);
      throw error;
    }
    void persistLog(
      deploy.id,
      `[shipyard] ${action} started (${before.branch ?? "unknown branch"} ${before.revision?.slice(0, 8) ?? "unknown revision"})\n`,
    );
    return { deployId: deploy.id };
  },

  async cancel(
    deployId: string,
    status: "cancelled" | "timed_out" = "cancelled",
  ) {
    const running = runningDeployments.get(deployId);
    if (!running || running.finished) return false;
    running.requestedStatus = status;
    await prisma.deploy
      .update({ where: { id: deployId }, data: { cancelledAt: new Date() } })
      .catch((error) => console.error("Failed to persist cancellation", error));
    await prisma.auditLog
      .create({
        data: {
          action: `deployment.${status}.requested`,
          appName: running.appId,
          deployId,
          actor: "pin-user",
        },
      })
      .catch((error) =>
        console.error("Failed to persist cancellation audit", error),
      );
    await persistLog(
      deployId,
      `[shipyard] Deployment ${status}; stopping process…\n`,
    );
    if (running.process.pid) {
      try {
        process.kill(
          process.platform === "win32"
            ? running.process.pid
            : -running.process.pid,
          "SIGTERM",
        );
      } catch {
        running.process.kill("SIGTERM");
      }
      setTimeout(() => {
        if (!running.finished && running.process.pid) {
          try {
            process.kill(
              process.platform === "win32"
                ? running.process.pid
                : -running.process.pid,
              "SIGKILL",
            );
          } catch {
            running.process.kill("SIGKILL");
          }
        }
      }, 5_000).unref();
    }
    if (running.process.exitCode !== null) {
      void finish(deployId, running.appId, status, running.process.exitCode);
    }
    return true;
  },

  getRunning(deployId: string) {
    return runningDeployments.get(deployId);
  },

  subscribe(deployId: string, subscriber: Subscriber) {
    const running = runningDeployments.get(deployId);
    if (!running) return undefined;
    running.subscribers.add(subscriber);
    for (const log of running.logs) void subscriber({ type: "log", data: log });
    return () => running.subscribers.delete(subscriber);
  },

  async recover() {
    const interrupted = await prisma.deploy.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      select: { id: true, appId: true },
    });
    if (!interrupted.length) return 0;
    const now = new Date();
    await prisma.$transaction([
      prisma.deploy.updateMany({
        where: { id: { in: interrupted.map((item) => item.id) } },
        data: {
          status: "interrupted",
          stage: "interrupted",
          finishedAt: now,
          failureSummary: "Shipyard restarted while this deployment was active",
        },
      }),
      prisma.app.updateMany({
        where: {
          id: { in: [...new Set(interrupted.map((item) => item.appId))] },
        },
        data: { status: "interrupted" },
      }),
    ]);
    return interrupted.length;
  },
};
