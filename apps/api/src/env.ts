import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHIPYARD_PIN: z.string().min(1, "SHIPYARD_PIN is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM: z.string().min(1).default("Shipyard <onboarding@resend.dev>"),
  NOTIFICATION_EMAIL: z
    .string()
    .email("NOTIFICATION_EMAIL must be a valid email"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  LOG_MAX_BYTES: z.coerce.number().int().min(1024).default(2_000_000),
  APPS_CONFIG_PATH: z.string().min(1).optional(),
  HOST: z.string().min(1).default("localhost"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});

export const env = envSchema.parse(process.env);
