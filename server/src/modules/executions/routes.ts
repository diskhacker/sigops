import { Hono } from "hono";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executions, executionSteps } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  triggerExecutionSchema,
  updateExecutionSchema,
  createExecutionStepSchema,
  updateExecutionStepSchema,
} from "./validation.js";
import { searchSchema, paginationMeta } from "../../lib/pagination.js";

export const executionRoutes = new Hono();
executionRoutes.use("*", requireAuth);

executionRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = triggerExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [exec] = await db
    .insert(executions)
    .values({
      tenantId,
      workflowId: parsed.data.workflowId,
      signalId: parsed.data.signalId,
      agentId: parsed.data.agentId,
      triggerType: parsed.data.triggerType,
      triggeredBy: user.sub,
    })
    .returning();
  return c.json({ data: exec }, 201);
});

executionRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const query = searchSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const where = eq(executions.tenantId, tenantId);
  const [items, [{ count }]] = await Promise.all([
    db.select().from(executions).where(where).limit(query.limit).offset(offset).orderBy(desc(executions.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(executions).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

executionRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [exec] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!exec) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);
  return c.json({ data: exec });
});

executionRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "RUNNING") updates.startedAt = new Date();
  if (parsed.data.status === "SUCCESS" || parsed.data.status === "FAILED") updates.completedAt = new Date();

  const [updated] = await db
    .update(executions)
    .set(updates)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);
  return c.json({ data: updated });
});

executionRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(executions)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);
  return c.json({ data: {} });
});

// ── Steps ──
executionRoutes.get("/:id/steps", async (c) => {
  const tenantId = c.get("tenantId");
  const [exec] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!exec) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);

  const steps = await db
    .select()
    .from(executionSteps)
    .where(eq(executionSteps.executionId, c.req.param("id")))
    .orderBy(asc(executionSteps.stepIndex));
  return c.json({ data: steps });
});

executionRoutes.post("/:id/steps", async (c) => {
  const tenantId = c.get("tenantId");
  const [exec] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!exec) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);

  const body = await c.req.json();
  const parsed = createExecutionStepSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [step] = await db
    .insert(executionSteps)
    .values({ executionId: c.req.param("id"), ...parsed.data })
    .returning();
  return c.json({ data: step }, 201);
});

executionRoutes.patch("/:id/steps/:stepId", async (c) => {
  const tenantId = c.get("tenantId");
  const [exec] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, c.req.param("id")), eq(executions.tenantId, tenantId)))
    .limit(1);
  if (!exec) return c.json({ error: { code: "NOT_FOUND", message: "Execution not found" } }, 404);

  const body = await c.req.json();
  const parsed = updateExecutionStepSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(executionSteps)
    .set(parsed.data)
    .where(and(eq(executionSteps.id, c.req.param("stepId")), eq(executionSteps.executionId, c.req.param("id"))))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Step not found" } }, 404);
  return c.json({ data: updated });
});
