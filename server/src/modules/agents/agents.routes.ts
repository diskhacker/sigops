import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { paginationSchema } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createAgentSchema,
  updateAgentSchema,
  searchAgentSchema,
} from "./agents.schema.js";
import * as agentService from "./agents.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const filters = searchAgentSchema.parse(c.req.query());
  const result = await agentService.listAgents(tenantId, pagination, filters);
  return c.json(result);
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const row = await agentService.getAgent(tenantId, id);
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createAgentSchema.parse(await c.req.json());
  const row = await agentService.registerAgent(tenantId, body);
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateAgentSchema.parse(await c.req.json());
  const row = await agentService.updateAgent(tenantId, id, body);
  return c.json(row);
});

/** POST /register — register a new agent (alias for POST /) */
router.post("/register", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createAgentSchema.parse(await c.req.json());
  const row = await agentService.registerAgent(tenantId, body);
  return c.json(row, 201);
});

/** POST /:id/heartbeat — agent heartbeat + tool discovery */
router.post("/:id/heartbeat", async (c) => {
  const tenantId = c.get("tenantId");
  const agentId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const result = await agentService.heartbeat(agentId, tenantId, {
    tools: body.tools as unknown[] | undefined,
    labels: body.labels as Record<string, unknown> | undefined,
  });
  return c.json(result);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  await agentService.deleteAgent(tenantId, id);
  return c.json({ success: true });
});

export default router;
