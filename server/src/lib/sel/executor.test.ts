import { describe, it, expect, vi } from "vitest";
import { runSel } from "./executor.js";
import type { BuiltinTool, ToolContext } from "./builtin-tools.js";

const ctx: ToolContext = { tenantId: "t1", sleepImpl: async () => undefined };

describe("runSel", () => {
  it("runs all steps successfully", async () => {
    const source = `
# two steps
@sigops.wait {"seconds":0}
@sigops.notify_slack {"channel":"#x","message":"hi"}
`;
    const result = await runSel(source, { context: ctx });
    expect(result.status).toBe("SUCCESS");
    expect(result.steps).toHaveLength(2);
    expect(result.steps.every((s) => s.status === "SUCCESS")).toBe(true);
  });

  it("marks remaining steps as SKIPPED on failure", async () => {
    const source = `
@sigops.wait {"seconds":-1}
@sigops.wait {"seconds":0}
`;
    const result = await runSel(source, { context: ctx });
    expect(result.status).toBe("FAILED");
    expect(result.steps[0].status).toBe("FAILED");
    expect(result.steps[1].status).toBe("SKIPPED");
    expect(result.error).toBeDefined();
  });

  it("fails on unknown tool and skips rest", async () => {
    const source = `
@sigops.nope {}
@sigops.wait {"seconds":0}
`;
    const result = await runSel(source, { context: ctx });
    expect(result.status).toBe("FAILED");
    expect(result.steps[0].error).toMatch(/unknown tool/);
    expect(result.steps[1].status).toBe("SKIPPED");
  });

  it("returns FAILED on parse error", async () => {
    const result = await runSel("garbage line", { context: ctx });
    expect(result.status).toBe("FAILED");
    expect(result.steps).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("accepts a custom registry", async () => {
    const executed = vi.fn(async () => ({ hello: "world" }));
    const custom: BuiltinTool = {
      name: "custom.tool",
      description: "test",
      schema: {} as BuiltinTool["schema"],
      execute: executed,
    };
    const registry = new Map<string, BuiltinTool>([["custom.tool", custom]]);
    const result = await runSel(`@custom.tool {"a":1}`, {
      context: ctx,
      registry,
    });
    expect(result.status).toBe("SUCCESS");
    expect(executed).toHaveBeenCalledWith({ a: 1 }, ctx);
    expect(result.steps[0].output).toEqual({ hello: "world" });
  });
});
