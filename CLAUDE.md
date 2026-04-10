# SigOps — Infrastructure Execution OS

> Open Source Core (MIT) + Proprietary Cloud. Rust Agent. SEL Language.

## Product Identity

| Key | Value |
|-----|-------|
| Repo | `sigops-core` (backend+frontend), `sigops-agent` (Rust) |
| Product ID | `sigops` |
| Port | Backend: 4200, Frontend: 4201 |
| Entity | SigOps Technologies Pvt Ltd |
| Status | **EXISTS** — Phase 1 backend built |
| License | MIT (core), Proprietary (cloud features) |

## Architecture Reference
See `/docs/architecture/SigOps-Architecture-v1.2.0.pdf`

## PROTOCOLS — MANDATORY
```
AUDIT → REVIEW → CONFIRM → REUSE → IMPLEMENT
Feature = UI + Backend + Tests (>90%). All CRUD + SEARCH.
Session: /docs/session/ | Memory: /docs/memory/memory.md
```

## UAP Integration
Same pattern as all products. Product ID: `sigops`. Roles: sigops_admin (*), operator (signals/executions/workflows/tools), developer (read+workflows+sel), viewer (read-only).

---

## COMPLETE DRIZZLE SCHEMA (10 Tables)

```typescript
// src/db/schema.ts — ALL tables for SigOps
import { pgTable, text, integer, boolean, timestamp, jsonb, decimal, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import crypto from "crypto";

const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const tenantRef = () => text("tenant_id").notNull();

export const severityEnum = pgEnum("severity", ["critical", "warning", "info"]);
export const signalStatusEnum = pgEnum("signal_status", ["OPEN", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"]);
export const execStatusEnum = pgEnum("exec_status", ["PENDING", "RUNNING", "SUCCESS", "FAILED", "ROLLED_BACK", "CANCELLED"]);
export const stepStatusEnum = pgEnum("step_status", ["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"]);
export const agentStatusEnum = pgEnum("agent_status", ["ONLINE", "DEGRADED", "OFFLINE"]);

export const signals = pgTable("signals", {
  id: uuid(), tenantId: tenantRef(),
  source: text("source").notNull(),                    // prometheus, grafana, datadog, webhook, email
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),                       // raw signal payload
  fingerprint: text("fingerprint").notNull(),          // SHA-256 for dedup
  status: signalStatusEnum("status").default("OPEN").notNull(),
  matchedWorkflowId: text("matched_workflow_id"),
  matchedAt: timestamp("matched_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),                     // user ID or "auto"
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("sig_tenant_created").on(t.tenantId, t.createdAt),
  index("sig_fingerprint").on(t.fingerprint),
  index("sig_status").on(t.status),
]);

export const signalRules = pgTable("signal_rules", {
  id: uuid(), tenantId: tenantRef(),
  name: text("name").notNull(),
  description: text("description"),
  condition: jsonb("condition").notNull(),              // { source?, severity_gte?, title_regex?, body_jsonpath? }
  workflowId: text("workflow_id"),                     // auto-trigger
  dedupWindowSec: integer("dedup_window_sec").default(300),
  suppressWindowSec: integer("suppress_window_sec"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: uuid(), tenantId: tenantRef(),
  name: text("name").notNull(),
  description: text("description"),
  selCode: text("sel_code").notNull(),                 // SEL source code
  triggerRules: jsonb("trigger_rules").notNull(),       // signal matching rules
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1),
  tags: jsonb("tags").default([]),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("wf_tenant_active").on(t.tenantId, t.isActive)]);

export const executions = pgTable("executions", {
  id: uuid(), tenantId: tenantRef(),
  workflowId: text("workflow_id").notNull(),
  signalId: text("signal_id"),
  agentId: text("agent_id"),
  status: execStatusEnum("status").default("PENDING").notNull(),
  triggerType: text("trigger_type").notNull(),          // signal/manual/schedule
  triggeredBy: text("triggered_by"),
  riskScore: jsonb("risk_score"),                       // { level, factors[] }
  error: jsonb("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("exec_tenant_created").on(t.tenantId, t.createdAt),
  index("exec_status").on(t.status),
]);

export const executionSteps = pgTable("execution_steps", {
  id: uuid(),
  executionId: text("execution_id").notNull(),
  stepIndex: integer("step_index").notNull(),
  toolName: text("tool_name").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  status: stepStatusEnum("status").default("PENDING").notNull(),
  agentId: text("agent_id"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  error: text("error"),
  retryCount: integer("retry_count").default(0),
});

export const agents = pgTable("agents", {
  id: uuid(), tenantId: tenantRef(),
  hostname: text("hostname").notNull(),
  ipAddress: text("ip_address"),
  os: text("os"),
  agentVersion: text("agent_version").notNull(),
  status: agentStatusEnum("status").default("ONLINE").notNull(),
  tools: jsonb("tools").default([]),                   // discovered tool list
  labels: jsonb("labels").default({}),                 // { env: "prod", region: "us-east" }
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("agent_tenant_status").on(t.tenantId, t.status)]);

export const agentTools = pgTable("agent_tools", {
  id: uuid(),
  agentId: text("agent_id").notNull(),
  toolName: text("tool_name").notNull(),
  version: text("version"),
  capabilities: jsonb("capabilities").default([]),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
});

export const toolRegistry = pgTable("tool_registry", {
  id: uuid(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  type: text("type").notNull(),                        // builtin/custom
  description: text("description"),
  inputSchema: jsonb("input_schema").notNull(),         // JSON Schema for inputs
  outputSchema: jsonb("output_schema"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("tool_name_version").on(t.name, t.version)]);

export const workflowSchedules = pgTable("workflow_schedules", {
  id: uuid(), tenantId: tenantRef(),
  workflowId: text("workflow_id").notNull(),
  cronExpression: text("cron_expression").notNull(),
  timezone: text("timezone").default("UTC"),
  isActive: boolean("is_active").default(true).notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("ws_active_next").on(t.isActive, t.nextRunAt)]);
```

