import { Alert, Box, Card, CardContent, Grid, Typography } from "@mui/material";
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

export default function Dashboard() {
  const { data, isLoading, isError, error } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await api.get<Stats>("/stats");
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Signals"
              value={data.signals.total}
              sub={`${data.signals.open} open · ${data.signalsBySeverity.critical} critical`}
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
              label="Agents"
              value={data.agents.total}
              sub={`${data.agents.online} online · ${data.agents.offline} offline`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Workflows"
              value={data.workflows.total}
              sub={`${data.workflows.active} active`}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
