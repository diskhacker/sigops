import { Hono } from "hono";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { db } from "../../db/index.js";
import { agents, agentTools } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { registerAgentSchema, heartbeatSchema, updateAgentSchema, registerAgentToolSchema } from "./validation.js";
import { searchSchema, paginationMeta } from "../../lib/pagination.js";

export const agentRoutes = new Hono();
agentRoutes.use("*", requireAuth);

agentRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = registerAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [agent] = await db
    .insert(agents)
    .values({
      tenantId,
      hostname: parsed.data.hostname,
      ipAddress: parsed.data.ipAddress,
      os: parsed.data.os,
      agentVersion: parsed.data.agentVersion,
      labels: parsed.data.labels ?? {},
      lastHeartbeat: new Date(),
    })
    .returning();
  return c.json({ data: agent }, 201);
});

agentRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const query = searchSchema.parse(c.req.query());
  const offset = (query.page - 1) * query.limit;

  const conds = [eq(agents.tenantId, tenantId)];
  if (query.q) conds.push(ilike(agents.hostname, `%${query.q}%`));
  const where = and(...conds);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(agents).where(where).limit(query.limit).offset(offset).orderBy(desc(agents.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(agents).where(where),
  ]);
  return c.json({ data: items, meta: paginationMeta(query.page, query.limit, count) });
});

agentRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .limit(1);
  if (!agent) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  return c.json({ data: agent });
});

agentRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [updated] = await db
    .update(agents)
    .set(parsed.data)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  return c.json({ data: updated });
});

agentRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(agents)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  return c.json({ data: {} });
});

agentRoutes.post("/:id/heartbeat", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    lastHeartbeat: new Date(),
  };
  if (parsed.data.tools) updates.tools = parsed.data.tools;

  const [updated] = await db
    .update(agents)
    .set(updates)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  return c.json({ data: updated });
});

// ── Agent Tools ──
agentRoutes.get("/:id/tools", async (c) => {
  const tenantId = c.get("tenantId");
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .limit(1);
  if (!agent) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);

  const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, c.req.param("id")));
  return c.json({ data: tools });
});

agentRoutes.post("/:id/tools", async (c) => {
  const tenantId = c.get("tenantId");
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, c.req.param("id")), eq(agents.tenantId, tenantId)))
    .limit(1);
  if (!agent) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);

  const body = await c.req.json();
  const parsed = registerAgentToolSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const [tool] = await db
    .insert(agentTools)
    .values({ agentId: c.req.param("id"), ...parsed.data })
    .returning();
  return c.json({ data: tool }, 201);
});
