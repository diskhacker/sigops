import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executions, workflows, executionSteps } from "../../db/schema.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import {
  type Pagination,
  getOffset,
  buildPageResponse,
} from "../../lib/pagination.js";
import { parseSel, SelParseError } from "../../lib/sel/parser.js";
import { runSteps } from "../../lib/sel/executor.js";
import { toolRegistry } from "../../lib/sel/builtin-tools.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateExecutionInput {
  workflowId: string;
  signalId?: string;
  agentId?: string;
  triggerType: string;
  triggeredBy?: string;
  status?: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
}

export interface UpdateExecutionInput {
  status?: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
  agentId?: string;
  riskScore?: Record<string, unknown>;
  error?: Record<string, unknown>;
  durationMs?: number;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
  trace_id?: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function startExecution(
  tenantId: string,
  workflowId: string,
  triggeredBy: string,
  input?: Record<string, unknown>,
) {
  const [row] = await db
    .insert(executions)
    .values({
      tenantId,
      workflowId,
      status: "RUNNING",
      triggerType: "manual",
      triggeredBy,
      startedAt: new Date(),
    })
    .returning();
  return row;
}

export async function getExecution(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Execution");
  return row;
}

export async function listExecutions(
  tenantId: string,
  pagination: Pagination,
  filters: ExecutionFilters,
) {
  const conds = [eq(executions.tenantId, tenantId)];
  if (filters.workflowId)
    conds.push(eq(executions.workflowId, filters.workflowId));
  if (filters.status) conds.push(eq(executions.status, filters.status));
  if (filters.trace_id) conds.push(eq(executions.traceId, filters.trace_id));

  const items = await db
    .select()
    .from(executions)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(executions)
    .where(and(...conds));

  return buildPageResponse(items, count, pagination);
}

export async function updateExecutionStatus(
  tenantId: string,
  id: string,
  status: UpdateExecutionInput["status"],
  result?: Record<string, unknown>,
) {
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (result) updates.error = result;
  const [row] = await db
    .update(executions)
    .set(updates)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Execution");
  return row;
}

export async function createExecution(
  tenantId: string,
  input: CreateExecutionInput,
) {
  const [row] = await db
    .insert(executions)
    .values({ ...input, tenantId })
    .returning();
  return row;
}

export async function updateExecution(
  tenantId: string,
  id: string,
  input: UpdateExecutionInput,
) {
  const [row] = await db
    .update(executions)
    .set(input)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Execution");
  return row;
}

export async function triggerExecution(
  tenantId: string,
  workflowId: string,
  params?: Record<string, unknown>,
) {
  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!wf) throw new NotFoundError("Workflow");
  if (wf.isActive === false)
    throw new ValidationError("Workflow is not active");

  let steps;
  try {
    steps = parseSel(wf.selCode);
  } catch (e) {
    if (e instanceof SelParseError) throw new ValidationError(e.message);
    throw e;
  }

  const startedAt = new Date();
  const [exec] = await db
    .insert(executions)
    .values({
      tenantId,
      workflowId: wf.id,
      status: "RUNNING",
      triggerType: "manual",
      startedAt,
    })
    .returning();

  const result = await runSteps(steps, toolRegistry(), { tenantId });
  const completedAt = new Date();

  if (result.steps.length > 0) {
    await db.insert(executionSteps).values(
      result.steps.map((s, idx) => ({
        tenantId,
        executionId: exec.id,
        stepIndex: idx,
        toolName: s.tool,
        input: s.input,
        output: (s.output ?? null) as unknown,
        status: (
          s.status === "SUCCESS"
            ? "SUCCESS"
            : s.status === "FAILED"
              ? "FAILED"
              : "SKIPPED"
        ) as "SUCCESS" | "FAILED" | "SKIPPED",
        error: s.error ?? null,
        durationMs: s.durationMs,
        startedAt,
        completedAt,
      })),
    );
  }

  const [updated] = await db
    .update(executions)
    .set({
      status: result.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      completedAt,
      durationMs: result.totalDurationMs,
      error: result.error ? { message: result.error } : null,
    })
    .where(eq(executions.id, exec.id))
    .returning();

  return { execution: updated, result };
}

export async function cancelExecution(tenantId: string, id: string) {
  const row = await getExecution(tenantId, id);
  if (row.status !== "PENDING" && row.status !== "RUNNING") {
    throw new ValidationError(
      `Cannot cancel execution in ${row.status} state`,
    );
  }
  const [updated] = await db
    .update(executions)
    .set({ status: "CANCELLED", completedAt: new Date() })
    .where(eq(executions.id, id))
    .returning();
  return updated;
}

export async function retryExecution(tenantId: string, id: string) {
  const row = await getExecution(tenantId, id);
  if (row.status !== "FAILED") {
    throw new ValidationError(
      `Cannot retry execution in ${row.status} state`,
    );
  }

  // Fetch the workflow to re-run SEL
  const [wf] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, row.workflowId))
    .limit(1);
  if (!wf) throw new NotFoundError("Workflow");

  let steps;
  try {
    steps = parseSel(wf.selCode);
  } catch (e) {
    if (e instanceof SelParseError) throw new ValidationError(e.message);
    throw e;
  }

  const startedAt = new Date();
  const [newExec] = await db
    .insert(executions)
    .values({
      tenantId,
      workflowId: wf.id,
      signalId: row.signalId,
      status: "RUNNING",
      triggerType: "retry",
      startedAt,
    })
    .returning();

  const result = await runSteps(steps, toolRegistry(), { tenantId });
  const completedAt = new Date();

  if (result.steps.length > 0) {
    await db.insert(executionSteps).values(
      result.steps.map((s, idx) => ({
        tenantId,
        executionId: newExec.id,
        stepIndex: idx,
        toolName: s.tool,
        input: s.input,
        output: (s.output ?? null) as unknown,
        status: (
          s.status === "SUCCESS"
            ? "SUCCESS"
            : s.status === "FAILED"
              ? "FAILED"
              : "SKIPPED"
        ) as "SUCCESS" | "FAILED" | "SKIPPED",
        error: s.error ?? null,
        durationMs: s.durationMs,
        startedAt,
        completedAt,
      })),
    );
  }

  const [updated] = await db
    .update(executions)
    .set({
      status: result.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      completedAt,
      durationMs: result.totalDurationMs,
      error: result.error ? { message: result.error } : null,
    })
    .where(eq(executions.id, newExec.id))
    .returning();

  return { execution: updated, result };
}

export async function deleteExecution(tenantId: string, id: string) {
  const [row] = await db
    .delete(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Execution");
  return row;
}
