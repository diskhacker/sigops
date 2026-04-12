import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { toolRegistry } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { paginationSchema, getOffset, buildPageResponse } from "../../lib/pagination.js";
import { toolRegistry as getToolRegistry } from "../../lib/sel/builtin-tools.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createToolSchema,
  updateToolSchema,
  searchToolSchema,
} from "./tools.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const pagination = paginationSchema.parse(c.req.query());
  const search = searchToolSchema.parse(c.req.query());
  const conds = [];
  if (search.type) conds.push(eq(toolRegistry.type, search.type));
  if (search.name) conds.push(eq(toolRegistry.name, search.name));
  const items = await db
    .select()
    .from(toolRegistry)
    .where(conds.length ? and(...conds) : undefined)
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(toolRegistry)
    .where(conds.length ? and(...conds) : undefined);
  return c.json(buildPageResponse(items, count, pagination));
});

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(toolRegistry)
    .where(eq(toolRegistry.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Tool");
  return c.json(row);
});

router.post("/", async (c) => {
  const body = createToolSchema.parse(await c.req.json());
  const [row] = await db
    .insert(toolRegistry)
    .values(body)
    .returning();
  return c.json(row, 201);
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = updateToolSchema.parse(await c.req.json());
  const [row] = await db
    .update(toolRegistry)
    .set(body)
    .where(eq(toolRegistry.id, id))
    .returning();
  if (!row) throw new NotFoundError("Tool");
  return c.json(row);
});

const toolTestSchema = z.object({
  input: z.record(z.unknown()),
});

/** POST /:id/test — test-execute a tool with sample input */
router.post("/:id/test", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = toolTestSchema.parse(await c.req.json());

  // Look up tool in DB to get its name
  const [row] = await db
    .select()
    .from(toolRegistry)
    .where(eq(toolRegistry.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Tool");

  const registry = getToolRegistry();
  const tool = registry.get(row.name as string);
  if (!tool) throw new ValidationError(`Tool '${row.name}' is not a registered builtin tool`);

  try {
    const output = await tool.execute(body.input, { tenantId });
    return c.json({ success: true, output });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 200);
  }
});

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .delete(toolRegistry)
    .where(eq(toolRegistry.id, id))
    .returning();
  if (!row) throw new NotFoundError("Tool");
  return c.json({ success: true });
});

export default router;
