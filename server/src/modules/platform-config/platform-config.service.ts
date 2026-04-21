import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { platformConfig, auditLogs } from "../../db/schema.js";
import { logger } from "../../config/logger.js";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";
const LOG_LEVEL_KEY = "log_level";

export async function getLogLevel(): Promise<string> {
  const [row] = await db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, LOG_LEVEL_KEY))
    .limit(1);
  return row?.value ?? logger.level;
}

export async function setLogLevel(
  newLevel: LogLevel,
  actorId: string,
): Promise<{ previous: string; current: string; changedAt: string }> {
  const previous = await getLogLevel();

  // Upsert into platform_config
  const [existing] = await db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, LOG_LEVEL_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(platformConfig)
      .set({ value: newLevel, updatedBy: actorId })
      .where(eq(platformConfig.key, LOG_LEVEL_KEY));
  } else {
    await db.insert(platformConfig).values({
      key: LOG_LEVEL_KEY,
      value: newLevel,
      updatedBy: actorId,
    });
  }

  // Apply to live logger instance
  logger.level = newLevel;

  const changedAt = new Date().toISOString();

  // Write audit event
  await db.insert(auditLogs).values({
    actorId,
    action: "log_level_changed",
    resourceType: "platform_config",
    resourceId: LOG_LEVEL_KEY,
    before: { level: previous },
    after: { level: newLevel },
    metadata: { changedAt },
  });

  return { previous, current: newLevel, changedAt };
}

export async function applyPersistedLogLevel(): Promise<void> {
  try {
    const [row] = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, LOG_LEVEL_KEY))
      .limit(1);
    if (row) {
      logger.level = row.value as LogLevel;
      logger.info({ level: row.value }, "Applied persisted log level from platform_config");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to read log level from platform_config at startup");
  }
}
