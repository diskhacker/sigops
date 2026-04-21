import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRows: unknown[] = [];
vi.mock("../../db/index.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(mockRows),
        }),
      }),
    }),
  },
}));

const { computeWaterfall } = await import("./waterfall.service.js");

beforeEach(() => {
  mockRows.length = 0;
});

describe("computeWaterfall", () => {
  it("returns empty result when no steps", async () => {
    const result = await computeWaterfall("t-1", "e-1", new Date());
    expect(result.steps).toHaveLength(0);
    expect(result.total_ms).toBeNull();
  });

  it("waterfall field present in result", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T00:00:01Z");
    mockRows.push({
      id: "st-1",
      toolName: "fetch_signal",
      stepIndex: 0,
      status: "SUCCESS",
      startedAt: t0,
      completedAt: t1,
      durationMs: 1000,
    });
    const result = await computeWaterfall("t-1", "e-1", t0);
    expect(result.steps).toHaveLength(1);
    expect(result.total_ms).toBe(1000);
  });

  it("offset_ms is 0 for the first step when execution starts at same time", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T00:00:00.500Z");
    mockRows.push({
      id: "st-1",
      toolName: "step_a",
      stepIndex: 0,
      status: "SUCCESS",
      startedAt: t0,
      completedAt: t1,
      durationMs: 500,
    });
    const result = await computeWaterfall("t-1", "e-1", t0);
    expect(result.steps[0].offset_ms).toBe(0);
  });

  it("depth is 0 for top-level steps (flat schema)", async () => {
    const t0 = new Date();
    mockRows.push({
      id: "st-1",
      toolName: "step_a",
      stepIndex: 0,
      status: "SUCCESS",
      startedAt: t0,
      completedAt: t0,
      durationMs: 100,
    });
    const result = await computeWaterfall("t-1", "e-1", t0);
    expect(result.steps[0].depth).toBe(0);
  });
});
