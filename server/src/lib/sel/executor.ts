/**
 * Execution engine for SEL workflows. Takes parsed steps, runs each tool
 * sequentially, and returns a detailed result log. On any error, halts
 * execution and marks remaining steps as SKIPPED.
 */
import { parseSel, type SelStep } from "./parser.js";
import {
  toolRegistry,
  type BuiltinTool,
  type ToolContext,
} from "./builtin-tools.js";

export type StepResultStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export interface StepResult {
  tool: string;
  line: number;
  input: Record<string, unknown>;
  output: unknown;
  status: StepResultStatus;
  error?: string;
  durationMs: number;
}

export interface ExecutionResult {
  status: "SUCCESS" | "FAILED";
  steps: StepResult[];
  totalDurationMs: number;
  error?: string;
}

export interface RunSelOptions {
  context: ToolContext;
  registry?: Map<string, BuiltinTool>;
}

export async function runSel(
  source: string,
  options: RunSelOptions,
): Promise<ExecutionResult> {
  const registry = options.registry ?? toolRegistry();
  let steps: SelStep[];
  try {
    steps = parseSel(source);
  } catch (e) {
    return {
      status: "FAILED",
      steps: [],
      totalDurationMs: 0,
      error: (e as Error).message,
    };
  }

  return runSteps(steps, registry, options.context);
}

export async function runSteps(
  steps: SelStep[],
  registry: Map<string, BuiltinTool>,
  ctx: ToolContext,
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  const start = Date.now();
  let failed = false;
  let failureMessage: string | undefined;

  for (const step of steps) {
    if (failed) {
      results.push({
        tool: step.tool,
        line: step.line,
        input: step.input,
        output: null,
        status: "SKIPPED",
        durationMs: 0,
      });
      continue;
    }
    const stepStart = Date.now();
    const tool = registry.get(step.tool);
    if (!tool) {
      failed = true;
      failureMessage = `unknown tool '${step.tool}' at line ${step.line}`;
      results.push({
        tool: step.tool,
        line: step.line,
        input: step.input,
        output: null,
        status: "FAILED",
        error: failureMessage,
        durationMs: Date.now() - stepStart,
      });
      continue;
    }
    try {
      const output = await tool.execute(step.input, ctx);
      results.push({
        tool: step.tool,
        line: step.line,
        input: step.input,
        output,
        status: "SUCCESS",
        durationMs: Date.now() - stepStart,
      });
    } catch (e) {
      failed = true;
      failureMessage = (e as Error).message;
      results.push({
        tool: step.tool,
        line: step.line,
        input: step.input,
        output: null,
        status: "FAILED",
        error: failureMessage,
        durationMs: Date.now() - stepStart,
      });
    }
  }

  return {
    status: failed ? "FAILED" : "SUCCESS",
    steps: results,
    totalDurationMs: Date.now() - start,
    error: failureMessage,
  };
}
