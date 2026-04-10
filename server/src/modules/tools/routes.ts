import { Hono } from "hono";
import { eq, sql, desc, ilike } from "drizzle-orm";
import { db } from "../../db/index.js";
import { toolRegistry } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { createToolSchema, updateToolSchema } from "./validation.js";
import { searchSchema, paginationMeta } from "../../lib/pagination.js";

export const toolRoutes = new Hono();
toolRoutes.use("*", requireAuth);

toolRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createToolSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [tool] = await db.insert(toolRegistry).values(parsed.data).returning();
  return c.json({ data: tool }, 201);
});

toolRoutes.get("/", async (c) => {
  const query = searchSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const where = query.q ? ilike(toolRegistry.name, `%${query.q}%`) : undefined;
  const [items, [{ count }]] = await Promise.all([
    db.select().from(toolRegistry).where(where).limit(query.limit).offset(offset).orderBy(desc(toolRegistry.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(toolRegistry).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

toolRoutes.get("/:id", async (c) => {
  const [tool] = await db.select().from(toolRegistry).where(eq(toolRegistry.id, c.req.param("id"))).limit(1);
  if (!tool) return c.json({ error: { code: "NOT_FOUND", message: "Tool not found" } }, 404);
  return c.json({ data: tool });
});

toolRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateToolSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(toolRegistry)
    .set(parsed.data)
    .where(eq(toolRegistry.id, c.req.param("id")))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Tool not found" } }, 404);
  return c.json({ data: updated });
});

toolRoutes.delete("/:id", async (c) => {
  const [deleted] = await db
    .delete(toolRegistry)
    .where(eq(toolRegistry.id, c.req.param("id")))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Tool not found" } }, 404);
  return c.json({ data: {} });
});
