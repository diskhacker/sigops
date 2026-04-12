import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflowSchedules } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createWorkflowScheduleSchema,
  updateWorkflowScheduleSchema,
  searchWorkflowScheduleSchema,
} from "./workflow-schedules.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchWorkflowScheduleSchema.parse(c.req.query());
  const conds = [eq(workflowSchedules.tenantId, tenantId)];
  if (search.workflowId) conds.push(eq(workflowSchedules.workflowId, search.workflowId));
  if (search.isActive !== undefined) conds.push(eq(workflowSchedules.isActive, search.isActive));
  const items = await db
    .select()
    .from(workflowSchedules)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workflowSchedules)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(workflowSchedules)
    .where(and(eq(workflowSchedules.id, id), eq(workflowSchedules.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("WorkflowSchedule");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createWorkflowScheduleSchema.parse(await c.req.json());
  const [row] = await db
    .insert(workflowSchedules)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateWorkflowScheduleSchema.parse(await c.req.json());
  const [row] = await db
    .update(workflowSchedules)
    .set(body)
    .where(and(eq(workflowSchedules.id, id), eq(workflowSchedules.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("WorkflowSchedule");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(workflowSchedules)
    .where(and(eq(workflowSchedules.id, id), eq(workflowSchedules.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("WorkflowSchedule");
  return c.json({ success: true });
});

export default router;
