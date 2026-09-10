import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import type { AppDefinition, FinalDeployStatus } from "./types/index.js";
import { env } from "./env.js";

const finalStatuses: [FinalDeployStatus, ...FinalDeployStatus[]] = [
  "success",
  "failed",
  "cancelled",
  "timed_out",
  "interrupted",
];

const appDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  environment: z.enum(["production", "staging", "preview", "development"]),
  minFreeDiskMb: z.number().int().positive().optional(),
  deploy: z.object({
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    cwd: z.string().min(1).optional(),
    timeoutSeconds: z.number().int().positive().optional(),
  }),
  rollback: z
    .object({
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      cwd: z.string().min(1).optional(),
    })
    .optional(),
  healthCheck: z
    .object({
      url: z.string().url(),
      retries: z.number().int().positive().optional(),
      intervalMs: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
  notifications: z
    .object({
      enabled: z.boolean().optional(),
      on: z.array(z.enum(finalStatuses)).optional(),
    })
    .optional(),
});

const defaultApps = [
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

function localConfigPath() {
  if (env.APPS_CONFIG_PATH) {
    return path.isAbsolute(env.APPS_CONFIG_PATH)
      ? env.APPS_CONFIG_PATH
      : path.resolve(process.cwd(), env.APPS_CONFIG_PATH);
  }
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../apps.config.local.json",
  );
}

function loadApps(): AppDefinition[] {
  const configPath = localConfigPath();
  if (!existsSync(configPath)) return defaultApps;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read apps config at ${configPath}: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
  const parsed = z.array(appDefinitionSchema).safeParse(raw);
  if (!parsed.success)
    throw new Error(
      `Invalid apps config at ${configPath}: ${parsed.error.message}`,
    );
  const ids = new Set<string>();
  for (const app of parsed.data) {
    if (ids.has(app.id))
      throw new Error(`Invalid apps config: duplicate app id ${app.id}`);
    ids.add(app.id);
  }
  return parsed.data;
}

export const apps = loadApps();
export const appById = new Map(apps.map((app) => [app.id, app]));
