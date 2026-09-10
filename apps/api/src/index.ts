import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { env } from "./env.js";
import routes from "./routes/index.js";
import { cors } from "hono/cors";
import { deploymentEngine } from "./lib/deployment-engine.js";

const app = new Hono();
const allowedWebOrigins = [
  env.WEB_ORIGIN,
  ...(env.WEB_ORIGINS ?? "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin) => (allowedWebOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);
app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.json({ name: "shipyard-api", status: "ok" }));
app.route("/", routes);

const recovered = await deploymentEngine.recover();
if (recovered)
  console.warn(`Marked ${recovered} interrupted deployment(s) after restart`);

serve(
  {
    fetch: app.fetch,
    hostname: env.HOST,
    port: env.PORT,
  },
  (info) => {
    console.log(`Shipyard API listening on http://${env.HOST}:${info.port}`);
  },
);
