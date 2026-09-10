import { Hono } from "hono";
import { appById } from "../apps.config.js";
import { prisma } from "../lib/prisma.js";
import { deploymentEngine } from "../lib/deployment-engine.js";
import { getClientIp } from "../middleware/auth.js";
import type { DeployHistoryItem } from "../types/index.js";

const route = new Hono();

function isActiveDeploymentConflict(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return (
    candidate?.code === "P2002" ||
    candidate?.code === "23505" ||
    candidate?.message?.includes("Deploy_one_active_per_app_key") === true
  );
}

route.get("/:appId/history", async (c) => {
  const appId = c.req.param("appId");
  const appConfig = appById.get(appId);

  if (!appConfig) {
    return c.json({ error: "App not found" }, 404);
  }

  const app = await prisma.app.findUnique({
    where: { name: appId },
    select: { id: true },
  });

  if (!app) {
    return c.json<DeployHistoryItem[]>([]);
  }

  const status = c.req.query("status");
  const query = c.req.query("q")?.trim();
  const cursor = c.req.query("cursor");
  const deploys = await prisma.deploy.findMany({
    where: {
      appId: app.id,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { revision: { contains: query, mode: "insensitive" } },
              { branch: { contains: query, mode: "insensitive" } },
              { commitMessage: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      appId: true,
      status: true,
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
      durationMs: true,
      createdAt: true,
    },
  });

  return c.json<DeployHistoryItem[]>(
    deploys.map((deploy) => ({
      ...deploy,
      status: deploy.status as DeployHistoryItem["status"],
      action: deploy.action as DeployHistoryItem["action"],
    })),
  );
});

route.post("/:appId", async (c) => {
  const appId = c.req.param("appId");
  const appConfig = appById.get(appId);

  if (!appConfig) {
    return c.json({ error: "App not found" }, 404);
  }

  try {
    const result = await deploymentEngine.start({
      appId,
      requesterIp: getClientIp(c),
    });
    return c.json(result, 202);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Deploy request failed";
    const conflict = isActiveDeploymentConflict(error);
    return c.json(
      {
        error: conflict
          ? "A deployment is already active for this app"
          : message,
      },
      conflict ? 409 : 400,
    );
  }
});

route.post("/:appId/rollback", async (c) => {
  const appId = c.req.param("appId");
  if (!appById.has(appId)) return c.json({ error: "App not found" }, 404);
  try {
    const result = await deploymentEngine.start({
      appId,
      action: "rollback",
      requesterIp: getClientIp(c),
    });
    return c.json(result, 202);
  } catch (error) {
    const conflict = isActiveDeploymentConflict(error);
    return c.json(
      {
        error: conflict
          ? "A deployment is already active for this app"
          : error instanceof Error
            ? error.message
            : "Rollback request failed",
      },
      conflict ? 409 : 400,
    );
  }
});

route.post("/id/:deployId/cancel", async (c) => {
  const cancelled = await deploymentEngine.cancel(c.req.param("deployId"));
  if (!cancelled)
    return c.json(
      { error: "Deployment is not running on this Shipyard instance" },
      409,
    );
  return c.json({ ok: true }, 202);
});

export default route;
