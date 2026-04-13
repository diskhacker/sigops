import { Alert, Box, Card, CardContent, Chip, Grid, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api.js";

type Stats = {
  signals: { open: number; acknowledged: number; resolved: number; suppressed: number; total: number };
  signalsBySeverity: { critical: number; warning: number; info: number };
  executions: {
    pending: number;
    running: number;
    success: number;
    failed: number;
    rolledBack: number;
    cancelled: number;
    total: number;
    avgDurationMs: number;
    successRate: number;
  };
  agents: { online: number; degraded: number; offline: number; total: number };
  workflows: { active: number; inactive: number; total: number };
};

type RecentExecution = {
  id: string;
  workflowId: string;
  status: string;
  triggerType: string;
  durationMs: number | null;
  createdAt: string;
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {sub && (
          <Typography variant="body2" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const statusColor: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
  SUCCESS: "success",
  FAILED: "error",
  RUNNING: "info",
  PENDING: "warning",
  ROLLED_BACK: "error",
  CANCELLED: "default",
};

export default function Dashboard() {
  const { data, isLoading, isError, error } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await api.get<Stats>("/stats");
      return res.data;
    },
  });

  const recentExec = useQuery<{ executions: RecentExecution[] }>({
    queryKey: ["stats", "recent-executions"],
    queryFn: async () => {
      const res = await api.get<{ executions: RecentExecution[] }>("/stats/recent-executions");
      return res.data;
    },
  });

  return (
    <Box>
      <Typography variant="h5" mb={1}>
        SigOps Dashboard
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Live stats across signals, executions, agents, workflows
      </Typography>

      {isLoading && <Typography>Loading stats...</Typography>}
      {isError && <Alert severity="error">{errorMessage(error)}</Alert>}

      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Signals by Severity"
                value={data.signals.total}
                sub={`${data.signalsBySeverity.critical} critical · ${data.signalsBySeverity.warning} warning · ${data.signalsBySeverity.info} info`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Active Workflows"
                value={data.workflows.active}
                sub={`${data.workflows.total} total · ${data.workflows.inactive} inactive`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Executions"
                value={data.executions.total}
                sub={`${Math.round(data.executions.successRate * 100)}% success · ${data.executions.avgDurationMs}ms avg`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Agent Status"
                value={data.agents.total}
                sub={`${data.agents.online} online · ${data.agents.offline} offline · ${data.agents.degraded} degraded`}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" mt={4} mb={2}>
            Recent Executions
          </Typography>
          {recentExec.isLoading && <Typography>Loading...</Typography>}
          {recentExec.isError && <Alert severity="error">{errorMessage(recentExec.error)}</Alert>}
          {recentExec.data && (
            <Grid container spacing={2}>
              {recentExec.data.executions.length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary">No executions yet.</Typography>
                </Grid>
              )}
              {recentExec.data.executions.map((exec) => (
                <Grid item xs={12} key={exec.id}>
                  <Card>
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Chip label={exec.status} color={statusColor[exec.status] ?? "default"} size="small" />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        Workflow {exec.workflowId.slice(0, 8)}... — {exec.triggerType}
                      </Typography>
                      {exec.durationMs != null && (
                        <Typography variant="body2" color="text.secondary">
                          {exec.durationMs}ms
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {new Date(exec.createdAt).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
