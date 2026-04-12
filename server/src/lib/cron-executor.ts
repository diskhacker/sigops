/**
 * Minimal cron executor for workflowSchedules.
 * Polls active schedules, computes next fire time from cron,
 * and enqueues executions when due.
 *
 * Supports standard 5-field cron (minute hour day month dow)
 * with `*`, `*\/N`, lists `1,3,5`, and ranges `1-5`.
 */
import { eq, and } from "drizzle-orm";
import { db as defaultDb } from "../db/index.js";
import { workflowSchedules } from "../db/schema.js";

export interface CronField {
  matches(value: number): boolean;
}

function parseField(expr: string, min: number, max: number): CronField {
  const values = new Set<number>();
  for (const part of expr.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let base = part;
    let step = 1;
    if (stepMatch) {
      base = stepMatch[1];
      step = parseInt(stepMatch[2], 10);
    }
    let lo = min;
    let hi = max;
    if (base === "*") {
      // default lo/hi
    } else {
      const rangeMatch = base.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        lo = parseInt(rangeMatch[1], 10);
        hi = parseInt(rangeMatch[2], 10);
      } else {
        const n = parseInt(base, 10);
        if (Number.isNaN(n)) throw new Error(`invalid cron field: ${expr}`);
        lo = n;
        hi = n;
      }
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return { matches: (v) => values.has(v) };
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  day: CronField;
  month: CronField;
  dow: CronField;
}

export function parseCron(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`cron must have 5 fields: ${expr}`);
  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    day: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dow: parseField(parts[4], 0, 6),
  };
}

export function cronMatches(cron: ParsedCron, date: Date): boolean {
  return (
    cron.minute.matches(date.getUTCMinutes()) &&
    cron.hour.matches(date.getUTCHours()) &&
    cron.day.matches(date.getUTCDate()) &&
    cron.month.matches(date.getUTCMonth() + 1) &&
    cron.dow.matches(date.getUTCDay())
  );
}

export interface CronDb {
  select: typeof defaultDb.select;
  update: typeof defaultDb.update;
}

export interface TickResult {
  triggered: Array<{ id: string; workflowId: string; tenantId: string }>;
}

/**
 * Run one tick: inspects active schedules, triggers any whose cron
 * matches the current minute and has not already run in this minute,
 * and records lastRunAt.
 */
export async function runCronTick(
  now: Date = new Date(),
  executeWorkflow: (
    tenantId: string,
    workflowId: string,
    scheduleId: string,
  ) => Promise<void> = async () => {},
  database: CronDb = defaultDb,
): Promise<TickResult> {
  const active = await database
    .select()
    .from(workflowSchedules)
    .where(eq(workflowSchedules.isActive, true));

  const triggered: TickResult["triggered"] = [];
  const minuteStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0,
    ),
  );

  for (const s of active) {
    let parsed: ParsedCron;
    try {
      parsed = parseCron(s.cron);
    } catch {
      continue;
    }
    if (!cronMatches(parsed, now)) continue;
    if (s.lastRunAt && s.lastRunAt.getTime() >= minuteStart.getTime()) continue;

    await executeWorkflow(s.tenantId, s.workflowId, s.id);
    await database
      .update(workflowSchedules)
      .set({ lastRunAt: now })
      .where(and(eq(workflowSchedules.id, s.id)));
    triggered.push({ id: s.id, workflowId: s.workflowId, tenantId: s.tenantId });
  }

  return { triggered };
}
