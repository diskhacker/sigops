/**
 * Agent gateway — manages agent connections, heartbeats, and status transitions.
 *
 * State machine: ONLINE ↔ DEGRADED → OFFLINE (no heartbeat for 3 min)
 *
 * - `handleHeartbeat(agentId)` updates lastHeartbeat + sets status to ONLINE
 * - `runHeartbeatCheck(now)` scans all agents, marks DEGRADED (>90s) or OFFLINE (>180s)
 */
import { and, eq, lt } from "drizzle-orm";
import { agents } from "../db/schema.js";
import { db as defaultDb } from "../db/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const DEGRADED_THRESHOLD_MS = 90_000; // 90 seconds
const OFFLINE_THRESHOLD_MS = 180_000; // 3 minutes

export interface HeartbeatPayload {
  agentId: string;
  tenantId: string;
  tools?: unknown[];
  labels?: Record<string, unknown>;
}

export interface HeartbeatResult {
  agentId: string;
  status: string;
  lastHeartbeat: Date;
}

export interface HeartbeatCheckResult {
  checked: number;
  degraded: number;
  offline: number;
}

export async function handleHeartbeat(
  payload: HeartbeatPayload,
  now: Date = new Date(),
  database: Db = defaultDb,
): Promise<HeartbeatResult> {
  const updates: {
    lastHeartbeat: Date;
    status: "ONLINE";
    tools?: unknown[];
    labels?: Record<string, unknown>;
  } = {
    lastHeartbeat: now,
    status: "ONLINE",
  };
  if (payload.tools !== undefined) updates.tools = payload.tools;
  if (payload.labels !== undefined) updates.labels = payload.labels;

  const [row] = await database
    .update(agents)
    .set(updates)
    .where(
      and(
        eq(agents.id, payload.agentId),
        eq(agents.tenantId, payload.tenantId),
      ),
    )
    .returning();

  if (!row) {
    // Agent not registered — create it
    const [created] = await database
      .insert(agents)
      .values({
        id: payload.agentId,
        tenantId: payload.tenantId,
        hostname: payload.agentId,
        agentVersion: "unknown",
        status: "ONLINE",
        lastHeartbeat: now,
        tools: payload.tools ?? [],
        labels: payload.labels ?? {},
      })
      .returning();
    return {
      agentId: created.id,
      status: created.status,
      lastHeartbeat: now,
    };
  }

  return { agentId: row.id, status: "ONLINE", lastHeartbeat: now };
}

export function classifyAgentStatus(
  lastHeartbeat: Date | null,
  now: Date,
): "ONLINE" | "DEGRADED" | "OFFLINE" {
  if (!lastHeartbeat) return "OFFLINE";
  const elapsed = now.getTime() - lastHeartbeat.getTime();
  if (elapsed >= OFFLINE_THRESHOLD_MS) return "OFFLINE";
  if (elapsed >= DEGRADED_THRESHOLD_MS) return "DEGRADED";
  return "ONLINE";
}

export async function runHeartbeatCheck(
  now: Date = new Date(),
  database: Db = defaultDb,
): Promise<HeartbeatCheckResult> {
  const degradedCutoff = new Date(now.getTime() - DEGRADED_THRESHOLD_MS);
  const offlineCutoff = new Date(now.getTime() - OFFLINE_THRESHOLD_MS);

  // Mark agents OFFLINE whose last heartbeat is older than 3 min
  const offlineRows = await database
    .update(agents)
    .set({ status: "OFFLINE" })
    .where(
      and(
        lt(agents.lastHeartbeat, offlineCutoff),
        eq(agents.status, "ONLINE"),
      ),
    )
    .returning();

  const degradedFromOnline = await database
    .update(agents)
    .set({ status: "OFFLINE" })
    .where(
      and(
        lt(agents.lastHeartbeat, offlineCutoff),
        eq(agents.status, "DEGRADED"),
      ),
    )
    .returning();

  // Mark agents DEGRADED whose last heartbeat is 90s–180s old
  const degradedRows = await database
    .update(agents)
    .set({ status: "DEGRADED" })
    .where(
      and(
        lt(agents.lastHeartbeat, degradedCutoff),
        eq(agents.status, "ONLINE"),
      ),
    )
    .returning();

  return {
    checked:
      offlineRows.length + degradedFromOnline.length + degradedRows.length,
    degraded: degradedRows.length,
    offline: offlineRows.length + degradedFromOnline.length,
  };
}
