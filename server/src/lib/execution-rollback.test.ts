import { describe, it, expect, vi } from "vitest";
import { rollbackExecution, cancelExecution } from "./execution-rollback.js";

function makeDb(
  exec: Record<string, unknown> | null,
  steps: Array<Record<string, unknown>> = [],
) {
  const updates: Array<Record<string, unknown>> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    select: () => ({
      from: (table: unknown) => ({
        where: (cond: unknown) => {
          // First select is executions, subsequent are executionSteps
          if (exec && !("_stepsQueried" in db)) {
            db._stepsQueried = false;
            return {
              limit: () => Promise.resolve(exec ? [exec] : []),
            };
          }
          db._stepsQueried = true;
          return Promise.resolve(steps);
        },
      }),
    }),
    update: () => ({
      set: (vals: Record<string, unknown>) => ({
        where: () => {
          updates.push(vals);
          return Promise.resolve();
        },
      }),
    }),
  };
  return { db, updates };
}

describe("rollbackExecution", () => {
  it("rolls back a FAILED execution and transitions to ROLLED_BACK", async () => {
    const exec = { id: "e1", tenantId: "t1", status: "FAILED" };
    const steps = [
      { stepIndex: 0, toolName: "sigops.http", status: "SUCCESS", input: { url: "http://x" }, output: { status: 200 } },
      { stepIndex: 1, toolName: "sigops.restart", status: "SUCCESS", input: { service: "nginx" }, output: { ok: true } },
      { stepIndex: 2, toolName: "sigops.notify_slack", status: "FAILED", input: { channel: "#ops" }, output: null },
    ];

    let selectCalls = 0;
    const updates: Array<Record<string, unknown>> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCalls++;
            if (selectCalls === 1) {
              return { limit: () => Promise.resolve([exec]) };
            }
            return Promise.resolve(steps);
          },
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            updates.push(vals);
            return Promise.resolve();
          },
        }),
      }),
    };

    const rollbackHandlers = new Map<string, (input: Record<string, unknown>, output: unknown) => Promise<void>>();
    rollbackHandlers.set("sigops.restart", vi.fn(async () => {}));

    const result = await rollbackExecution("e1", "t1", rollbackHandlers, db);
    expect(result.previousStatus).toBe("FAILED");
    expect(result.newStatus).toBe("ROLLED_BACK");
    expect(result.stepsRolledBack).toBe(1); // only sigops.restart has handler
    expect(result.stepsSkipped).toBe(1); // sigops.http has no handler
    expect(result.errors).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0].status).toBe("ROLLED_BACK");
  });

  it("throws when execution is not FAILED", async () => {
    let selectCalls = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCalls++;
            return { limit: () => Promise.resolve([{ id: "e1", status: "SUCCESS" }]) };
          },
        }),
      }),
    };
    await expect(rollbackExecution("e1", "t1", new Map(), db)).rejects.toThrow(
      "Cannot rollback execution in status 'SUCCESS'",
    );
  });

  it("throws when execution not found", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      }),
    };
    await expect(rollbackExecution("e1", "t1", new Map(), db)).rejects.toThrow(
      "Execution e1 not found",
    );
  });

  it("captures rollback handler errors without throwing", async () => {
    const exec = { id: "e1", tenantId: "t1", status: "FAILED" };
    const steps = [
      { stepIndex: 0, toolName: "sigops.restart", status: "SUCCESS", input: { service: "nginx" }, output: {} },
    ];
    let selectCalls = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCalls++;
            if (selectCalls === 1) return { limit: () => Promise.resolve([exec]) };
            return Promise.resolve(steps);
          },
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    };

    const rollbackHandlers = new Map<string, (input: Record<string, unknown>, output: unknown) => Promise<void>>();
    rollbackHandlers.set("sigops.restart", vi.fn(async () => { throw new Error("rollback boom"); }));

    const result = await rollbackExecution("e1", "t1", rollbackHandlers, db);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("rollback boom");
  });
});

describe("cancelExecution", () => {
  it("cancels a PENDING execution", async () => {
    const updates: Array<Record<string, unknown>> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: "e1", status: "PENDING" }]),
          }),
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            updates.push(vals);
            return Promise.resolve();
          },
        }),
      }),
    };
    const result = await cancelExecution("e1", "t1", db);
    expect(result.newStatus).toBe("CANCELLED");
    expect(updates[0].status).toBe("CANCELLED");
  });

  it("throws when execution is already completed", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: "e1", status: "SUCCESS" }]),
          }),
        }),
      }),
    };
    await expect(cancelExecution("e1", "t1", db)).rejects.toThrow(
      "Cannot cancel execution in status 'SUCCESS'",
    );
  });
});
