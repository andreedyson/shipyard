import type { AppDefinition } from "./types/index.js";

export const apps = [
  {
    id: "lms-frontend",
    label: "LMS Frontend",
    scriptPath: "/home/user/scripts/deploy-lms-frontend.sh",
  },
] satisfies AppDefinition[];

export const appById = new Map(apps.map((app) => [app.id, app]));
