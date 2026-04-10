import { Hono } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflowSchedules } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { createScheduleSchema, updateScheduleSchema } from "./validation.js";
import { paginationSchema, paginationMeta } from "../../lib/pagination.js";

export const scheduleRoutes = new Hono();
scheduleRoutes.use("*", requireAuth);

scheduleRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = createScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [sched] = await db.insert(workflowSchedules).values({ tenantId, ...parsed.data }).returning();
  return c.json({ data: sched }, 201);
});

scheduleRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const query = paginationSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const where = eq(workflowSchedules.tenantId, tenantId);
  const [items, [{ count }]] = await Promise.all([
    db.select().from(workflowSchedules).where(where).limit(query.limit).offset(offset).orderBy(desc(workflowSchedules.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(workflowSchedules).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

scheduleRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [sched] = await db
    .select()
    .from(workflowSchedules)
    .where(and(eq(workflowSchedules.id, c.req.param("id")), eq(workflowSchedules.tenantId, tenantId)))
    .limit(1);
  if (!sched) return c.json({ error: { code: "NOT_FOUND", message: "Schedule not found" } }, 404);
  return c.json({ data: sched });
});

scheduleRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(workflowSchedules)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workflowSchedules.id, c.req.param("id")), eq(workflowSchedules.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Schedule not found" } }, 404);
  return c.json({ data: updated });
});

scheduleRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(workflowSchedules)
    .where(and(eq(workflowSchedules.id, c.req.param("id")), eq(workflowSchedules.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Schedule not found" } }, 404);
  return c.json({ data: {} });
});
