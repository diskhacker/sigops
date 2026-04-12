import { Hono } from "hono";
import { createHash } from "node:crypto";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signals } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createSignalSchema,
  updateSignalSchema,
  searchSignalSchema,
} from "./signals.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

function computeFingerprint(source: string, title: string, body: unknown): string {
  return createHash("sha256")
    .update(`${source}:${title}:${JSON.stringify(body)}`)
    .digest("hex");
}

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchSignalSchema.parse(c.req.query());
  const conds = [eq(signals.tenantId, tenantId)];
  if (search.q) conds.push(ilike(signals.title, `%${search.q}%`));
  if (search.severity) conds.push(eq(signals.severity, search.severity));
  if (search.status) conds.push(eq(signals.status, search.status));
  if (search.source) conds.push(eq(signals.source, search.source));
  const items = await db
    .select()
    .from(signals)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signals)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Signal");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createSignalSchema.parse(await c.req.json());
  const fingerprint = computeFingerprint(body.source, body.title, body.body);
  const [existing] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.tenantId, tenantId), eq(signals.fingerprint, fingerprint)))
    .limit(1);
  if (existing) return c.json(existing, 200);
  const [row] = await db
    .insert(signals)
    .values({ ...body, tenantId, fingerprint })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateSignalSchema.parse(await c.req.json());
  const updates: Record<string, unknown> = { ...body };
  if (body.status === "RESOLVED") {
    updates.resolvedAt = new Date();
    if (!body.resolvedBy) {
      const user = c.get("user");
      updates.resolvedBy = user?.sub ?? "unknown";
    }
  }
  if (body.matchedWorkflowId) {
    updates.matchedAt = new Date();
  }
  const [row] = await db
    .update(signals)
    .set(updates)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(signals)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return c.json({ success: true });
});

export default router;
