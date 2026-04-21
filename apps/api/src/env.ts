import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHIPYARD_PIN: z.string().min(1, "SHIPYARD_PIN is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  NOTIFICATION_EMAIL: z.string().email("NOTIFICATION_EMAIL must be a valid email"),
  HOST: z.string().min(1).default("localhost"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});

export const env = envSchema.parse(process.env);
