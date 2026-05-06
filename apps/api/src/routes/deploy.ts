import { Hono } from "hono";
import { appById } from "../apps.config.js";
import { prisma } from "../lib/prisma.js";
import { startDeploy } from "../lib/runner.js";
import type { DeployHistoryItem } from "../types/index.js";

const route = new Hono();

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

  const deploys = await prisma.deploy.findMany({
    where: { appId: app.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      appId: true,
      status: true,
      createdAt: true,
    },
  });

  return c.json<DeployHistoryItem[]>(
    deploys.map((deploy) => ({
      ...deploy,
      status: deploy.status as DeployHistoryItem["status"],
    })),
  );
});

route.post("/:appId", async (c) => {
  const appId = c.req.param("appId");
  const appConfig = appById.get(appId);

  if (!appConfig) {
    return c.json({ error: "App not found" }, 404);
  }

  const app = await prisma.app.upsert({
    where: { name: appId },
    update: {},
    create: { name: appId },
  });

  const runningDeploy = await prisma.deploy.findFirst({
    where: {
      appId: app.id,
      status: "running",
    },
    select: { id: true },
  });

  if (runningDeploy) {
    return c.json(
      { error: "Deploy already running", deployId: runningDeploy.id },
      409,
    );
  }

  const deploy = await prisma.deploy.create({
    data: {
      appId: app.id,
      status: "running",
    },
  });

  await prisma.app.update({
    where: { id: app.id },
    data: { status: "running" },
  });

  startDeploy({
    appId,
    deployId: deploy.id,
    scriptPath: appConfig.scriptPath,
  });

  return c.json({ deployId: deploy.id }, 202);
});

export default route;
