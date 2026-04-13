import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { paginationSchema } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createExecutionSchema,
  updateExecutionSchema,
  searchExecutionSchema,
} from "./executions.schema.js";
import * as executionService from "./executions.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const filters = searchExecutionSchema.parse(c.req.query());
  const result = await executionService.listExecutions(
    tenantId,
    pagination,
    filters,
  );
  return c.json(result);
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const row = await executionService.getExecution(tenantId, id);
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createExecutionSchema.parse(await c.req.json());
  const row = await executionService.createExecution(tenantId, body);
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateExecutionSchema.parse(await c.req.json());
  const row = await executionService.updateExecution(tenantId, id, body);
  return c.json(row);
});

const triggerExecutionSchema = z.object({
  workflowId: z.string().uuid(),
  params: z.record(z.unknown()).optional(),
});

/** POST /trigger — manually trigger a workflow execution */
router.post("/trigger", async (c) => {
  const tenantId = c.get("tenantId");
  const body = triggerExecutionSchema.parse(await c.req.json());
  const { execution, result } = await executionService.triggerExecution(
    tenantId,
    body.workflowId,
    body.params,
  );
  return c.json({ execution, result }, 200);
});

/** POST /:id/cancel — cancel a PENDING or RUNNING execution */
router.post("/:id/cancel", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const updated = await executionService.cancelExecution(tenantId, id);
  return c.json(updated);
});

/** POST /:id/retry — retry a FAILED execution */
router.post("/:id/retry", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const { execution, result } = await executionService.retryExecution(
    tenantId,
    id,
  );
  return c.json({ execution, result }, 200);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  await executionService.deleteExecution(tenantId, id);
  return c.json({ success: true });
});

export default router;
