import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { paginationSchema } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  searchWorkflowSchema,
} from "./workflows.schema.js";
import * as workflowService from "./workflows.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const filters = searchWorkflowSchema.parse(c.req.query());
  const result = await workflowService.listWorkflows(
    tenantId,
    pagination,
    filters,
  );
  return c.json(result);
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const row = await workflowService.getWorkflow(tenantId, id);
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createWorkflowSchema.parse(await c.req.json());
  const row = await workflowService.createWorkflow(tenantId, body);
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateWorkflowSchema.parse(await c.req.json());
  const row = await workflowService.updateWorkflow(tenantId, id, body);
  return c.json(row);
});

router.post("/:id/trigger", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const { execution, result } = await workflowService.triggerWorkflow(
    tenantId,
    id,
  );
  return c.json({ execution, result }, 200);
});

/** POST /:id/schedule — set a cron schedule for this workflow */
router.post("/:id/schedule", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { schedule, created } = await workflowService.upsertSchedule(
    tenantId,
    id,
    body,
  );
  return c.json(schedule, created ? 201 : 200);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  await workflowService.deleteWorkflow(tenantId, id);
  return c.json({ success: true });
});

export default router;
