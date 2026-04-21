import { describe, it, expect, vi } from "vitest";
import type { SpikeDb } from "./spike-detector.js";

// minimal mock db builder
function makeDb(selectResults: unknown[][], insertSpy = vi.fn()): SpikeDb {
  let idx = 0;
  const chain = () => ({
    from: () => chain(),
    where: () => chain(),
    limit: () => chain(),
    orderBy: () => chain(),
    set: () => chain(),
    values: insertSpy,
    then: (ok: (v: unknown) => unknown) => Promise.resolve(selectResults[idx++] ?? []).then(ok),
  });
  return {
    select: chain,
    insert: () => ({ values: insertSpy }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([{}]) }) }),
    delete: () => ({}),
  } as unknown as SpikeDb;
}

const { runSpikeDetection, computeBaseline } = await import("./spike-detector.js");

describe("spike detector", () => {
  it("no spike when count below threshold × baseline", async () => {
    const insertSpy = vi.fn().mockResolvedValue([{}]);
    const db = makeDb([
      [{ id: "b1", tenantId: "t-1", metric: "signals_per_hour", baselineValue: "100", spikeThreshold: "3", windowMinutes: 60 }],
      [{ count: 200 }], // 200/100 = 2× < 3× threshold
    ], insertSpy);

    await runSpikeDetection(db);
    // No spike signal or notification should be inserted
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("spike detected when count exceeds threshold × baseline", async () => {
    const insertSpy = vi.fn().mockResolvedValue([{}]);
    const db = makeDb([
      [{ id: "b1", tenantId: "t-1", metric: "signals_per_hour", baselineValue: "50", spikeThreshold: "3", windowMinutes: 60 }],
      [{ count: 200 }], // 200/50 = 4× ≥ 3× threshold → spike
    ], insertSpy);

    await runSpikeDetection(db);
    expect(insertSpy).toHaveBeenCalledTimes(2); // spike signal + in_app notification
  });

  it("notify_customer writes in_app notification", async () => {
    const calls: unknown[] = [];
    const insertSpy = vi.fn().mockImplementation((v) => { calls.push(v); return Promise.resolve([{}]); });
    const db = makeDb([
      [{ id: "b1", tenantId: "t-1", metric: "signals_per_hour", baselineValue: "10", spikeThreshold: "3", windowMinutes: 60 }],
      [{ count: 50 }], // 50/10 = 5× spike
    ], insertSpy);

    await runSpikeDetection(db);
    const notifCall = calls.find((c: unknown) => (c as Record<string, unknown>).type === "spike_detected");
    expect(notifCall).toBeDefined();
    expect((notifCall as Record<string, unknown>).scope).toBe("tenant_admin");
  });

  it("baseline auto-computation produces correct rolling average", async () => {
    const insertSpy = vi.fn().mockResolvedValue([{}]);
    const db = makeDb([
      [{ count: 720 }], // 720 signals in 30 days
      [],               // no existing baseline
    ], insertSpy);

    const avg = await computeBaseline(db, "t-1", "signals_per_hour", 60);
    // 30 days × 24 hours = 720 windows → 720 / 720 = 1.0 per window
    expect(avg).toBeCloseTo(1.0, 5);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it("no spike when baseline is zero", async () => {
    const insertSpy = vi.fn().mockResolvedValue([{}]);
    const db = makeDb([
      [{ id: "b1", tenantId: "t-1", metric: "signals_per_hour", baselineValue: "0", spikeThreshold: "3", windowMinutes: 60 }],
      [{ count: 100 }],
    ], insertSpy);

    await runSpikeDetection(db);
    // multiplier = 0 when baseline = 0, so no spike
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
