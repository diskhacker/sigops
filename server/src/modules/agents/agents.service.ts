import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { agents } from "../../db/schema.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  type Pagination,
  getOffset,
  buildPageResponse,
} from "../../lib/pagination.js";
import { handleHeartbeat as gatewayHeartbeat } from "../../lib/agent-gateway.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterAgentInput {
  hostname: string;
  ipAddress?: string;
  os?: string;
  agentVersion: string;
  status?: "ONLINE" | "DEGRADED" | "OFFLINE";
  labels?: Record<string, unknown>;
}

export interface UpdateAgentInput {
  status?: "ONLINE" | "DEGRADED" | "OFFLINE";
  tools?: unknown[];
  labels?: Record<string, unknown>;
  lastHeartbeat?: Date;
}

export interface AgentFilters {
  status?: "ONLINE" | "DEGRADED" | "OFFLINE";
}

export interface HeartbeatMetadata {
  tools?: unknown[];
  labels?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function registerAgent(
  tenantId: string,
  input: RegisterAgentInput,
) {
  const [row] = await db
    .insert(agents)
    .values({ ...input, tenantId })
    .returning();
  return row;
}

export async function heartbeat(agentId: string, tenantId: string, metadata: HeartbeatMetadata) {
  return gatewayHeartbeat({
    agentId,
    tenantId,
    tools: metadata.tools,
    labels: metadata.labels,
  });
}

export async function listAgents(
  tenantId: string,
  pagination: Pagination,
  filters: AgentFilters,
) {
  const conds = [eq(agents.tenantId, tenantId)];
  if (filters.status) conds.push(eq(agents.status, filters.status));

  const items = await db
    .select()
    .from(agents)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(and(...conds));

  return buildPageResponse(items, count, pagination);
}

export async function getAgent(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Agent");
  return row;
}

export async function updateAgent(
  tenantId: string,
  id: string,
  input: UpdateAgentInput,
) {
  const [row] = await db
    .update(agents)
    .set(input)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Agent");
  return row;
}

export async function deactivateAgent(tenantId: string, id: string) {
  const [row] = await db
    .update(agents)
    .set({ status: "OFFLINE" })
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Agent");
  return row;
}

export async function deleteAgent(tenantId: string, id: string) {
  const [row] = await db
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Agent");
  return row;
}
