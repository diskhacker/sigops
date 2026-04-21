import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executionSteps } from "../../db/schema.js";

interface WaterfallStep {
  id: string;
  name: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  offset_ms: number | null;
  status: string;
  parent_step_id: string | null;
  depth: number;
}

interface WaterfallResult {
  total_ms: number | null;
  steps: WaterfallStep[];
}

export async function computeWaterfall(
  tenantId: string,
  executionId: string,
  executionStartedAt: Date | null,
): Promise<WaterfallResult> {
  const steps = await db
    .select()
    .from(executionSteps)
    .where(
      and(
        eq(executionSteps.executionId, executionId),
        eq(executionSteps.tenantId, tenantId),
      ),
    )
    .orderBy(asc(executionSteps.stepIndex));

  if (steps.length === 0) return { total_ms: null, steps: [] };

  const origin = executionStartedAt ?? steps[0].startedAt ?? new Date();

  const timestamps = steps
    .flatMap((s) => [s.startedAt, s.completedAt])
    .filter(Boolean) as Date[];

  const total_ms =
    timestamps.length > 0
      ? Math.max(...timestamps.map((t) => t.getTime())) - origin.getTime()
      : null;

  const waterfallSteps: WaterfallStep[] = steps.map((s) => {
    const startMs = s.startedAt ? s.startedAt.getTime() - origin.getTime() : null;
    return {
      id: s.id,
      name: s.toolName,
      started_at: s.startedAt ? s.startedAt.toISOString() : null,
      ended_at: s.completedAt ? s.completedAt.toISOString() : null,
      duration_ms: s.durationMs ?? null,
      offset_ms: startMs !== null && startMs >= 0 ? startMs : null,
      status: s.status,
      parent_step_id: null, // flat model — no parent in current schema
      depth: 0,
    };
  });

  return { total_ms, steps: waterfallSteps };
}
