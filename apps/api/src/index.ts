import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { env } from "./env.js";
import routes from "./routes/index.js";
import { cors } from "hono/cors";

const app = new Hono();

app.use(cors());
app.use("*", logger());
app.use("*", prettyJSON());

app.get("/", (c) => c.json({ name: "shipyard-api", status: "ok" }));
app.route("/", routes);

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
