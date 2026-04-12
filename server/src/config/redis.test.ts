import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = {
  isOpen: false,
  connect: vi.fn(async function (this: any) {
    this.isOpen = true;
  }),
  on: vi.fn(),
  quit: vi.fn(async function (this: any) {
    this.isOpen = false;
  }),
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockClient),
}));

beforeEach(() => {
  mockClient.isOpen = false;
  mockClient.connect.mockClear();
  mockClient.quit.mockClear();
  mockClient.on.mockClear();
});

describe("redis", () => {
  it("creates and reuses client", async () => {
    const { getRedis, closeRedis } = await import("./redis.js");
    const c1 = await getRedis();
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    const c2 = await getRedis();
    expect(c1).toBe(c2);
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    await closeRedis();
    expect(mockClient.quit).toHaveBeenCalled();
    await closeRedis();
  });

  it("registers error handler", async () => {
    const { getRedis, closeRedis } = await import("./redis.js");
    await getRedis();
    expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    const errHandler = mockClient.on.mock.calls.find((c) => c[0] === "error")?.[1];
    errHandler?.(new Error("boom"));
    await closeRedis();
  });
});
