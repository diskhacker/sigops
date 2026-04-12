import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import health from "./health.js";

const app = new Hono().route("/health", health);

describe("health", () => {
  it("GET /health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("sigops");
  });

  it("GET /health/ready returns ready", async () => {
    const res = await app.request("/health/ready");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ready");
  });

  it("GET /health/live returns alive", async () => {
    const res = await app.request("/health/live");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("alive");
  });
});
