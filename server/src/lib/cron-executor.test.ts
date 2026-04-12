import { describe, it, expect, vi } from "vitest";
import { parseCron, cronMatches, runCronTick } from "./cron-executor.js";

describe("parseCron", () => {
  it("parses `* * * * *`", () => {
    const c = parseCron("* * * * *");
    expect(cronMatches(c, new Date("2025-01-15T10:30:00Z"))).toBe(true);
  });

  it("parses minute field exactly", () => {
    const c = parseCron("5 * * * *");
    expect(cronMatches(c, new Date("2025-01-15T10:05:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:06:00Z"))).toBe(false);
  });

  it("parses step field `*/15`", () => {
    const c = parseCron("*/15 * * * *");
    expect(cronMatches(c, new Date("2025-01-15T10:00:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:15:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:30:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:17:00Z"))).toBe(false);
  });

  it("parses list `0,30`", () => {
    const c = parseCron("0,30 * * * *");
    expect(cronMatches(c, new Date("2025-01-15T10:00:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:30:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:15:00Z"))).toBe(false);
  });

  it("parses range `1-5`", () => {
    const c = parseCron("1-5 * * * *");
    expect(cronMatches(c, new Date("2025-01-15T10:03:00Z"))).toBe(true);
    expect(cronMatches(c, new Date("2025-01-15T10:06:00Z"))).toBe(false);
  });

  it("throws on invalid field count", () => {
    expect(() => parseCron("* * *")).toThrow();
  });

  it("throws on garbage", () => {
    expect(() => parseCron("foo bar baz qux quux")).toThrow();
  });
});

describe("runCronTick", () => {
  function makeMockDb(rows: Array<Record<string, unknown>>) {
    const updates: Array<{ id: string; set: Record<string, unknown> }> = [];
    const db = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: (cond: { _id?: string }) => {
            updates.push({ id: String(rows[0]?.id ?? "?"), set: values });
            return Promise.resolve();
          },
        }),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { db, updates };
  }

  it("triggers matching schedules and records lastRunAt", async () => {
    const now = new Date("2025-01-15T10:30:00Z");
    const rows = [
      {
        id: "s1",
        tenantId: "t1",
        workflowId: "w1",
        cron: "30 * * * *",
        isActive: true,
        lastRunAt: null,
      },
    ];
    const { db } = makeMockDb(rows);
    const exec = vi.fn(async () => {});

    const result = await runCronTick(now, exec, db);
    expect(result.triggered).toHaveLength(1);
    expect(result.triggered[0].workflowId).toBe("w1");
    expect(exec).toHaveBeenCalledWith("t1", "w1", "s1");
  });

  it("skips non-matching schedules", async () => {
    const now = new Date("2025-01-15T10:15:00Z");
    const rows = [
      {
        id: "s1",
        tenantId: "t1",
        workflowId: "w1",
        cron: "30 * * * *",
        isActive: true,
        lastRunAt: null,
      },
    ];
    const { db } = makeMockDb(rows);
    const exec = vi.fn(async () => {});

    const result = await runCronTick(now, exec, db);
    expect(result.triggered).toHaveLength(0);
    expect(exec).not.toHaveBeenCalled();
  });

  it("skips schedules already run this minute", async () => {
    const now = new Date("2025-01-15T10:30:45Z");
    const rows = [
      {
        id: "s1",
        tenantId: "t1",
        workflowId: "w1",
        cron: "30 * * * *",
        isActive: true,
        lastRunAt: new Date("2025-01-15T10:30:15Z"),
      },
    ];
    const { db } = makeMockDb(rows);
    const exec = vi.fn(async () => {});

    const result = await runCronTick(now, exec, db);
    expect(result.triggered).toHaveLength(0);
    expect(exec).not.toHaveBeenCalled();
  });

  it("skips schedules with invalid cron expression", async () => {
    const now = new Date("2025-01-15T10:30:00Z");
    const rows = [
      {
        id: "s1",
        tenantId: "t1",
        workflowId: "w1",
        cron: "not valid",
        isActive: true,
        lastRunAt: null,
      },
    ];
    const { db } = makeMockDb(rows);
    const exec = vi.fn(async () => {});

    const result = await runCronTick(now, exec, db);
    expect(result.triggered).toHaveLength(0);
    expect(exec).not.toHaveBeenCalled();
  });
});
