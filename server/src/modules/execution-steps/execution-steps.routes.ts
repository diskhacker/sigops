import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { executionSteps } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createExecutionStepSchema,
  updateExecutionStepSchema,
  searchExecutionStepSchema,
} from "./execution-steps.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchExecutionStepSchema.parse(c.req.query());
  const conds = [eq(executionSteps.tenantId, tenantId)];
  if (search.executionId) conds.push(eq(executionSteps.executionId, search.executionId));
  if (search.status) conds.push(eq(executionSteps.status, search.status));
  if (search.agentId) conds.push(eq(executionSteps.agentId, search.agentId));
  const items = await db
    .select()
    .from(executionSteps)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(executionSteps)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(executionSteps)
    .where(and(eq(executionSteps.id, id), eq(executionSteps.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("ExecutionStep");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createExecutionStepSchema.parse(await c.req.json());
  const [row] = await db
    .insert(executionSteps)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateExecutionStepSchema.parse(await c.req.json());
  const [row] = await db
    .update(executionSteps)
    .set(body)
    .where(and(eq(executionSteps.id, id), eq(executionSteps.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("ExecutionStep");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(executionSteps)
    .where(and(eq(executionSteps.id, id), eq(executionSteps.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("ExecutionStep");
  return c.json({ success: true });
});

export default router;
