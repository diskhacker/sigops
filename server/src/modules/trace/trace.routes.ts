import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { getTrace } from "./trace.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/:trace_id", async (c) => {
  const tenantId = c.get("tenantId");
  const traceId = c.req.param("trace_id");
  const result = await getTrace(tenantId, traceId);
  return c.json(result);
});

export default router;
