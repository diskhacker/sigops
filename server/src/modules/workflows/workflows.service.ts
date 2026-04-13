import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import {
  workflows,
  executions,
  executionSteps,
  workflowSchedules,
} from "../../db/schema.js";
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

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  selCode: string;
  triggerRules: Record<string, unknown>;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  selCode?: string;
  triggerRules?: Record<string, unknown>;
  isActive?: boolean;
  tags?: string[];
}

export interface WorkflowFilters {
  isActive?: boolean;
}

export interface ScheduleInput {
  cronExpression: string;
  timezone?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateSel(selCode: string): void {
  try {
    parseSel(selCode);
  } catch (e) {
    if (e instanceof SelParseError) throw new ValidationError(e.message);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createWorkflow(
  tenantId: string,
  input: CreateWorkflowInput,
) {
  validateSel(input.selCode);
  const [row] = await db
    .insert(workflows)
    .values({ ...input, tenantId })
    .returning();
  return row;
}

export async function listWorkflows(
  tenantId: string,
  pagination: Pagination,
  filters: WorkflowFilters,
) {
  const conds = [eq(workflows.tenantId, tenantId)];
  if (filters.isActive !== undefined)
    conds.push(eq(workflows.isActive, filters.isActive));

  const items = await db
    .select()
    .from(workflows)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workflows)
    .where(and(...conds));

  return buildPageResponse(items, count, pagination);
}

export async function getWorkflow(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Workflow");
  return row;
}

export async function updateWorkflow(
  tenantId: string,
  id: string,
  input: UpdateWorkflowInput,
) {
  if (input.selCode) validateSel(input.selCode);
  const [row] = await db
    .update(workflows)
    .set(input)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return row;
}

export async function deleteWorkflow(tenantId: string, id: string) {
  const [row] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return row;
}

export async function deployWorkflow(tenantId: string, id: string) {
  const [row] = await db
    .update(workflows)
    .set({ isActive: true })
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return row;
}

export async function disableWorkflow(tenantId: string, id: string) {
  const [row] = await db
    .update(workflows)
    .set({ isActive: false })
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return row;
}

export async function triggerWorkflow(tenantId: string, id: string) {
  const wf = await getWorkflow(tenantId, id);
  if (wf.isActive === false)
    throw new ValidationError("Workflow is not active");

  const steps = (() => {
    try {
      return parseSel(wf.selCode);
    } catch (e) {
      if (e instanceof SelParseError) throw new ValidationError(e.message);
      throw e;
    }
  })();

  const triggerType = "manual";
  const startedAt = new Date();
  const [exec] = await db
    .insert(executions)
    .values({
      tenantId,
      workflowId: wf.id,
      status: "RUNNING",
      triggerType,
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

const scheduleSchema = z.object({
  cronExpression: z.string().min(1),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function upsertSchedule(
  tenantId: string,
  workflowId: string,
  input: ScheduleInput,
) {
  // Verify workflow exists
  await getWorkflow(tenantId, workflowId);

  const body = scheduleSchema.parse(input);

  // Check for existing schedule
  const [existing] = await db
    .select()
    .from(workflowSchedules)
    .where(
      and(
        eq(workflowSchedules.workflowId, workflowId),
        eq(workflowSchedules.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(workflowSchedules)
      .set(body)
      .where(eq(workflowSchedules.id, existing.id))
      .returning();
    return { schedule: updated, created: false };
  }

  const [row] = await db
    .insert(workflowSchedules)
    .values({ ...body, workflowId, tenantId })
    .returning();
  return { schedule: row, created: true };
}
