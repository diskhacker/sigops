import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireAuth } from "./auth.js";
import { signAccessToken } from "../modules/auth/jwt.js";

function createTestApp() {
  const app = new Hono();
  app.get("/protected", requireAuth, (c) => {
    const user = c.get("user");
    const tenantId = c.get("tenantId");
    return c.json({ user, tenantId });
  });
  return app;
}

describe("auth middleware", () => {
  const app = createTestApp();

  it("rejects requests without authorization header", async () => {
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with non-Bearer token", async () => {
    const res = await app.request("/protected", { headers: { authorization: "Basic abc123" } });
    expect(res.status).toBe(401);
  });

  it("rejects requests with invalid token", async () => {
    const res = await app.request("/protected", { headers: { authorization: "Bearer invalid-token" } });
    expect(res.status).toBe(401);
  });

  it("passes with valid token and sets context", async () => {
    const token = await signAccessToken({
      userId: "user-123",
      tenantId: "tenant-456",
      email: "test@example.com",
      name: "Test",
      roles: { sigops: ["operator"] },
      perms: { sigops: ["signals:*"] },
    });
    const res = await app.request("/protected", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.sub).toBe("user-123");
    expect(body.user.tid).toBe("tenant-456");
    expect(body.tenantId).toBe("tenant-456");
    expect(body.user.roles.sigops).toEqual(["operator"]);
  });
});
