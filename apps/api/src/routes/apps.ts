import { Hono } from "hono";
import { apps } from "../apps.config.js";
import { prisma } from "../lib/prisma.js";
import type {
  AppResponse,
  AppStatus,
  DeployHistoryItem,
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
    };
  });

  return c.json(response);
});

export default route;
