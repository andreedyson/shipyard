import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";

const route = new Hono();

route.get("/", async (c) => {
  const appName = c.req.query("app");
  const cursor = c.req.query("cursor");
  const entries = await prisma.auditLog.findMany({
    where: appName ? { appName } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return c.json(entries);
});

export default route;
