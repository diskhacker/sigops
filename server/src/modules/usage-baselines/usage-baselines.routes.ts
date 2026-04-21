import { Hono } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/auth.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { db } from "../../db/index.js";
import { usageBaselines } from "../../db/schema.js";
import { NotFoundError } from "../../lib/errors.js";
import { computeBaseline } from "../../lib/spike-detector.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db.select().from(usageBaselines).where(eq(usageBaselines.tenantId, tenantId));
  return c.json({ data: rows });
});

router.post("/compute", async (c) => {
  const tenantId = c.get("tenantId");
  const { metric, windowMinutes } = z
    .object({ metric: z.string().min(1), windowMinutes: z.number().int().positive().default(60) })
    .parse(await c.req.json());
  const avg = await computeBaseline(db, tenantId, metric, windowMinutes);
  return c.json({ metric, baseline: avg, windowMinutes });
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const { spikeThreshold } = z.object({ spikeThreshold: z.string().min(1) }).parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(usageBaselines)
    .where(and(eq(usageBaselines.id, id), eq(usageBaselines.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new NotFoundError("UsageBaseline");

  const [updated] = await db
    .update(usageBaselines)
    .set({ spikeThreshold })
    .where(eq(usageBaselines.id, id))
    .returning();
  return c.json({ data: updated });
});

export default router;
