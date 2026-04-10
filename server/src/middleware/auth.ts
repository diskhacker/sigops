import type { Context, Next } from "hono";
import { verifyToken } from "../modules/auth/jwt.js";
import { UnauthorizedError } from "../lib/errors.js";

export async function requireAuth(c: Context, next: Next): Promise<void> {
  const header = c.req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const token = header.slice(7);
  try {
    const payload = await verifyToken(token);
    c.set("user", payload);
    c.set("tenantId", payload.tid);
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
  await next();
}
