import { describe, it, expect, vi } from "vitest";

vi.mock("../db/index.js", () => ({
  checkDbConnection: vi.fn().mockResolvedValue(true),
}));

vi.mock("../config/redis.js", () => ({
  getRedis: vi.fn().mockResolvedValue({ ping: vi.fn().mockResolvedValue("PONG") }),
}));

const { healthRoutes } = await import("./health.js");
const { Hono } = await import("hono");

function app() {
  const a = new Hono();
  a.route("/", healthRoutes);
  return a;
}

describe("health route", () => {
  it("returns healthy when all ok", async () => {
    const res = await app().request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.product).toBe("sigops");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.redis).toBe("ok");
  });

  it("returns degraded when db down", async () => {
    const { checkDbConnection } = await import("../db/index.js");
    vi.mocked(checkDbConnection).mockResolvedValueOnce(false);
    const res = await app().request("/health");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
  });

  it("returns degraded when redis down", async () => {
    const { getRedis } = await import("../config/redis.js");
    vi.mocked(getRedis).mockRejectedValueOnce(new Error("down"));
    const res = await app().request("/health");
    expect(res.status).toBe(503);
  });
});
