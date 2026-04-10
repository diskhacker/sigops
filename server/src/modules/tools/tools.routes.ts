import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tools } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createToolSchema,
  updateToolSchema,
  searchToolSchema,
} from "./tools.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchToolSchema.parse(c.req.query());
  const conds = [eq(tools.tenantId, tenantId)];
  if (search.type) conds.push(eq(tools.type, search.type));
  const items = await db
    .select()
    .from(tools)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tools)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(tools)
    .where(and(eq(tools.id, id), eq(tools.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Tool");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createToolSchema.parse(await c.req.json());
  const [row] = await db
    .insert(tools)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateToolSchema.parse(await c.req.json());
  const [row] = await db
    .update(tools)
    .set(body)
    .where(and(eq(tools.id, id), eq(tools.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Tool");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(tools)
    .where(and(eq(tools.id, id), eq(tools.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Tool");
  return c.json({ success: true });
});

export default router;
