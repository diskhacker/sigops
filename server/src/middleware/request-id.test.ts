import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requestId } from "./request-id.js";

describe("requestId middleware", () => {
  const app = new Hono();
  app.use("*", requestId);
  app.get("/test", (c) => c.json({ requestId: c.get("requestId") }));

  it("generates a request ID when none provided", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(200);
    const rid = res.headers.get("x-request-id");
    expect(rid).toBeDefined();
    expect(rid!.length).toBeGreaterThan(0);
  });

  it("uses provided x-request-id header", async () => {
    const res = await app.request("/test", {
      headers: { "x-request-id": "my-custom-id-123" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("my-custom-id-123");
    const body = await res.json();
    expect(body.requestId).toBe("my-custom-id-123");
  });

  it("sets requestId in context", async () => {
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe("string");
  });
});
