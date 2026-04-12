/**
 * SEL (SigOps Execution Language) API routes.
 *
 * POST /validate — validate SEL source code
 * POST /parse    — parse SEL to AST (step list)
 * POST /test     — dry-run SEL against a sample signal context
 * POST /deploy   — save validated SEL code into a workflow
 */
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workflows } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { parseSel, SelParseError } from "../../lib/sel/parser.js";
import { runSel } from "../../lib/sel/executor.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { selValidateSchema, selTestSchema, selDeploySchema } from "./sel.schema.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

/** POST /validate — check if SEL source is syntactically valid */
router.post("/validate", async (c) => {
  const { code } = selValidateSchema.parse(await c.req.json());
  try {
    const steps = parseSel(code);
    return c.json({ valid: true, stepCount: steps.length });
  } catch (e) {
    if (e instanceof SelParseError) {
      return c.json({ valid: false, error: e.message, line: e.line }, 200);
    }
    throw e;
  }
});

/** POST /parse — parse SEL source into an AST (array of steps) */
router.post("/parse", async (c) => {
  const { code } = selValidateSchema.parse(await c.req.json());
  try {
    const steps = parseSel(code);
    return c.json({ steps });
  } catch (e) {
    if (e instanceof SelParseError) {
      throw new ValidationError(e.message);
    }
    throw e;
  }
});

/** POST /test — dry-run SEL code (uses builtin tools with stub context) */
router.post("/test", async (c) => {
  const tenantId = c.get("tenantId");
  const body = selTestSchema.parse(await c.req.json());
  const result = await runSel(body.code, {
    context: { tenantId },
  });
  return c.json(result);
});

/** POST /deploy — save validated SEL code to an existing workflow */
router.post("/deploy", async (c) => {
  const tenantId = c.get("tenantId");
  const body = selDeploySchema.parse(await c.req.json());

  // Validate SEL before saving
  try {
    parseSel(body.code);
  } catch (e) {
    if (e instanceof SelParseError) throw new ValidationError(e.message);
    throw e;
  }

  const [row] = await db
    .update(workflows)
    .set({ selCode: body.code })
    .where(and(eq(workflows.id, body.workflowId), eq(workflows.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Workflow");
  return c.json(row);
});

export default router;
