import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflows, executions, executionSteps } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { parseSel, SelParseError } from "../../lib/sel/parser.js";
import { runSteps } from "../../lib/sel/executor.js";
import { toolRegistry } from "../../lib/sel/builtin-tools.js";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  searchWorkflowSchema,
} from "./workflows.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchWorkflowSchema.parse(c.req.query());
  const conds = [eq(workflows.tenantId, tenantId)];
  if (search.isActive !== undefined) conds.push(eq(workflows.isActive, search.isActive));
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
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Workflow");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createWorkflowSchema.parse(await c.req.json());
  try {
    parseSel(body.selCode);
  } catch (e) {
    if (e instanceof SelParseError) throw new ValidationError(e.message);
    throw e;
  }
  const [row] = await db
    .insert(workflows)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateWorkflowSchema.parse(await c.req.json());
  if (body.selCode) {
    try {
      parseSel(body.selCode);
    } catch (e) {
      if (e instanceof SelParseError) throw new ValidationError(e.message);
      throw e;
    }
  }
  const [row] = await db
    .update(workflows)
    .set(body)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return c.json(row);
});

router.post("/:id/trigger", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
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
        status:
          s.status === "SUCCESS"
            ? "SUCCESS"
            : s.status === "FAILED"
              ? "FAILED"
              : "SKIPPED",
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

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return c.json({ success: true });
});

export default router;
