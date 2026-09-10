import type { AppDefinition } from "./types/index.js";

export const apps = [
  {
    id: "example-web",
    label: "Example Web",
    environment: "production",
    minFreeDiskMb: 100,
    deploy: {
      command: "/home/deploy/scripts/deploy-example-web.sh",
      cwd: "/var/www/example-web",
      timeoutSeconds: 600,
    },
    rollback: {
      command: "/home/deploy/scripts/rollback-example-web.sh",
      cwd: "/var/www/example-web",
    },
    healthCheck: {
      url: "https://example.com/health",
      retries: 10,
      intervalMs: 3_000,
      timeoutMs: 5_000,
    },
    notifications: { on: ["success", "failed", "timed_out", "interrupted"] },
  },
] satisfies AppDefinition[];

export const appById = new Map(apps.map((app) => [app.id, app]));
