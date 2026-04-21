import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import type { AppVariables } from "../../lib/hono-types.js";
import { ForbiddenError } from "../../lib/errors.js";
import { getLogLevel, setLogLevel } from "./platform-config.service.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

const ALLOWED_ROLES = new Set(["platform_admin", "support_engineer"]);

function flattenRoles(roles: string[] | Record<string, string[]> | null | undefined): string[] {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  return Object.values(roles).flat();
}

function requirePlatformAdminOrSupport(roles: string[] | Record<string, string[]> | null | undefined): void {
  if (!flattenRoles(roles).some((r) => ALLOWED_ROLES.has(r))) {
    throw new ForbiddenError("Requires platform_admin or support_engineer role");
  }
}

const setLogLevelSchema = z.object({
  level: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
});

router.get("/log-level", async (c) => {
  const user = c.get("user");
  requirePlatformAdminOrSupport(user.roles);
  const current = await getLogLevel();
  return c.json({ current });
});

router.put("/log-level", async (c) => {
  const user = c.get("user");
  requirePlatformAdminOrSupport(user.roles);
  const { level } = setLogLevelSchema.parse(await c.req.json());
  const result = await setLogLevel(level, user.sub);
  return c.json(result);
});

export default router;
