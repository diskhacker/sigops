/**
 * Built-in SigOps tools. Each tool has an input schema and an `execute`
 * function. Tests substitute fake implementations by passing a custom
 * `ToolRegistry` into `runSel`.
 */
import { z } from "zod";
import { logger } from "../../config/logger.js";

export interface ToolContext {
  tenantId: string;
  fetchImpl?: typeof fetch;
  slackWebhook?: (channel: string, message: string) => Promise<void>;
  sleepImpl?: (ms: number) => Promise<void>;
  restartImpl?: (service: string, method: string) => Promise<{ ok: boolean }>;
}

export interface BuiltinTool {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  execute: (
    input: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<unknown>;
}

const httpSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  body: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
});

const notifySchema = z.object({
  channel: z.string().min(1),
  message: z.string().min(1),
});

const waitSchema = z.object({
  seconds: z.number().nonnegative().max(3600),
});

const restartSchema = z.object({
  service: z.string().min(1),
  method: z.string().optional().default("systemctl"),
});

const conditionSchema = z.object({
  expression: z.string().min(1),
});

export const BUILTIN_TOOLS: BuiltinTool[] = [
  {
    name: "sigops.http",
    description: "Make HTTP request",
    schema: httpSchema,
    async execute(input, ctx) {
      const parsed = httpSchema.parse(input);
      const fetchFn = ctx.fetchImpl ?? fetch;
      const res = await fetchFn(parsed.url, {
        method: parsed.method,
        body: parsed.body ? JSON.stringify(parsed.body) : undefined,
        headers: {
          "content-type": "application/json",
          ...(parsed.headers ?? {}),
        },
      });
      let body: unknown = null;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        body = await res.json().catch(() => null);
      } else {
        body = await res.text().catch(() => null);
      }
      return { status: res.status, body };
    },
  },
  {
    name: "sigops.notify_slack",
    description: "Send Slack notification",
    schema: notifySchema,
    async execute(input, ctx) {
      const parsed = notifySchema.parse(input);
      if (ctx.slackWebhook) {
        await ctx.slackWebhook(parsed.channel, parsed.message);
      } else {
        logger.info({ channel: parsed.channel, message: parsed.message }, "slack notify (stub)");
      }
      return { delivered: true, channel: parsed.channel };
    },
  },
  {
    name: "sigops.wait",
    description: "Wait N seconds",
    schema: waitSchema,
    async execute(input, ctx) {
      const parsed = waitSchema.parse(input);
      const ms = Math.round(parsed.seconds * 1000);
      const sleep =
        ctx.sleepImpl ?? ((n: number) => new Promise((r) => setTimeout(r, n)));
      await sleep(ms);
      return { waitedMs: ms };
    },
  },
  {
    name: "sigops.restart",
    description: "Restart a service via agent",
    schema: restartSchema,
    async execute(input, ctx) {
      const parsed = restartSchema.parse(input);
      if (ctx.restartImpl) {
        return ctx.restartImpl(parsed.service, parsed.method);
      }
      // no real agent attached — return a stub result
      logger.info(
        { service: parsed.service, method: parsed.method },
        "restart stub",
      );
      return { ok: true, service: parsed.service, method: parsed.method };
    },
  },
  {
    name: "sigops.condition",
    description: "Evaluate condition",
    schema: conditionSchema,
    async execute(input) {
      const parsed = conditionSchema.parse(input);
      // Only allow simple comparisons on literal numbers or strings.
      // Example: "10 > 5", "'ok' == 'ok'"
      const m = parsed.expression.match(
        /^\s*('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)\s*(==|!=|<=|>=|<|>)\s*('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)\s*$/,
      );
      if (!m) {
        throw new Error(`unsupported condition: ${parsed.expression}`);
      }
      const parse = (v: string): string | number => {
        if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
        return v.slice(1, -1);
      };
      const lhs = parse(m[1]);
      const rhs = parse(m[3]);
      const op = m[2];
      let result: boolean;
      switch (op) {
        case "==":
          result = lhs === rhs;
          break;
        case "!=":
          result = lhs !== rhs;
          break;
        case "<":
          result = lhs < rhs;
          break;
        case ">":
          result = lhs > rhs;
          break;
        case "<=":
          result = lhs <= rhs;
          break;
        case ">=":
          result = lhs >= rhs;
          break;
        default:
          throw new Error(`bad op ${op}`);
      }
      return { result };
    },
  },
];

export function toolRegistry(): Map<string, BuiltinTool> {
  const map = new Map<string, BuiltinTool>();
  for (const t of BUILTIN_TOOLS) map.set(t.name, t);
  return map;
}
