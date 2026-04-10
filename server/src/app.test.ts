import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetMockDb, mockDb } from "./test/mock-db.js";

vi.mock("./db/index.js", () => ({ db: mockDb }));

const { createApp } = await import("./app.js");

beforeEach(() => resetMockDb());

describe("app", () => {
  it("serves health", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated signal request", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/signals");
    expect(res.status).toBe(401);
  });

  it("returns validation error JSON shape", async () => {
    const app = createApp();
    const { signAccessToken } = await import("./modules/auth/jwt.js");
    const token = await signAccessToken({
      sub: "u1",
      tid: "t1",
      email: "a@b.c",
      name: "U",
      roles: [],
      perms: [],
    });
    const res = await app.request("/api/v1/signals", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ source: "x" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("catches unknown errors", async () => {
    const app = createApp();
    app.get("/boom", () => {
      throw new Error("kaboom");
    });
    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
  });

  it("handles AppError and returns correct status/code", async () => {
    const app = createApp();
    const { NotFoundError } = await import("./lib/errors.js");
    app.get("/nf", () => {
      throw new NotFoundError("Thing");
    });
    const res = await app.request("/nf");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
