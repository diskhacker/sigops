import { Hono } from "hono";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signals } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { normalizePrometheusPayload, prometheusWebhookSchema } from "./prometheus.js";
import { createSignalSchema } from "../signals/signals.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

function fingerprint(source: string, title: string, body: unknown): string {
  return createHash("sha256")
    .update(`${source}:${title}:${JSON.stringify(body)}`)
    .digest("hex");
}

async function insertSignal(
  tenantId: string,
  payload: { source: string; severity: "critical" | "warning" | "info"; title: string; body: Record<string, unknown> },
) {
  const fp = fingerprint(payload.source, payload.title, payload.body);
  const [existing] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.tenantId, tenantId), eq(signals.fingerprint, fp)))
    .limit(1);
  if (existing) return { created: false, row: existing };
  const [row] = await db
    .insert(signals)
    .values({ ...payload, tenantId, fingerprint: fp })
    .returning();
  return { created: true, row };
}

router.post("/prometheus", async (c) => {
  const tenantId = c.get("tenantId");
  const payload = prometheusWebhookSchema.parse(await c.req.json());
  const normalized = normalizePrometheusPayload(payload);
  const results = [];
  for (const n of normalized) {
    results.push(await insertSignal(tenantId, n));
  }
  const ingested = results.filter((r) => r.created).length;
  const deduped = results.length - ingested;
  return c.json({ ingested, deduped, total: results.length }, 201);
});

router.post("/webhook", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createSignalSchema.parse(await c.req.json());
  const { created, row } = await insertSignal(tenantId, body);
  return c.json(row, created ? 201 : 200);
});

export default router;
