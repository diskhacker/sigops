import { describe, it, expect, vi } from "vitest";

vi.mock("./db/index.js", () => ({
  db: {},
  checkDbConnection: vi.fn().mockResolvedValue(true),
}));

vi.mock("./config/redis.js", () => ({
  getRedis: vi.fn().mockResolvedValue({ ping: vi.fn().mockResolvedValue("PONG") }),
}));

vi.mock("./config/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { createApp } = await import("./app.js");

describe("createApp", () => {
  it("creates a Hono app instance", () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("mounts health route", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("mounts signals route (401)", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/signals");
    expect(res.status).toBe(401);
  });

  it("mounts workflows route (401)", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/workflows");
    expect(res.status).toBe(401);
  });

  it("sets x-request-id header", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/health");
    expect(res.headers.get("x-request-id")).toBeDefined();
  });
});
