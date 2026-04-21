import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { prisma } from "../lib/prisma.js";
import { getRunningDeploy, subscribeToDeploy } from "../lib/runner.js";

const route = new Hono();

route.get("/:deployId", async (c) => {
  const deployId = c.req.param("deployId");
  const deploy = await prisma.deploy.findUnique({
    where: { id: deployId },
    select: { id: true, logs: true, status: true },
  });

  if (!deploy) {
    return c.json({ error: "Deploy not found" }, 404);
  }

  return streamSSE(c, async (stream) => {
    const runningDeploy = getRunningDeploy(deployId);

    if (!runningDeploy) {
      if (deploy.logs) {
        await stream.writeSSE({ event: "log", data: deploy.logs });
      }
      await stream.writeSSE({ event: "exit", data: deploy.status });
      return;
    }

    const unsubscribe = subscribeToDeploy(deployId, async (event) => {
      await stream.writeSSE({ event: event.type, data: event.type === "log" ? event.data : event.status });
    });

    await runningDeploy.completion;
    unsubscribe?.();
  });
});

export default route;
