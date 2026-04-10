import { createMiddleware } from "hono/factory";
import { verifyToken, type TokenPayload } from "../modules/auth/jwt.js";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    user: TokenPayload;
    tenantId: string;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" } }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = await verifyToken(token);
    c.set("user", payload);
    c.set("tenantId", payload.tid);
    await next();
  } catch {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }, 401);
  }
});
