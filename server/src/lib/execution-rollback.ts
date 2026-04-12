/**
 * Execution rollback — transitions a FAILED execution to ROLLED_BACK.
 *
 * State machine: PENDING → RUNNING → SUCCESS / FAILED → ROLLED_BACK
 *
 * Rollback walks the completed steps in reverse and calls each tool's
 * rollback handler (if one exists). Steps without rollback handlers are
 * skipped. The execution status is set to ROLLED_BACK once all rollback
 * steps complete.
 */
import { and, eq } from "drizzle-orm";
import { executions, executionSteps } from "../db/schema.js";
import { db as defaultDb } from "../db/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface RollbackHandler {
  (input: Record<string, unknown>, output: unknown): Promise<void>;
}

export interface RollbackResult {
  executionId: string;
  previousStatus: string;
  newStatus: string;
  stepsRolledBack: number;
  stepsSkipped: number;
  errors: string[];
}

export async function rollbackExecution(
  executionId: string,
  tenantId: string,
  rollbackHandlers: Map<string, RollbackHandler> = new Map(),
  database: Db = defaultDb,
): Promise<RollbackResult> {
  // Load the execution
  const [exec] = await database
    .select()
    .from(executions)
    .where(
      and(eq(executions.id, executionId), eq(executions.tenantId, tenantId)),
    )
    .limit(1);

  if (!exec) {
    throw new Error(`Execution ${executionId} not found`);
  }
  if (exec.status !== "FAILED") {
    throw new Error(
      `Cannot rollback execution in status '${exec.status}' — only FAILED executions can be rolled back`,
    );
  }

  // Load completed steps in reverse order
  const steps = await database
    .select()
    .from(executionSteps)
    .where(eq(executionSteps.executionId, executionId));

  const completedSteps = steps
    .filter((s: { status: string }) => s.status === "SUCCESS")
    .sort(
      (a: { stepIndex: number }, b: { stepIndex: number }) =>
        b.stepIndex - a.stepIndex,
    );

  let rolledBack = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const step of completedSteps) {
    const handler = rollbackHandlers.get(step.toolName);
    if (!handler) {
      skipped += 1;
      continue;
    }
    try {
      await handler(step.input as Record<string, unknown>, step.output);
      rolledBack += 1;
    } catch (e) {
      errors.push(
        `Rollback failed for step ${step.stepIndex} (${step.toolName}): ${(e as Error).message}`,
      );
    }
  }

  // Mark execution as ROLLED_BACK
  await database
    .update(executions)
    .set({ status: "ROLLED_BACK", completedAt: new Date() })
    .where(eq(executions.id, executionId));

  return {
    executionId,
    previousStatus: "FAILED",
    newStatus: "ROLLED_BACK",
    stepsRolledBack: rolledBack,
    stepsSkipped: skipped,
    errors,
  };
}

export async function cancelExecution(
  executionId: string,
  tenantId: string,
  database: Db = defaultDb,
): Promise<{ executionId: string; newStatus: string }> {
  const [exec] = await database
    .select()
    .from(executions)
    .where(
      and(eq(executions.id, executionId), eq(executions.tenantId, tenantId)),
    )
    .limit(1);

  if (!exec) {
    throw new Error(`Execution ${executionId} not found`);
  }
  if (exec.status !== "PENDING" && exec.status !== "RUNNING") {
    throw new Error(
      `Cannot cancel execution in status '${exec.status}' — only PENDING or RUNNING executions can be cancelled`,
    );
  }

  await database
    .update(executions)
    .set({ status: "CANCELLED", completedAt: new Date() })
    .where(eq(executions.id, executionId));

  return { executionId, newStatus: "CANCELLED" };
}
