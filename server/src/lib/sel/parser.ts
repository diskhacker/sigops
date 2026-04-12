/**
 * SEL (SigOps Execution Language) parser.
 *
 * Grammar (line-based):
 *   # comment line
 *   @<tool.name> <json-args>
 *
 * Example:
 *   # Restart the web service after an alert
 *   @sigops.http {"url":"https://api.example.com/health","method":"GET"}
 *   @sigops.wait {"seconds":2}
 *   @sigops.restart {"service":"nginx"}
 *   @sigops.notify_slack {"channel":"#alerts","message":"Restarted nginx"}
 */

export interface SelStep {
  tool: string;
  input: Record<string, unknown>;
  line: number;
}

export class SelParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`SEL parse error (line ${line}): ${message}`);
    this.name = "SelParseError";
  }
}

const TOOL_RE = /^@([a-zA-Z_][a-zA-Z0-9_.]*)\s*(.*)$/;

export function parseSel(source: string): SelStep[] {
  const steps: SelStep[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = i + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const m = trimmed.match(TOOL_RE);
    if (!m) {
      throw new SelParseError(
        `expected '@<tool> <json>' but got: ${trimmed}`,
        line,
      );
    }
    const tool = m[1];
    const argsStr = m[2].trim();
    let input: unknown;
    if (argsStr === "") {
      input = {};
    } else {
      try {
        input = JSON.parse(argsStr);
      } catch (e) {
        throw new SelParseError(
          `invalid JSON args: ${(e as Error).message}`,
          line,
        );
      }
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new SelParseError("tool args must be a JSON object", line);
    }
    steps.push({ tool, input: input as Record<string, unknown>, line });
  }
  return steps;
}
