import { Hono } from "hono";
import {
  auth,
  clearSession,
  createSession,
  hasValidSession,
  isValidPin,
} from "../middleware/auth.js";
import appsRoutes from "./apps.js";
import deployRoutes from "./deploy.js";
import logsRoutes from "./logs.js";
import auditRoutes from "./audit.js";
import { prisma } from "../lib/prisma.js";

const routes = new Hono();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

routes.post("/auth/login", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 10) {
    return c.json({ error: "Too many login attempts. Try again later." }, 429);
  }
  const body: { pin?: unknown } = await c.req
    .json<{ pin?: unknown }>()
    .catch(() => ({}));

  if (typeof body.pin !== "string" || !isValidPin(body.pin)) {
    loginAttempts.set(ip, {
      count: attempt && attempt.resetAt > now ? attempt.count + 1 : 1,
      resetAt: now + 15 * 60_000,
    });
    return c.json({ error: "Invalid PIN" }, 401);
  }

  loginAttempts.delete(ip);
  createSession(c);
  void prisma.auditLog
    .create({
      data: { action: "auth.login", actor: "pin-user", requesterIp: ip },
    })
    .catch((error) =>
      console.error("Failed to persist login audit event", error),
    );
  return c.json({ ok: true });
});

routes.get("/auth/session", (c) =>
  c.json({ authenticated: hasValidSession(c) }),
);
routes.post("/auth/logout", (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

routes.use("/*", auth());
routes.route("/apps", appsRoutes);
routes.route("/deploy", deployRoutes);
routes.route("/logs", logsRoutes);
routes.route("/audit", auditRoutes);

export default routes;
