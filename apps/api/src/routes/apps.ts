import { Hono } from "hono";
import { apps } from "../apps.config.js";
import { prisma } from "../lib/prisma.js";
import type { AppResponse, AppStatus } from "../types/index.js";

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
        select: { id: true },
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
      status: (appRecord?.status ?? "idle") as AppStatus,
      lastDeployedAt: appRecord?.lastDeployedAt ?? null,
      latestDeployId: appRecord?.deploys[0]?.id ?? null,
    };
  });

  return c.json(response);
});

export default route;
