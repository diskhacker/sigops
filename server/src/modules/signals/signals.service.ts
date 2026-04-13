import { createHash } from "node:crypto";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signals } from "../../db/schema.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  type Pagination,
  getOffset,
  buildPageResponse,
} from "../../lib/pagination.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateSignalInput {
  source: string;
  severity: "critical" | "warning" | "info";
  title: string;
  body: Record<string, unknown>;
}

export interface UpdateSignalInput {
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";
  matchedWorkflowId?: string;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface SignalFilters {
  q?: string;
  severity?: "critical" | "warning" | "info";
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";
  source?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeFingerprint(
  source: string,
  title: string,
  body: unknown,
): string {
  return createHash("sha256")
    .update(`${source}:${title}:${JSON.stringify(body)}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createSignal(tenantId: string, input: CreateSignalInput) {
  const fingerprint = computeFingerprint(input.source, input.title, input.body);

  // Dedup: if a signal with the same fingerprint already exists, return it
  const [existing] = await db
    .select()
    .from(signals)
    .where(
      and(eq(signals.tenantId, tenantId), eq(signals.fingerprint, fingerprint)),
    )
    .limit(1);
  if (existing) return { signal: existing, created: false };

  const [row] = await db
    .insert(signals)
    .values({ ...input, tenantId, fingerprint })
    .returning();
  return { signal: row, created: true };
}

export async function listSignals(
  tenantId: string,
  pagination: Pagination,
  filters: SignalFilters,
) {
  const conds = [eq(signals.tenantId, tenantId)];
  if (filters.q) conds.push(ilike(signals.title, `%${filters.q}%`));
  if (filters.severity) conds.push(eq(signals.severity, filters.severity));
  if (filters.status) conds.push(eq(signals.status, filters.status));
  if (filters.source) conds.push(eq(signals.source, filters.source));

  const items = await db
    .select()
    .from(signals)
    .where(and(...conds))
    .limit(pagination.pageSize)
    .offset(getOffset(pagination));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signals)
    .where(and(...conds));

  return buildPageResponse(items, count, pagination);
}

export async function getSignal(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError("Signal");
  return row;
}

export async function updateSignal(
  tenantId: string,
  id: string,
  input: UpdateSignalInput,
  currentUserId?: string,
) {
  const updates: Record<string, unknown> = { ...input };
  if (input.status === "RESOLVED") {
    updates.resolvedAt = new Date();
    if (!input.resolvedBy) {
      updates.resolvedBy = currentUserId ?? "unknown";
    }
  }
  if (input.matchedWorkflowId) {
    updates.matchedAt = new Date();
  }
  const [row] = await db
    .update(signals)
    .set(updates)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return row;
}

export async function acknowledgeSignal(tenantId: string, id: string) {
  const [row] = await db
    .update(signals)
    .set({ status: "ACKNOWLEDGED" })
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return row;
}

export async function resolveSignal(
  tenantId: string,
  id: string,
  userId: string,
  resolution?: string,
) {
  const updates: Record<string, unknown> = {
    status: "RESOLVED",
    resolvedAt: new Date(),
    resolvedBy: userId,
  };
  if (resolution) {
    updates.metadata = { resolution };
  }
  const [row] = await db
    .update(signals)
    .set(updates)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return row;
}

export async function deleteSignal(tenantId: string, id: string) {
  const [row] = await db
    .delete(signals)
    .where(and(eq(signals.id, id), eq(signals.tenantId, tenantId)))
    .returning();
  if (!row) throw new NotFoundError("Signal");
  return row;
}
