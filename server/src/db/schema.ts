import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
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

export const signals = pgTable(
  "signals",
  {
    id: id(),
    tenantId: tenantId(),
    source: text("source").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    body: jsonb("body").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").notNull().default("OPEN"),
    matchedWorkflowId: text("matched_workflow_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("idx_signals_tenant").on(t.tenantId),
    index("idx_signals_fingerprint").on(t.fingerprint),
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
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_workflows_tenant").on(t.tenantId)],
);

export const executions = pgTable(
  "executions",
  {
    id: id(),
    tenantId: tenantId(),
    workflowId: text("workflow_id").notNull(),
    signalId: text("signal_id"),
    status: text("status").notNull().default("PENDING"),
    triggerType: text("trigger_type").notNull(),
    steps: jsonb("steps").notNull().default([]),
    currentStep: text("current_step"),
    error: jsonb("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_executions_tenant").on(t.tenantId)],
);

export const agents = pgTable(
  "agents",
  {
    id: id(),
    tenantId: tenantId(),
    hostname: text("hostname").notNull(),
    ipAddress: text("ip_address"),
    os: text("os"),
    version: text("version").notNull(),
    status: text("status").notNull().default("ONLINE"),
    tools: jsonb("tools").notNull().default([]),
    lastHeartbeat: timestamp("last_heartbeat"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_agents_tenant").on(t.tenantId)],
);

export const tools = pgTable(
  "tool_registry",
  {
    id: id(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    type: text("type").notNull(),
    schema: jsonb("schema").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_tools_tenant").on(t.tenantId)],
);

export const signalRules = pgTable(
  "signal_rules",
  {
    id: id(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    pattern: jsonb("pattern").notNull(),
    workflowId: text("workflow_id").notNull(),
    priority: integer("priority").notNull().default(100),
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
    cron: text("cron").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_schedules_tenant").on(t.tenantId)],
);
