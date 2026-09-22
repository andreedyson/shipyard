import { Hono, type Context } from "hono";
import { appById, apps } from "../apps.config.js";
import { getClientIp } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { ScriptStoreError, scriptStore } from "../lib/script-store.js";
import type {
  AppResponse,
  AppStatus,
  DeployHistoryItem,
  ScriptKind,
} from "../types/index.js";

const route = new Hono();

route.get("/", async (c) => {
  const appIds = apps.map((app) => app.id);
  const appRecords = await prisma.app.findMany({
    where: {
      name: { in: appIds },
    },
    include: {
      deploys: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          appId: true,
          status: true,
          stage: true,
          action: true,
          environment: true,
          branch: true,
          revision: true,
          previousRevision: true,
          commitMessage: true,
          requestedBy: true,
          exitCode: true,
          failureSummary: true,
          startedAt: true,
          finishedAt: true,
          heartbeatAt: true,
          durationMs: true,
          createdAt: true,
        },
        take: 1,
      },
    },
  });
  const appRecordByName = new Map(appRecords.map((app) => [app.name, app]));

  const response: AppResponse[] = apps.map((app) => {
    const appRecord = appRecordByName.get(app.id);

    return {
      id: app.id,
      label: app.label,
      environment: app.environment,
      status: (appRecord?.status ?? "idle") as AppStatus,
      lastDeployedAt: appRecord?.lastDeployedAt ?? null,
      currentRevision: appRecord?.currentRevision ?? null,
      latestDeploy: appRecord?.deploys[0]
        ? {
            ...appRecord.deploys[0],
            status: appRecord.deploys[0].status as DeployHistoryItem["status"],
            stage: appRecord.deploys[0].stage as DeployHistoryItem["stage"],
            action: appRecord.deploys[0].action as "deploy" | "rollback",
          }
        : null,
      canRollback: Boolean(app.rollback && appRecord?.previousRevision),
      healthCheckConfigured: Boolean(app.healthCheck),
      editableScripts: scriptStore.editableKinds(app),
    };
  });

  return c.json(response);
});

function scriptKind(value: string): ScriptKind | null {
  return value === "deploy" || value === "rollback" ? value : null;
}

function scriptError(c: Context, error: unknown) {
  if (error instanceof ScriptStoreError) {
    return c.json({ error: error.message }, error.status);
  }
  console.error("Script editor failed", error);
  return c.json({ error: "Unable to access the script" }, 500);
}

route.get("/:appId/scripts/:kind", async (c) => {
  const app = appById.get(c.req.param("appId"));
  if (!app) return c.json({ error: "App not found" }, 404);
  const kind = scriptKind(c.req.param("kind"));
  if (!kind)
    return c.json({ error: "Script kind must be deploy or rollback" }, 400);
  try {
    return c.json(await scriptStore.read(app, kind));
  } catch (error) {
    return scriptError(c, error);
  }
});

route.put("/:appId/scripts/:kind", async (c) => {
  const appId = c.req.param("appId");
  const app = appById.get(appId);
  if (!app) return c.json({ error: "App not found" }, 404);
  const kind = scriptKind(c.req.param("kind"));
  if (!kind)
    return c.json({ error: "Script kind must be deploy or rollback" }, 400);
  const body = await c.req
    .json<{ content?: unknown; expectedVersion?: unknown }>()
    .catch(() => null);
  if (
    !body ||
    typeof body.content !== "string" ||
    typeof body.expectedVersion !== "string"
  ) {
    return c.json({ error: "content and expectedVersion are required" }, 400);
  }
  try {
    const saved = await scriptStore.save(
      app,
      kind,
      body.content,
      body.expectedVersion,
    );
    void prisma.auditLog
      .create({
        data: {
          action: `script.${kind}.updated`,
          appName: appId,
          actor: "pin-user",
          requesterIp: getClientIp(c),
          metadata: {
            previousVersion: saved.previousVersion,
            version: saved.version,
            backup: saved.backup,
          },
        },
      })
      .catch((error) =>
        console.error("Failed to persist script audit event", error),
      );
    const {
      previousVersion: _previousVersion,
      backup: _backup,
      ...response
    } = saved;
    return c.json(response);
  } catch (error) {
    return scriptError(c, error);
  }
});

export default route;
