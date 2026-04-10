import type { Context, Next } from "hono";

export async function requestId(c: Context, next: Next): Promise<void> {
  const id = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  await next();
}
