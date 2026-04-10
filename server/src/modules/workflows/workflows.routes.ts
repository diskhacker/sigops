import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflows } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  searchWorkflowSchema,
} from "./workflows.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchWorkflowSchema.parse(c.req.query());
  const conds = [eq(workflows.tenantId, tenantId)];
  if (search.isActive !== undefined) conds.push(eq(workflows.isActive, search.isActive));
  const items = await db
    .select()
    .from(workflows)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workflows)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Workflow");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createWorkflowSchema.parse(await c.req.json());
  const [row] = await db
    .insert(workflows)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateWorkflowSchema.parse(await c.req.json());
  const [row] = await db
    .update(workflows)
    .set(body)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return c.json({ success: true });
});

export default router;
