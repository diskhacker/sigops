import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { agents } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import { handleHeartbeat } from "../../lib/agent-gateway.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createAgentSchema,
  updateAgentSchema,
  searchAgentSchema,
} from "./agents.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchAgentSchema.parse(c.req.query());
  const conds = [eq(agents.tenantId, tenantId)];
  if (search.status) conds.push(eq(agents.status, search.status));
  const items = await db
    .select()
    .from(agents)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Agent");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createAgentSchema.parse(await c.req.json());
  const [row] = await db
    .insert(agents)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateAgentSchema.parse(await c.req.json());
  const [row] = await db
    .update(agents)
    .set(body)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Agent");
  return c.json(row);
});

/** POST /register — register a new agent (alias for POST /) */
router.post("/register", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createAgentSchema.parse(await c.req.json());
  const [row] = await db
    .insert(agents)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

/** POST /:id/heartbeat — agent heartbeat + tool discovery */
router.post("/:id/heartbeat", async (c) => {
  const tenantId = c.get("tenantId");
  const agentId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await handleHeartbeat({
    agentId,
    tenantId,
    tools: body.tools as unknown[] | undefined,
    labels: body.labels as Record<string, unknown> | undefined,
  });
  return c.json(result);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Agent");
  return c.json({ success: true });
});

export default router;
