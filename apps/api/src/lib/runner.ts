import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { appById } from "../apps.config.js";
import { prisma } from "./prisma.js";
import { sendDeployNotification } from "./resend.js";
import type { FinalDeployStatus } from "../types/index.js";

type RunnerEvent =
  | { type: "log"; data: string }
  | { type: "exit"; status: FinalDeployStatus };

type Subscriber = (event: RunnerEvent) => void | Promise<void>;

type RunningDeploy = {
  process: ChildProcessWithoutNullStreams;
  logs: string[];
  subscribers: Set<Subscriber>;
  completion: Promise<FinalDeployStatus>;
};

const runningDeploys = new Map<string, RunningDeploy>();

function emit(deployId: string, event: RunnerEvent) {
  const runningDeploy = runningDeploys.get(deployId);
  if (!runningDeploy) return;

  for (const subscriber of runningDeploy.subscribers) {
    void subscriber(event);
  }
}

function appendLog(deployId: string, chunk: Buffer) {
  const data = chunk.toString();
  const runningDeploy = runningDeploys.get(deployId);
  if (!runningDeploy) return;

  runningDeploy.logs.push(data);
  emit(deployId, { type: "log", data });
}

export function startDeploy(params: {
  appId: string;
  deployId: string;
  scriptPath: string;
}) {
  const child = spawn(params.scriptPath, [], {
    shell: false,
    windowsHide: true,
  });

  let resolveCompletion!: (status: FinalDeployStatus) => void;
  const completion = new Promise<FinalDeployStatus>((resolve) => {
    resolveCompletion = resolve;
  });

  runningDeploys.set(params.deployId, {
    process: child,
    logs: [],
    subscribers: new Set(),
    completion,
  });

  child.stdout.on("data", (chunk: Buffer) => appendLog(params.deployId, chunk));
  child.stderr.on("data", (chunk: Buffer) => appendLog(params.deployId, chunk));

  child.on("error", (error) => {
    appendLog(params.deployId, Buffer.from(`Failed to start deploy script: ${error.message}\n`));
  });

  child.on("close", async (code) => {
    const status = code === 0 ? "success" : "failed";
    const runningDeploy = runningDeploys.get(params.deployId);
    const logs = runningDeploy?.logs.join("") ?? "";
    const app = appById.get(params.appId);

    try {
      await prisma.deploy.update({
        where: { id: params.deployId },
        data: { status, logs },
      });

      await prisma.app.update({
        where: { name: params.appId },
        data: {
          status,
          lastDeployedAt: new Date(),
        },
      });

      if (app) {
        await sendDeployNotification({
          appLabel: app.label,
          status,
          deployId: params.deployId,
          logs,
        });
      }
    } catch (error) {
      console.error("Failed to finalize deploy", error);
    } finally {
      emit(params.deployId, { type: "exit", status });
      resolveCompletion(status);
      runningDeploys.delete(params.deployId);
    }
  });
}

export function getRunningDeploy(deployId: string) {
  return runningDeploys.get(deployId);
}

export function subscribeToDeploy(deployId: string, subscriber: Subscriber) {
  const runningDeploy = runningDeploys.get(deployId);
  if (!runningDeploy) return undefined;

  runningDeploy.subscribers.add(subscriber);

  for (const log of runningDeploy.logs) {
    void subscriber({ type: "log", data: log });
  }

  return () => {
    runningDeploy.subscribers.delete(subscriber);
  };
}
