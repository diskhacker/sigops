import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signalRules } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createSignalRuleSchema,
  updateSignalRuleSchema,
  searchSignalRuleSchema,
} from "./signal-rules.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchSignalRuleSchema.parse(c.req.query());
  const conds = [eq(signalRules.tenantId, tenantId)];
  if (search.workflowId) conds.push(eq(signalRules.workflowId, search.workflowId));
  if (search.isActive !== undefined) conds.push(eq(signalRules.isActive, search.isActive));
  const items = await db
    .select()
    .from(signalRules)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signalRules)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(signalRules)
    .where(and(eq(signalRules.id, id), eq(signalRules.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("SignalRule");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createSignalRuleSchema.parse(await c.req.json());
  const [row] = await db
    .insert(signalRules)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateSignalRuleSchema.parse(await c.req.json());
  const [row] = await db
    .update(signalRules)
    .set(body)
    .where(and(eq(signalRules.id, id), eq(signalRules.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("SignalRule");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(signalRules)
    .where(and(eq(signalRules.id, id), eq(signalRules.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("SignalRule");
  return c.json({ success: true });
});

export default router;
