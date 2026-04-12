import { describe, it, expect, vi } from "vitest";

vi.mock("bullmq", () => {
  const addMock = vi.fn();
  const closeMock = vi.fn();
  class Queue {
    add = addMock;
    close = closeMock;
  }
  class Worker {
    on = vi.fn();
  }
  return { Queue, Worker };
});

vi.mock("../config/env.js", () => ({ env: { REDIS_URL: "redis://localhost:6379" } }));
vi.mock("../config/logger.js", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { getQueue, enqueue, startWorker, closeAllQueues } = await import("./queue.js");

describe("queue", () => {
  it("getQueue memoises by name", () => {
    const a = getQueue("alpha");
    const b = getQueue("alpha");
    expect(a).toBe(b);
  });

  it("enqueue calls queue.add with defaults", async () => {
    await enqueue("beta", "job1", { x: 1 });
    expect((getQueue("beta") as unknown as { add: ReturnType<typeof vi.fn> }).add).toHaveBeenCalled();
  });

  it("startWorker returns a worker", () => {
    const w = startWorker("gamma", async () => undefined);
    expect(w).toBeDefined();
  });

  it("closeAllQueues resolves", async () => {
    await expect(closeAllQueues()).resolves.toBeUndefined();
  });
});
