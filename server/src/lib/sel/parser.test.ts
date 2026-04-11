import { describe, it, expect } from "vitest";
import { parseSel, SelParseError } from "./parser.js";

describe("parseSel", () => {
  it("ignores blank lines and comments", () => {
    const source = `
# this is a comment
# another

`;
    expect(parseSel(source)).toEqual([]);
  });

  it("parses a single tool call with args", () => {
    const steps = parseSel(`@sigops.wait {"seconds":2}`);
    expect(steps).toHaveLength(1);
    expect(steps[0].tool).toBe("sigops.wait");
    expect(steps[0].input).toEqual({ seconds: 2 });
    expect(steps[0].line).toBe(1);
  });

  it("parses multiple steps", () => {
    const source = `# header
@sigops.http {"url":"https://a.com","method":"GET"}
@sigops.wait {"seconds":1}
@sigops.notify_slack {"channel":"#x","message":"hi"}
`;
    const steps = parseSel(source);
    expect(steps.map((s) => s.tool)).toEqual([
      "sigops.http",
      "sigops.wait",
      "sigops.notify_slack",
    ]);
    expect(steps[0].line).toBe(2);
    expect(steps[2].line).toBe(4);
  });

  it("treats missing args as empty object", () => {
    const steps = parseSel("@my.tool");
    expect(steps[0].input).toEqual({});
  });

  it("rejects unknown syntax", () => {
    expect(() => parseSel("not a step")).toThrow(SelParseError);
  });

  it("rejects invalid JSON args", () => {
    expect(() => parseSel("@sigops.wait {seconds:2}")).toThrow(SelParseError);
  });

  it("rejects non-object args", () => {
    expect(() => parseSel("@sigops.wait [1,2,3]")).toThrow(SelParseError);
  });

  it("reports line numbers in errors", () => {
    try {
      parseSel("# ok\n@sigops.wait bad");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(SelParseError);
      expect((e as SelParseError).line).toBe(2);
    }
  });
});
