import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { agentTools } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createAgentToolSchema,
  updateAgentToolSchema,
  searchAgentToolSchema,
} from "./agent-tools.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchAgentToolSchema.parse(c.req.query());
  const conds = [eq(agentTools.tenantId, tenantId)];
  if (search.agentId) conds.push(eq(agentTools.agentId, search.agentId));
  if (search.toolName) conds.push(eq(agentTools.toolName, search.toolName));
  const items = await db
    .select()
    .from(agentTools)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agentTools)
    .where(and(...conds));
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(agentTools)
    .where(and(eq(agentTools.id, id), eq(agentTools.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("AgentTool");
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createAgentToolSchema.parse(await c.req.json());
  const [row] = await db
    .insert(agentTools)
    .values({ ...body, tenantId })
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateAgentToolSchema.parse(await c.req.json());
  const [row] = await db
    .update(agentTools)
    .set(body)
    .where(and(eq(agentTools.id, id), eq(agentTools.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("AgentTool");
  return c.json(row);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(agentTools)
    .where(and(eq(agentTools.id, id), eq(agentTools.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("AgentTool");
  return c.json({ success: true });
});

export default router;
