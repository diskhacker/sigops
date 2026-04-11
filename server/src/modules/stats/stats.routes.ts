import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { signals, executions, agents, workflows } from "../../db/schema.js";
import { requireAuth } from "../../middleware/auth.js";
import type { AppVariables } from "../../lib/hono-types.js";

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", requireAuth);

router.get("/", async (c) => {
  const tenantId = c.get("tenantId");

  const [signalsByStatus] = await db
    .select({
      open: sql<number>`sum(case when ${signals.status} = 'OPEN' then 1 else 0 end)::int`,
      acknowledged: sql<number>`sum(case when ${signals.status} = 'ACKNOWLEDGED' then 1 else 0 end)::int`,
      resolved: sql<number>`sum(case when ${signals.status} = 'RESOLVED' then 1 else 0 end)::int`,
      suppressed: sql<number>`sum(case when ${signals.status} = 'SUPPRESSED' then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(eq(signals.tenantId, tenantId));

  const [signalsBySeverity] = await db
    .select({
      critical: sql<number>`sum(case when ${signals.severity} = 'critical' then 1 else 0 end)::int`,
      warning: sql<number>`sum(case when ${signals.severity} = 'warning' then 1 else 0 end)::int`,
      info: sql<number>`sum(case when ${signals.severity} = 'info' then 1 else 0 end)::int`,
    })
    .from(signals)
    .where(eq(signals.tenantId, tenantId));

  const [execStats] = await db
    .select({
      pending: sql<number>`sum(case when ${executions.status} = 'PENDING' then 1 else 0 end)::int`,
      running: sql<number>`sum(case when ${executions.status} = 'RUNNING' then 1 else 0 end)::int`,
      success: sql<number>`sum(case when ${executions.status} = 'SUCCESS' then 1 else 0 end)::int`,
      failed: sql<number>`sum(case when ${executions.status} = 'FAILED' then 1 else 0 end)::int`,
      rolledBack: sql<number>`sum(case when ${executions.status} = 'ROLLED_BACK' then 1 else 0 end)::int`,
      cancelled: sql<number>`sum(case when ${executions.status} = 'CANCELLED' then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
      avgDurationMs: sql<number>`coalesce(avg(${executions.durationMs}), 0)::int`,
    })
    .from(executions)
    .where(eq(executions.tenantId, tenantId));

  const [agentStats] = await db
    .select({
      online: sql<number>`sum(case when ${agents.status} = 'ONLINE' then 1 else 0 end)::int`,
      degraded: sql<number>`sum(case when ${agents.status} = 'DEGRADED' then 1 else 0 end)::int`,
      offline: sql<number>`sum(case when ${agents.status} = 'OFFLINE' then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(agents)
    .where(eq(agents.tenantId, tenantId));

  const [workflowStats] = await db
    .select({
      active: sql<number>`sum(case when ${workflows.isActive} then 1 else 0 end)::int`,
      inactive: sql<number>`sum(case when not ${workflows.isActive} then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(workflows)
    .where(eq(workflows.tenantId, tenantId));

  const totalExec = execStats?.total ?? 0;
  const successExec = execStats?.success ?? 0;
  const successRate = totalExec > 0 ? successExec / totalExec : 0;

  return c.json({
    signals: signalsByStatus ?? { open: 0, acknowledged: 0, resolved: 0, suppressed: 0, total: 0 },
    signalsBySeverity: signalsBySeverity ?? { critical: 0, warning: 0, info: 0 },
    executions: {
      ...(execStats ?? {
        pending: 0,
        running: 0,
        success: 0,
        failed: 0,
        rolledBack: 0,
        cancelled: 0,
        total: 0,
        avgDurationMs: 0,
      }),
      successRate,
    },
    agents: agentStats ?? { online: 0, degraded: 0, offline: 0, total: 0 },
    workflows: workflowStats ?? { active: 0, inactive: 0, total: 0 },
  });
});

router.get("/signals-trend", async (c) => {
  const tenantId = c.get("tenantId");
  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${signals.createdAt})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(
      and(
        eq(signals.tenantId, tenantId),
        sql`${signals.createdAt} > now() - interval '30 days'`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${signals.createdAt})`)
    .orderBy(sql`date_trunc('day', ${signals.createdAt})`);
  return c.json({ trend: rows });
});

export default router;
