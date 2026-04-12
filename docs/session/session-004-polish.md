# Session 004 — Tool Registry Seed + Cron Executor

**Date**: 2026-04-12
**Scope**: Protocol polish — seed 5 built-in SEL tools + add cron dispatcher for workflowSchedules.
**Branch**: `claude/conversation-summary-UT2b8`

## Protocol

```
AUDIT → REVIEW → CONFIRM → REUSE → IMPLEMENT
Feature = UI + Backend + Tests
```

## What Shipped

### 1. Tool Registry Seed (`src/lib/seed-builtin-tools.ts`)
Idempotent seed function that inserts the 5 built-in SEL tools into the `tools` registry
for a given tenant. Skips any tool already present at `(tenantId, name, version)`.

Seeded tools:
- `sigops.http` — HTTP request
- `sigops.notify_slack` — Slack notification
- `sigops.wait` — sleep N seconds
- `sigops.restart` — restart service via agent
- `sigops.condition` — evaluate simple comparison expression

Each stored with `type = "builtin"`, version `1.0.0`, and a JSON input-schema
description drawn from the SEL runtime definitions in `src/lib/sel/builtin-tools.ts`.

### 2. Cron Executor (`src/lib/cron-executor.ts`)
Minimal 5-field cron parser + tick dispatcher. Supports:
- `*` wildcard
- `N` exact value
- `*/N` step (every N)
- `1,3,5` lists
- `1-5` ranges

Tick logic:
- Loads active schedules
- Parses cron and matches against current UTC time
- Skips schedules that already ran within the current minute
- Invokes the injected `executeWorkflow(tenantId, workflowId, scheduleId)` callback
- Updates `lastRunAt`

Default executor is a no-op so the tick is safe to import/test without side effects.
Production wiring will call into the existing SEL runtime via BullMQ.

## Tests

- `src/lib/seed-builtin-tools.test.ts` — 4 tests
  - inserts all 5 when empty
  - skips when all already exist
  - validates count and version constant
  - validates shape of every spec
- `src/lib/cron-executor.test.ts` — 11 tests
  - `*`, `N`, `*/N`, `N,M`, `N-M` field parsing
  - invalid field count rejection
  - garbage rejection
  - trigger on match
  - skip on mismatch
  - skip on same-minute repeat
  - skip on invalid cron

Full suite: **28 files, 180 tests passing**. tsc clean.

## Notes

- Current `tools` table schema has a `tenantId` column (legacy). CLAUDE.md spec defines
  global `toolRegistry` with no tenantId. Kept current schema to avoid breaking existing
  module. Phase 2 refactor can flip to global when UAP-managed tool marketplace lands.
- Cron executor intentionally avoids external libs (e.g. `node-cron`) to keep
  open-source core minimal. Standard 5-field cron covers the published use-cases.
- No new routes, no UI, no schema changes in this session.

## Next

Still pending per CLAUDE.md build order:
- Stats/dashboard API (item 9)
- React dashboard polish (item 10)
- Agent WebSocket gateway integration with cron executor
