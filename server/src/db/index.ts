import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import * as schema from "./schema.js";

const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema, logger: false });

export async function checkDbConnection(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, "Database connection check failed");
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await queryClient.end();
}
