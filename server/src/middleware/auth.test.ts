import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireAuth } from "./auth.js";
import { signAccessToken } from "../modules/auth/jwt.js";
import { AppError } from "../lib/errors.js";

describe("requireAuth", () => {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ error: err.code }, err.status as 401);
    return c.json({ error: "E" }, 500);
  });
  app.use("*", requireAuth);
  app.get("/", (c) => c.json({ user: c.get("user" as never), tenantId: c.get("tenantId" as never) }));

  it("rejects missing header", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(401);
  });

  it("rejects non-bearer", async () => {
    const res = await app.request("/", { headers: { authorization: "Basic x" } });
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const res = await app.request("/", { headers: { authorization: "Bearer bogus" } });
    expect(res.status).toBe(401);
  });

  it("accepts valid token", async () => {
    const token = await signAccessToken({
      sub: "u1",
      tid: "t1",
      email: "a@b.c",
      name: "U",
      roles: ["admin"],
      perms: ["*"],
    });
    const res = await app.request("/", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe("t1");
  });
});
