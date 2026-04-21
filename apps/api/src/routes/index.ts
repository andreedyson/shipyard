import { Hono } from "hono";
import { auth, isValidPin } from "../middleware/auth.js";
import appsRoutes from "./apps.js";
import deployRoutes from "./deploy.js";
import logsRoutes from "./logs.js";

const routes = new Hono();

routes.post("/auth/login", async (c) => {
  const body: { pin?: unknown } = await c.req
    .json<{ pin?: unknown }>()
    .catch(() => ({}));

  if (typeof body.pin !== "string" || !isValidPin(body.pin)) {
    return c.json({ error: "Invalid PIN" }, 401);
  }

  return c.json({ ok: true });
});

routes.use("/*", auth());
routes.route("/apps", appsRoutes);
routes.route("/deploy", deployRoutes);
routes.route("/logs", logsRoutes);

export default routes;
