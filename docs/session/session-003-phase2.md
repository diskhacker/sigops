# SigOps Session 003 — Phase 2 Ingest + Stats

## Date
2026-04-11

## Scope
Prometheus Alertmanager adapter. Dashboard stats aggregation API. Live Dashboard UI fetching real stats.

## Delivered

### Backend
1. `prometheus.ts` — Alertmanager webhook v4 schema + normalizer.
2. `ingest.routes.ts` — POST /webhook generic ingest, POST /prometheus adapter.
3. `stats.routes.ts` — GET / dashboard aggregation, GET /signals-trend 30-day bucket.

### Frontend
1. `Dashboard.tsx` — Rewritten as live stats page via TanStack Query.
2. Four StatCards: Signals, Executions, Agents, Workflows.
3. Dashboard.test.tsx with vi.hoisted api mock.

## Prometheus Normalizer Rules
- Source tagged `prometheus`.
- Resolved alerts map to info severity.
- Labels severity: critical/error/page → critical, warning/warn → warning, else info.
- Title fallback: annotations.summary → annotations.description → labels.alertname.
- SHA-256 fingerprint dedupe via ingest pipeline.

## Stats Aggregation
- signalsByStatus: open/acknowledged/resolved/suppressed/total.
- signalsBySeverity: critical/warning/info.
- execStats: pending/running/success/failed/rolledBack/cancelled/total/avgDurationMs.
- successRate computed as successExec/totalExec.
- agentStats: online/degraded/offline/total.
- workflowStats: active/inactive/total.

## Tests
- Server: 165 passing (added 13: 5 prometheus + 5 ingest routes + 3 stats).
- UI: 31 passing (added 2 Dashboard stats tests).
- Vitest mocks via queueResults + mockAuthMiddleware.

## Protocol
AUDIT existing routes → REVIEW schema consistency → CONFIRM mock DB pattern → REUSE buildPageResponse + mockAuthMiddleware → IMPLEMENT.

## Branch
`claude/conversation-summary-UT2b8`
