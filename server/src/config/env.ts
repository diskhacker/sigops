import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4200),
  DATABASE_URL: z.string().default("postgres://localhost:5432/sigops"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32).default("test-secret-key-at-least-32-characters-long-abc"),
  JWT_ISSUER: z.string().default("uap"),
  JWT_AUDIENCE: z.string().default("uap"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  FRONTEND_URL: z.string().default("http://localhost:4201"),
  UAP_URL: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const env = loadEnv();
