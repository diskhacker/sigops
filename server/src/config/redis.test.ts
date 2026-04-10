import { describe, it, expect, vi } from "vitest";

vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue("PONG"),
  })),
}));

const { getRedis, closeRedis } = await import("./redis.js");

describe("redis config", () => {
  it("getRedis returns a redis client", async () => {
    const client = await getRedis();
    expect(client).toBeDefined();
    expect(typeof client.ping).toBe("function");
  });

  it("getRedis returns the same client on subsequent calls", async () => {
    const client1 = await getRedis();
    const client2 = await getRedis();
    expect(client1).toBe(client2);
  });

  it("closeRedis calls quit", async () => {
    await getRedis();
    await closeRedis();
  });
});
