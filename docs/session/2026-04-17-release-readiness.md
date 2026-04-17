# Session: Release Readiness
Date: 2026-04-17

## Scope
SigOps slice of the cross-repo Release Readiness sprint.

## PRs merged
- #10 — `feat(db): commit initial migration SQL for production deployment` — squash-merged to main.

## What changed
- `server/src/db/migrations/0000_bizarre_the_hunter.sql` (5.9 KB, 9 tables: signals, signal_rules, workflows, workflow_schedules, executions, execution_steps, agents, agent_tools, tool_registry).
- `server/src/db/migrations/meta/` — drizzle journal + snapshot.

## Release readiness
- [x] migrations committed (9 tables)
- [x] docker.yml present (Sprint 1.5) — publishes `ghcr.io/diskhacker/sigops-server` + `sigops-ui` on `v*.*.*`
- [x] Server Dockerfile runs as `USER node`
- [x] UI Dockerfile runs as `USER nginx`
- [x] `db:migrate` script present (Sprint 1.5)
- [x] LICENSE present (MIT)
- [x] README honest (Sprint 1.5) — FlowBuilder, WSS, bidirectional adapters all in Roadmap section
- [ ] First `v0.1.0` tag — pending, Vivek to push

## Still outstanding (not blocking v0.1.0)
- FlowBuilder visual editor
- Bidirectional adapters for PagerDuty/Datadog/Grafana
- WebSocket agent transport (currently HTTP polling)
- Rate limiting on signal ingestion
- OpenTelemetry / Prometheus metrics export

## Next steps
1. Vivek tags `v0.1.0` — docker.yml fires, two images land in GHCR.
2. Agents repo (`sigops-agent`) can be tagged `v0.1.0` separately to fire `release.yml`.
