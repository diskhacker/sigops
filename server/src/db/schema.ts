import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import crypto from "crypto";

const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const tenantRef = () => text("tenant_id").notNull();

export const severityEnum = pgEnum("severity", ["critical", "warning", "info"]);
export const signalStatusEnum = pgEnum("signal_status", ["OPEN", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"]);
export const execStatusEnum = pgEnum("exec_status", ["PENDING", "RUNNING", "SUCCESS", "FAILED", "ROLLED_BACK", "CANCELLED"]);
export const stepStatusEnum = pgEnum("step_status", ["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"]);
export const agentStatusEnum = pgEnum("agent_status", ["ONLINE", "DEGRADED", "OFFLINE"]);

export const signals = pgTable("signals", {
  id: uuid(),
  tenantId: tenantRef(),
  source: text("source").notNull(),
  severity: severityEnum("severity").notNull(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  fingerprint: text("fingerprint").notNull(),
  status: signalStatusEnum("status").default("OPEN").notNull(),
  matchedWorkflowId: text("matched_workflow_id"),
  matchedAt: timestamp("matched_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("sig_tenant_created").on(t.tenantId, t.createdAt),
  index("sig_fingerprint").on(t.fingerprint),
  index("sig_status").on(t.status),
]);

export const signalRules = pgTable("signal_rules", {
  id: uuid(),
  tenantId: tenantRef(),
  name: text("name").notNull(),
  description: text("description"),
  condition: jsonb("condition").notNull(),
  workflowId: text("workflow_id"),
  dedupWindowSec: integer("dedup_window_sec").default(300),
  suppressWindowSec: integer("suppress_window_sec"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: uuid(),
  tenantId: tenantRef(),
  name: text("name").notNull(),
  description: text("description"),
  selCode: text("sel_code").notNull(),
  triggerRules: jsonb("trigger_rules").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1),
  tags: jsonb("tags").default([]),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("wf_tenant_active").on(t.tenantId, t.isActive)]);

export const executions = pgTable("executions", {
  id: uuid(),
  tenantId: tenantRef(),
  workflowId: text("workflow_id").notNull(),
  signalId: text("signal_id"),
  agentId: text("agent_id"),
  status: execStatusEnum("status").default("PENDING").notNull(),
  triggerType: text("trigger_type").notNull(),
  triggeredBy: text("triggered_by"),
  riskScore: jsonb("risk_score"),
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
  id: uuid(),
  tenantId: tenantRef(),
  hostname: text("hostname").notNull(),
  ipAddress: text("ip_address"),
  os: text("os"),
  agentVersion: text("agent_version").notNull(),
  status: agentStatusEnum("status").default("ONLINE").notNull(),
  tools: jsonb("tools").default([]),
  labels: jsonb("labels").default({}),
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
  type: text("type").notNull(),
  description: text("description"),
  inputSchema: jsonb("input_schema").notNull(),
  outputSchema: jsonb("output_schema"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("tool_name_version").on(t.name, t.version)]);

export const workflowSchedules = pgTable("workflow_schedules", {
  id: uuid(),
  tenantId: tenantRef(),
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
