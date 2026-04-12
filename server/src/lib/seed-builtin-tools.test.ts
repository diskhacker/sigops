import { describe, it, expect, vi } from "vitest";
import {
  seedBuiltinTools,
  BUILTIN_TOOL_SPECS,
  BUILTIN_TOOL_VERSION,
} from "./seed-builtin-tools.js";

function makeDb(existingByName: Record<string, boolean> = {}) {
  const inserts: Array<Record<string, unknown>> = [];
  let nameFilter: string | undefined;

  const makeSelectChain = () => {
    const chain: Record<string, unknown> = {};
    chain.from = () => chain;
    chain.where = (cond: { _name?: string }) => {
      nameFilter = cond?._name;
      return chain;
    };
    chain.limit = () => {
      if (nameFilter && existingByName[nameFilter]) return Promise.resolve([{ id: "x" }]);
      return Promise.resolve([]);
    };
    return chain;
  };

  // drizzle eq(tools.name, spec.name) isn't captured; fake it via a proxy
  // wrapper: we intercept the where argument and extract the name string.
  const db = {
    select: () => makeSelectChain(),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserts.push(v);
        return Promise.resolve();
      },
    }),
  };
  return { db, inserts };
}

describe("seedBuiltinTools", () => {
  it("inserts all 5 built-in tools when none exist", async () => {
    const mockWhere = vi.fn(() => ({ limit: () => Promise.resolve([]) }));
    const db = {
      select: () => ({ from: () => ({ where: mockWhere }) }),
      insert: () => ({ values: () => Promise.resolve() }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await seedBuiltinTools(db);
    expect(result.inserted).toHaveLength(5);
    expect(result.skipped).toHaveLength(0);
    expect(result.inserted).toContain("sigops.http");
    expect(result.inserted).toContain("sigops.notify_slack");
    expect(result.inserted).toContain("sigops.wait");
    expect(result.inserted).toContain("sigops.restart");
    expect(result.inserted).toContain("sigops.condition");
  });

  it("skips already-existing tools (idempotent)", async () => {
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "e" }]) }) }) }),
      insert: () => ({ values: () => Promise.resolve() }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await seedBuiltinTools(db);
    expect(result.inserted).toHaveLength(0);
    expect(result.skipped).toHaveLength(5);
  });

  it("has correct built-in tool count and version", () => {
    expect(BUILTIN_TOOL_SPECS).toHaveLength(5);
    expect(BUILTIN_TOOL_VERSION).toBe("1.0.0");
  });

  it("every spec has name, description, and inputSchema", () => {
    for (const spec of BUILTIN_TOOL_SPECS) {
      expect(spec.name).toMatch(/^sigops\./);
      expect(spec.description.length).toBeGreaterThan(0);
      expect(typeof spec.inputSchema).toBe("object");
    }
  });
});
