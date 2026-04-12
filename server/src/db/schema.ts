import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const tenantId = () => text("tenant_id").notNull();
const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

export const severityEnum = pgEnum("severity", [
  "critical",
  "warning",
  "info",
]);
export const signalStatusEnum = pgEnum("signal_status", [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "SUPPRESSED",
]);
export const execStatusEnum = pgEnum("exec_status", [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "ROLLED_BACK",
  "CANCELLED",
]);
export const stepStatusEnum = pgEnum("step_status", [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
]);
export const agentStatusEnum = pgEnum("agent_status", [
  "ONLINE",
  "DEGRADED",
  "OFFLINE",
]);

export const signals = pgTable(
  "signals",
  {
    id: id(),
    tenantId: tenantId(),
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("sig_tenant_created").on(t.tenantId, t.createdAt),
    index("sig_fingerprint").on(t.fingerprint),
    index("sig_status").on(t.status),
  ],
);

export const workflows = pgTable(
  "workflows",
  {
    id: id(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    description: text("description"),
    selCode: text("sel_code").notNull(),
    triggerRules: jsonb("trigger_rules").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    tags: jsonb("tags").default([]),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("wf_tenant_active").on(t.tenantId, t.isActive)],
);

export const executions = pgTable(
  "executions",
  {
    id: id(),
    tenantId: tenantId(),
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("exec_tenant_created").on(t.tenantId, t.createdAt),
    index("exec_status").on(t.status),
  ],
);

export const agents = pgTable(
  "agents",
  {
    id: id(),
    tenantId: tenantId(),
    hostname: text("hostname").notNull(),
    ipAddress: text("ip_address"),
    os: text("os"),
    agentVersion: text("agent_version").notNull(),
    status: agentStatusEnum("status").default("ONLINE").notNull(),
    tools: jsonb("tools").default([]),
    labels: jsonb("labels").default({}),
    lastHeartbeat: timestamp("last_heartbeat"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("agent_tenant_status").on(t.tenantId, t.status)],
);

export const toolRegistry = pgTable(
  "tool_registry",
  {
    id: id(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    inputSchema: jsonb("input_schema").notNull(),
    outputSchema: jsonb("output_schema"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tool_name_version").on(t.name, t.version)],
);

export const signalRules = pgTable(
  "signal_rules",
  {
    id: id(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    description: text("description"),
    condition: jsonb("condition").notNull(),
    workflowId: text("workflow_id"),
    dedupWindowSec: integer("dedup_window_sec").default(300),
    suppressWindowSec: integer("suppress_window_sec"),
    priority: integer("priority").default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_signal_rules_tenant").on(t.tenantId)],
);

export const workflowSchedules = pgTable(
  "workflow_schedules",
  {
    id: id(),
    tenantId: tenantId(),
    workflowId: text("workflow_id").notNull(),
    cronExpression: text("cron_expression").notNull(),
    timezone: text("timezone").default("UTC"),
    isActive: boolean("is_active").notNull().default(true),
    nextRunAt: timestamp("next_run_at"),
    lastRunAt: timestamp("last_run_at"),
    lastRunStatus: text("last_run_status"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ws_active_next").on(t.isActive, t.nextRunAt)],
);

export const executionSteps = pgTable(
  "execution_steps",
  {
    id: id(),
    tenantId: tenantId(),
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
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_exec_steps_execution").on(t.executionId),
  ],
);

export const agentTools = pgTable(
  "agent_tools",
  {
    id: id(),
    tenantId: tenantId(),
    agentId: text("agent_id").notNull(),
    toolName: text("tool_name").notNull(),
    version: text("version"),
    capabilities: jsonb("capabilities").notNull().default([]),
    discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_agent_tools_agent").on(t.agentId),
    index("idx_agent_tools_tenant").on(t.tenantId),
  ],
);
