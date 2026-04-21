import type { AppDefinition } from "./types/index.js";

export const apps = [
  {
    id: "example-web",
    label: "Example Web",
    scriptPath: "/home/deploy/scripts/deploy-example-web.sh",
  },
] satisfies AppDefinition[];

export const appById = new Map(apps.map((app) => [app.id, app]));
