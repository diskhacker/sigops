import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executions, executionSteps, signals } from "../../db/schema.js";
import { NotFoundError } from "../../lib/errors.js";

type TraceStatus = "success" | "failed" | "partial" | "in_progress";

function computeStatus(execs: { status: string }[]): TraceStatus {
  if (execs.length === 0) return "in_progress";
  const statuses = execs.map((e) => e.status);
  if (statuses.every((s) => s === "SUCCESS")) return "success";
  if (statuses.some((s) => s === "RUNNING" || s === "PENDING")) return "in_progress";
  if (statuses.some((s) => s === "FAILED")) {
    return statuses.some((s) => s === "SUCCESS") ? "partial" : "failed";
  }
  return "success";
}

export async function getTrace(tenantId: string, traceId: string) {
  const execs = await db
    .select()
    .from(executions)
    .where(and(eq(executions.tenantId, tenantId), eq(executions.traceId, traceId)));

  if (execs.length === 0) throw new NotFoundError("Trace");

  const executionIds = execs.map((e) => e.id);

  // Fetch steps for all executions in the trace
  const steps = executionIds.length > 0
    ? await db
        .select()
        .from(executionSteps)
        .where(and(
          eq(executionSteps.tenantId, tenantId),
          // Note: ideally use inArray but keeping deps minimal — filter in JS
        ))
        .orderBy(asc(executionSteps.startedAt))
    : [];

  const filteredSteps = steps.filter((s) => executionIds.includes(s.executionId));

  // Fetch signals that triggered these executions
  const signalIds = execs.map((e) => e.signalId).filter(Boolean) as string[];
  const relatedSignals = signalIds.length > 0
    ? await db
        .select()
        .from(signals)
        .where(eq(signals.tenantId, tenantId))
    : [];
  const filteredSignals = relatedSignals.filter((s) => signalIds.includes(s.id));

  // Compute total trace duration
  const timestamps = execs
    .flatMap((e) => [e.startedAt, e.completedAt])
    .filter(Boolean) as Date[];
  const durationMs =
    timestamps.length >= 2
      ? Math.max(...timestamps.map((t) => t.getTime())) -
        Math.min(...timestamps.map((t) => t.getTime()))
      : null;

  return {
    trace_id: traceId,
    executions: execs,
    steps: filteredSteps,
    signals: filteredSignals,
    duration_ms: durationMs,
    status: computeStatus(execs),
  };
}
