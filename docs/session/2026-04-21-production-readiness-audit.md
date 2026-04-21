# Session: Production-Readiness Audit + Security Hardening
**Date:** 2026-04-21  
**Branch:** `claude/production-readiness-audit-ngl6r`  
**Tests:** 263 passing (SigOps server) / all TypeScript clean

---

## Scope

Deep audit against CLAUDE.md + architecture documents for SigOps (server + UI). All issues found were fixed in the same session.

---

## Security Issues Found and Fixed

### 1. Role Type Mismatch — Impersonation Tokens Rejected (HIGH — Fixed)

**File:** `server/src/modules/platform-config/platform-config.routes.ts`

**Problem:** UAP impersonation JWTs carry `roles: {}` (empty Record, not array). SigOps `requirePlatformAdminOrSupport` called `.some()` on a Record, which always returned `false` — effectively blocking all impersonated support_engineer access to log-level endpoints.

**Fix:** Added `flattenRoles()` helper that handles `string[] | Record<string, string[]> | null`:
```typescript
function flattenRoles(roles: string[] | Record<string, string[]> | null | undefined): string[] {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  return Object.values(roles).flat();
}
```
All role checks in platform-config now use `flattenRoles(user.roles)`.

### 2. Logger Mutated Before Audit Log Write (MEDIUM — Fixed)

**File:** `server/src/modules/platform-config/platform-config.service.ts`

**Problem:** `logger.level = newLevel` was called before `db.insert(auditLogs)`. If the DB write failed, the logger was already mutated but the `platformConfig` table was not updated — state inconsistency between live process and persisted config.

**Fix:** Moved `logger.level = newLevel` to after all DB operations complete successfully.

---

## Functional Issues Found and Fixed

### 3. Spike Detector Never Ran (HIGH — Fixed)

**File:** `server/src/index.ts`

**Problem:** `runSpikeDetection()` was implemented and tested, but `index.ts` never called it. The spike detector was dead code in production.

**Fix:** Wired to startup:
```typescript
const SPIKE_DETECTION_INTERVAL_MS = 5 * 60 * 1000;
runSpikeDetection().catch((err) =>
  logger.warn({ err }, "Initial spike detection run failed"),
);
const spikeInterval = setInterval(() => {
  runSpikeDetection().catch((err) =>
    logger.warn({ err }, "Spike detection run failed"),
  );
}, SPIKE_DETECTION_INTERVAL_MS);
spikeInterval.unref();
```

### 4. Persisted Log Level Not Applied on Boot (MEDIUM — Fixed)

**File:** `server/src/index.ts`

**Problem:** `platformConfig` table persists the log level, but on server restart the pino logger always started at the default level (ignoring the DB value). Only live PUT requests would change the level.

**Fix:** `applyPersistedLogLevel()` called before server is fully ready:
```typescript
await applyPersistedLogLevel().catch((err) =>
  logger.warn({ err }, "Failed to apply persisted log level at startup"),
);
```

---

## CLAUDE.md / Documentation Updates

- Schema count corrected: **13 tables** (was listed as "10 Tables")
- Startup sequence documented in CLAUDE.md
- UAP Integration section rewritten: lists 4 built-in SigOps roles with exact permissions
- GAP 6 waterfall clarified: inline in execution detail response (not a separate endpoint)
- GAP 4 spike detector clarified: now wired to startup cron
- GAP 1 startup clarified: `applyPersistedLogLevel()` called on boot
- Hard Rules 8 + 9 added: logger timing guarantee and flattenRoles mandate

---

## What Remains Not Shipped

- Observability (Prometheus `/metrics`, OTel, Sentry)
- WebSocket agent gateway (today: HTTP long-polling)
- FlowBuilder UI
- Bidirectional adapters
- Email polling ingestion
- Rate limiting on signal ingest path
