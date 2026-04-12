import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { executions, workflows, executionSteps } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import { parseSel, SelParseError } from "../../lib/sel/parser.js";
import { runSteps } from "../../lib/sel/executor.js";
import { toolRegistry } from "../../lib/sel/builtin-tools.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createExecutionSchema,
  updateExecutionSchema,
  searchExecutionSchema,
} from "./executions.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchExecutionSchema.parse(c.req.query());
  const conds = [eq(executions.tenantId, tenantId)];
  if (search.workflowId) conds.push(eq(executions.workflowId, search.workflowId));
  if (search.status) conds.push(eq(executions.status, search.status));
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
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Execution");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createExecutionSchema.parse(await c.req.json());
  const [row] = await db
    .insert(executions)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateExecutionSchema.parse(await c.req.json());
  const [row] = await db
    .update(executions)
    .set(body)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Execution");
  return c.json(row);
});

const triggerExecutionSchema = z.object({
  workflowId: z.string().uuid(),
  params: z.record(z.unknown()).optional(),
});

/** POST /trigger — manually trigger a workflow execution */
router.post("/trigger", async (c) => {
  const tenantId = c.get("tenantId");
  const body = triggerExecutionSchema.parse(await c.req.json());
  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, body.workflowId), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!wf) throw new NotFoundError("Workflow");
  if (wf.isActive === false) throw new ValidationError("Workflow is not active");

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
        status: (s.status === "SUCCESS" ? "SUCCESS" : s.status === "FAILED" ? "FAILED" : "SKIPPED") as "SUCCESS" | "FAILED" | "SKIPPED",
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

  return c.json({ execution: updated, result }, 200);
});

/** POST /:id/cancel — cancel a PENDING or RUNNING execution */
router.post("/:id/cancel", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Execution");
  if (row.status !== "PENDING" && row.status !== "RUNNING") {
    throw new ValidationError(`Cannot cancel execution in ${row.status} state`);
  }
  const [updated] = await db
    .update(executions)
    .set({ status: "CANCELLED", completedAt: new Date() })
    .where(eq(executions.id, id))
    .returning();
  return c.json(updated);
});

/** POST /:id/retry — retry a FAILED execution */
router.post("/:id/retry", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Execution");
  if (row.status !== "FAILED") {
    throw new ValidationError(`Cannot retry execution in ${row.status} state`);
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
        status: (s.status === "SUCCESS" ? "SUCCESS" : s.status === "FAILED" ? "FAILED" : "SKIPPED") as "SUCCESS" | "FAILED" | "SKIPPED",
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

  return c.json({ execution: updated, result }, 200);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(executions)
    .where(and(eq(executions.id, id), eq(executions.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Execution");
  return c.json({ success: true });
});

export default router;
