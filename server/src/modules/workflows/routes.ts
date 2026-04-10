import { Hono } from "hono";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflows } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { createWorkflowSchema, updateWorkflowSchema } from "./validation.js";
import { searchSchema, paginationMeta } from "../../lib/pagination.js";

export const workflowRoutes = new Hono();
workflowRoutes.use("*", requireAuth);

workflowRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [wf] = await db
    .insert(workflows)
    .values({ tenantId, createdBy: user.sub, ...parsed.data })
    .returning();
  return c.json({ data: wf }, 201);
});

workflowRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const query = searchSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const conds = [eq(workflows.tenantId, tenantId)];
  if (query.q) conds.push(ilike(workflows.name, `%${query.q}%`));
  const where = and(...conds);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(workflows).where(where).limit(query.limit).offset(offset).orderBy(desc(workflows.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(workflows).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

workflowRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, c.req.param("id")), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!wf) return c.json({ error: { code: "NOT_FOUND", message: "Workflow not found" } }, 404);
  return c.json({ data: wf });
});

workflowRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(workflows)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workflows.id, c.req.param("id")), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Workflow not found" } }, 404);
  return c.json({ data: updated });
});

workflowRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, c.req.param("id")), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Workflow not found" } }, 404);
  return c.json({ data: {} });
});
