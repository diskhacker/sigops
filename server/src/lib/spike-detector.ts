import { and, eq, gte, sql } from "drizzle-orm";
import { db as defaultDb } from "../db/index.js";
import { usageBaselines, signals, notifications } from "../db/schema.js";
import { logger } from "../config/logger.js";

export type SpikeDb = typeof defaultDb;

async function countSignalsInWindow(
  db: SpikeDb,
  tenantId: string,
  windowMinutes: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signals)
    .where(and(eq(signals.tenantId, tenantId), gte(signals.createdAt, since)));
  return count;
}

async function createSpikeSignal(
  db: SpikeDb,
  tenantId: string,
  currentCount: number,
  baseline: number,
  multiplier: number,
): Promise<void> {
  await db.insert(signals).values({
    tenantId,
    source: "spike_detector",
    severity: "critical",
    title: `Signal volume spike: ${currentCount} signals (${multiplier.toFixed(1)}× baseline)`,
    body: { current_count: currentCount, baseline, multiplier },
    fingerprint: `spike_${tenantId}_${Date.now()}`,
    metadata: { auto_generated: true, detector: "spike_detector" },
  });
}

async function createInAppNotification(
  db: SpikeDb,
  tenantId: string,
  currentCount: number,
  baseline: number,
): Promise<void> {
  await db.insert(notifications).values({
    tenantId,
    scope: "tenant_admin",
    type: "spike_detected",
    title: "Usage spike detected",
    body: `Signal volume: ${currentCount} in window (baseline: ${baseline}). Please investigate.`,
    metadata: { current_count: currentCount, baseline },
  });
}

export async function runSpikeDetection(db: SpikeDb = defaultDb): Promise<void> {
  const baselines = await db.select().from(usageBaselines);

  for (const baseline of baselines) {
    const baselineValue = parseFloat(baseline.baselineValue);
    const threshold = parseFloat(baseline.spikeThreshold);

    const currentCount = await countSignalsInWindow(
      db,
      baseline.tenantId,
      baseline.windowMinutes,
    );

    const multiplier = baselineValue > 0 ? currentCount / baselineValue : 0;

    if (multiplier >= threshold) {
      logger.warn(
        { tenantId: baseline.tenantId, currentCount, baselineValue, multiplier },
        "Signal spike detected",
      );

      await createSpikeSignal(db, baseline.tenantId, currentCount, baselineValue, multiplier);
      await createInAppNotification(db, baseline.tenantId, currentCount, baselineValue);
    }
  }
}

export async function computeBaseline(
  db: SpikeDb,
  tenantId: string,
  metric: string,
  windowMinutes: number,
): Promise<number> {
  // Rolling average: count signals in last 30 days, divide by number of windows
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signals)
    .where(and(eq(signals.tenantId, tenantId), gte(signals.createdAt, thirtyDaysAgo)));

  const numWindows = (30 * 24 * 60) / windowMinutes;
  const avg = numWindows > 0 ? count / numWindows : 0;

  // Upsert baseline
  const [existing] = await db
    .select()
    .from(usageBaselines)
    .where(and(eq(usageBaselines.tenantId, tenantId), eq(usageBaselines.metric, metric)))
    .limit(1);

  if (existing) {
    await db
      .update(usageBaselines)
      .set({ baselineValue: String(avg), lastComputed: new Date() })
      .where(eq(usageBaselines.id, existing.id));
  } else {
    await db.insert(usageBaselines).values({
      tenantId,
      metric,
      baselineValue: String(avg),
      windowMinutes,
      lastComputed: new Date(),
    });
  }

  return avg;
}
