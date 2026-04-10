import { Hono } from "hono";
import { eq, and, sql, desc, ilike, or } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../../db/index.js";
import { signals } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { ingestSignalSchema, updateSignalSchema, searchSignalsSchema } from "./validation.js";
import { paginationMeta } from "../../lib/pagination.js";

export const signalRoutes = new Hono();
signalRoutes.use("*", requireAuth);

signalRoutes.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = ingestSignalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() } }, 400);
  }
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${parsed.data.source}:${parsed.data.title}:${JSON.stringify(parsed.data.body)}`)
    .digest("hex");

  const [signal] = await db
    .insert(signals)
    .values({
      tenantId,
      source: parsed.data.source,
      severity: parsed.data.severity,
      title: parsed.data.title,
      body: parsed.data.body,
      fingerprint,
      metadata: parsed.data.metadata ?? {},
    })
    .returning();
  return c.json({ data: signal }, 201);
});

signalRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const parsed = searchSignalsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid query params" } }, 400);
  }
  const q = parsed.data;
  const offset = (q.page - 1) * q.limit;

  const conds = [eq(signals.tenantId, tenantId)];
  if (q.severity) conds.push(eq(signals.severity, q.severity));
  if (q.status) conds.push(eq(signals.status, q.status));
  if (q.source) conds.push(eq(signals.source, q.source));
  if (q.q) {
    const likeTerm = `%${q.q}%`;
    const searchCond = or(ilike(signals.title, likeTerm), ilike(signals.source, likeTerm));
    if (searchCond) conds.push(searchCond);
  }
  const where = and(...conds);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(signals).where(where).limit(q.limit).offset(offset).orderBy(desc(signals.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(signals).where(where),
  ]);

  return c.json({ data: items, meta: paginationMeta(q.page, q.limit, count) });
});

signalRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [signal] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.id, c.req.param("id")), eq(signals.tenantId, tenantId)))
    .limit(1);
  if (!signal) return c.json({ error: { code: "NOT_FOUND", message: "Signal not found" } }, 404);
  return c.json({ data: signal });
});

signalRoutes.patch("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json();
  const parsed = updateSignalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, 400);
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "RESOLVED") updates.resolvedAt = new Date();

  const [updated] = await db
    .update(signals)
    .set(updates)
    .where(and(eq(signals.id, c.req.param("id")), eq(signals.tenantId, tenantId)))
    .returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Signal not found" } }, 404);
  return c.json({ data: updated });
});

signalRoutes.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const [deleted] = await db
    .delete(signals)
    .where(and(eq(signals.id, c.req.param("id")), eq(signals.tenantId, tenantId)))
    .returning();
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Signal not found" } }, 404);
  return c.json({ data: {} });
});
