import { Hono } from "hono";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signalRules } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { createSignalRuleSchema, updateSignalRuleSchema } from "./validation.js";
import { searchSchema, paginationMeta } from "../../lib/pagination.js";

export const signalRuleRoutes = new Hono();
signalRuleRoutes.use("*", requireAuth);

signalRuleRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = createSignalRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [rule] = await db.insert(signalRules).values({ tenantId, ...parsed.data }).returning();
  return c.json({ data: rule }, 201);
});

signalRuleRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const query = searchSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const conds = [eq(signalRules.tenantId, tenantId)];
  if (query.q) conds.push(ilike(signalRules.name, `%${query.q}%`));
  const where = and(...conds);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(signalRules).where(where).limit(query.limit).offset(offset).orderBy(desc(signalRules.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(signalRules).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

signalRuleRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [rule] = await db
    .select()
    .from(signalRules)
    .where(and(eq(signalRules.id, c.req.param("id")), eq(signalRules.tenantId, tenantId)))
    .limit(1);
  if (!rule) return c.json({ error: { code: "NOT_FOUND", message: "Signal rule not found" } }, 404);
  return c.json({ data: rule });
});

signalRuleRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateSignalRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(signalRules)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(signalRules.id, c.req.param("id")), eq(signalRules.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Signal rule not found" } }, 404);
  return c.json({ data: updated });
});

signalRuleRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(signalRules)
    .where(and(eq(signalRules.id, c.req.param("id")), eq(signalRules.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Signal rule not found" } }, 404);
  return c.json({ data: {} });
});