## KEY VALIDATION SCHEMAS

```typescript
export const ingestSignalSchema = z.object({
  source: z.string().min(1),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1).max(500),
  body: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  selCode: z.string().min(1),                          // validated by SEL parser
  triggerRules: z.object({
    source: z.string().optional(),
    severityGte: z.enum(["info", "warning", "critical"]).optional(),
    titleMatch: z.string().optional(),
  }),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

export const triggerExecutionSchema = z.object({
  workflowId: z.string().uuid(),
  params: z.record(z.unknown()).optional(),
});

export const createSignalRuleSchema = z.object({
  name: z.string().min(1),
  condition: z.object({
    source: z.string().optional(),
    severityGte: z.enum(["info","warning","critical"]).optional(),
    titleRegex: z.string().optional(),
    bodyJsonpath: z.string().optional(),
  }),
  workflowId: z.string().uuid().optional(),
  dedupWindowSec: z.number().int().min(0).default(300),
  isActive: z.boolean().default(true),
});
```

## STATE MACHINES

### Signal: OPEN → ACKNOWLEDGED → RESOLVED / SUPPRESSED
### Execution: PENDING → RUNNING → SUCCESS / FAILED → ROLLED_BACK
### Agent: ONLINE ↔ DEGRADED → OFFLINE (no heartbeat 3min)

## BUILT-IN TOOLS (5)

```typescript
const BUILTIN_TOOLS = [
  { name: "sigops.restart", description: "Restart a service via agent", inputSchema: { service: "string", method: "string?" } },
  { name: "sigops.http", description: "Make HTTP request", inputSchema: { url: "string", method: "string", body: "object?" } },
  { name: "sigops.notify_slack", description: "Send Slack notification", inputSchema: { channel: "string", message: "string" } },
  { name: "sigops.wait", description: "Wait N seconds", inputSchema: { seconds: "number" } },
  { name: "sigops.condition", description: "Evaluate condition", inputSchema: { expression: "string" } },
];
```

## MODULE BUILD ORDER
```
1. Config + DB + Health
2. Signal ingestion (webhook + Prometheus adapter)
3. Signal rules engine (matching + dedup)
4. SEL parser + evaluator
5. Execution engine (closed loop)
6. Agent WebSocket gateway
7. Tool registry
8. Workflow CRUD + scheduler
9. Stats/dashboard API
10. React dashboard (signals, executions, agents, workflows)
```
