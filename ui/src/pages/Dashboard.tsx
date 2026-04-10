import { Box, Card, CardContent, Grid, Typography } from "@mui/material";

const CARDS = [
  { label: "Signals", desc: "Signal ingest module" },
  { label: "Workflows", desc: "SEL workflows module" },
  { label: "Executions", desc: "Workflow runs module" },
  { label: "Agents", desc: "Rust agents module" },
  { label: "Tools", desc: "Tool registry module" },
  { label: "Signal Rules", desc: "Pattern rules module" },
  { label: "Workflow Schedules", desc: "Cron schedules module" },
];

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h5" mb={1}>
        SigOps
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Phase 1 Backend — 7 modules
      </Typography>
      <Grid container spacing={2}>
        {CARDS.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.label}>
            <Card>
              <CardContent>
                <Typography variant="h6">{c.label}</Typography>
                <Typography color="text.secondary">{c.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
