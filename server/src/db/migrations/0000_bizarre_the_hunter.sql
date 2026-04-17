CREATE TYPE "public"."agent_status" AS ENUM('ONLINE', 'DEGRADED', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."exec_status" AS ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'ROLLED_BACK', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "agent_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"version" text,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"hostname" text NOT NULL,
	"ip_address" text,
	"os" text,
	"agent_version" text NOT NULL,
	"status" "agent_status" DEFAULT 'ONLINE' NOT NULL,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"labels" jsonb DEFAULT '{}'::jsonb,
	"last_heartbeat" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"tool_name" text NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"status" "step_status" DEFAULT 'PENDING' NOT NULL,
	"agent_id" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"signal_id" text,
	"agent_id" text,
	"status" "exec_status" DEFAULT 'PENDING' NOT NULL,
	"trigger_type" text NOT NULL,
	"triggered_by" text,
	"risk_score" jsonb,
	"error" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"condition" jsonb NOT NULL,
	"workflow_id" text,
	"dedup_window_sec" integer DEFAULT 300,
	"suppress_window_sec" integer,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source" text NOT NULL,
	"severity" "severity" NOT NULL,
	"title" text NOT NULL,
	"body" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"status" "signal_status" DEFAULT 'OPEN' NOT NULL,
	"matched_workflow_id" text,
	"matched_at" timestamp,
	"resolved_at" timestamp,
	"resolved_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"is_active" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"last_run_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sel_code" text NOT NULL,
	"trigger_rules" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_agent_tools_agent" ON "agent_tools" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_tools_tenant" ON "agent_tools" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_tenant_status" ON "agents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_exec_steps_execution" ON "execution_steps" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "exec_tenant_created" ON "executions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "exec_status" ON "executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_signal_rules_tenant" ON "signal_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sig_tenant_created" ON "signals" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "sig_fingerprint" ON "signals" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "sig_status" ON "signals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_name_version" ON "tool_registry" USING btree ("name","version");--> statement-breakpoint
CREATE INDEX "ws_active_next" ON "workflow_schedules" USING btree ("is_active","next_run_at");--> statement-breakpoint
CREATE INDEX "wf_tenant_active" ON "workflows" USING btree ("tenant_id","is_active");