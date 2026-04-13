import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { paginationSchema } from "../../lib/pagination.js";
import type { AppVariables } from "../../lib/hono-types.js";
import {
  createSignalSchema,
  updateSignalSchema,
  searchSignalSchema,
} from "./signals.schema.js";
import * as signalService from "./signals.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const filters = searchSignalSchema.parse(c.req.query());
  const result = await signalService.listSignals(tenantId, pagination, filters);
  return c.json(result);
});

router.get("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const row = await signalService.getSignal(tenantId, id);
  return c.json(row);
});

router.post("/", async (c) => {
  const tenantId = c.get("tenantId");
  const body = createSignalSchema.parse(await c.req.json());
  const { signal, created } = await signalService.createSignal(tenantId, body);
  return c.json(signal, created ? 201 : 200);
});

router.put("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const body = updateSignalSchema.parse(await c.req.json());
  const user = c.get("user");
  const row = await signalService.updateSignal(
    tenantId,
    id,
    body,
    user?.sub ?? "unknown",
  );
  return c.json(row);
});

/** PUT /:id/acknowledge — transition signal to ACKNOWLEDGED */
router.put("/:id/acknowledge", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  const row = await signalService.acknowledgeSignal(tenantId, id);
  return c.json(row);
});

/** GET /search — search signals by content (title, body) */
router.get("/search", async (c) => {
  const tenantId = c.get("tenantId");
  const pagination = paginationSchema.parse(c.req.query());
  const q = c.req.query("q") ?? "";
  const result = await signalService.listSignals(tenantId, pagination, { q });
  return c.json(result);
});

router.delete("/:id", async (c) => {
  const tenantId = c.get("tenantId");
  const id = c.req.param("id");
  await signalService.deleteSignal(tenantId, id);
  return c.json({ success: true });
});

export default router;
