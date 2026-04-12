/**
 * Seed built-in SEL tools into the tool registry.
 * Idempotent: skips entries already seeded for (name, version).
 * Tool registry is global (no tenant scope).
 */
import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "../db/index.js";
import { toolRegistry } from "../db/schema.js";

export const BUILTIN_TOOL_VERSION = "1.0.0";

export interface BuiltinToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, string>;
}

export const BUILTIN_TOOL_SPECS: BuiltinToolSpec[] = [
  {
    name: "sigops.http",
    description: "Make HTTP request",
    inputSchema: { url: "string", method: "string?", body: "object?", headers: "object?" },
  },
  {
    name: "sigops.notify_slack",
    description: "Send Slack notification",
    inputSchema: { channel: "string", message: "string" },
  },
  {
    name: "sigops.wait",
    description: "Wait N seconds",
    inputSchema: { seconds: "number" },
  },
  {
    name: "sigops.restart",
    description: "Restart a service via agent",
    inputSchema: { service: "string", method: "string?" },
  },
  {
    name: "sigops.condition",
    description: "Evaluate simple comparison expression",
    inputSchema: { expression: "string" },
  },
];

export interface SeedDb {
  select: typeof defaultDb.select;
  insert: typeof defaultDb.insert;
}

export interface SeedResult {
  inserted: string[];
  skipped: string[];
}

export async function seedBuiltinTools(
  database: SeedDb = defaultDb,
): Promise<SeedResult> {
  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const spec of BUILTIN_TOOL_SPECS) {
    const existing = await database
      .select()
      .from(toolRegistry)
      .where(
        and(
          eq(toolRegistry.name, spec.name),
          eq(toolRegistry.version, BUILTIN_TOOL_VERSION),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped.push(spec.name);
      continue;
    }
    await database.insert(toolRegistry).values({
      name: spec.name,
      version: BUILTIN_TOOL_VERSION,
      type: "builtin",
      inputSchema: spec.inputSchema,
      description: spec.description,
    });
    inserted.push(spec.name);
  }

  return { inserted, skipped };
}
