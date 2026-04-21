import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api.js";

interface WaterfallStep {
  id: string;
  name: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  offset_ms: number | null;
  status: string;
  depth: number;
}

interface ExecutionDetail {
  id: string;
  status: string;
  startedAt: string | null;
  durationMs: number | null;
  waterfall: {
    total_ms: number | null;
    steps: WaterfallStep[];
  };
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: "#4caf50",
  FAILED: "#f44336",
  RUNNING: "#ff9800",
  PENDING: "#9e9e9e",
  SKIPPED: "#9e9e9e",
  ROLLED_BACK: "#ff9800",
};

function WaterfallChart({ data }: { data: ExecutionDetail["waterfall"] }) {
  const [selected, setSelected] = useState<WaterfallStep | null>(null);
  const totalMs = data.total_ms ?? 1;

  if (data.steps.length === 0) {
    return <Typography color="text.secondary">No steps recorded.</Typography>;
  }

  // Find slowest step
  const slowestMs = Math.max(...data.steps.map((s) => s.duration_ms ?? 0));

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="caption" color="text.secondary">
          Total: {totalMs}ms
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Steps: {data.steps.length}
        </Typography>
      </Stack>

      {data.steps.map((step) => {
        const offsetPct = step.offset_ms !== null ? (step.offset_ms / totalMs) * 100 : 0;
        const widthPct = step.duration_ms !== null ? (step.duration_ms / totalMs) * 100 : 2;
        const isSlowest = step.duration_ms === slowestMs && slowestMs > 0;

        return (
          <Box key={step.id} sx={{ pl: step.depth * 3 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                sx={{ width: 180, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {step.name}
              </Typography>
              <Box
                sx={{ position: "relative", height: 20, flexGrow: 1, bgcolor: "#f5f5f5", borderRadius: 1, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setSelected(step)}
                data-testid={`waterfall-bar-${step.id}`}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: `${Math.min(offsetPct, 98)}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    height: "100%",
                    bgcolor: STATUS_COLOR[step.status] ?? "#90caf9",
                    borderRadius: 1,
                  }}
                />
                {isSlowest && (
                  <Chip
                    label="slowest"
                    size="small"
                    color="warning"
                    sx={{ position: "absolute", right: 4, top: 1, height: 18, fontSize: "0.6rem" }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ width: 60, flexShrink: 0, textAlign: "right" }}>
                {step.duration_ms !== null ? `${step.duration_ms}ms` : "—"}
              </Typography>
            </Stack>
          </Box>
        );
      })}

      {selected && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: "#fafafa" }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">{selected.name}</Typography>
            <Button size="small" onClick={() => setSelected(null)}>Close</Button>
          </Stack>
          <Typography variant="body2">Status: {selected.status}</Typography>
          {selected.started_at && <Typography variant="body2">Start: {selected.started_at}</Typography>}
          {selected.ended_at && <Typography variant="body2">End: {selected.ended_at}</Typography>}
          {selected.duration_ms !== null && <Typography variant="body2">Duration: {selected.duration_ms}ms</Typography>}
          {selected.offset_ms !== null && <Typography variant="body2">Offset from start: {selected.offset_ms}ms</Typography>}
        </Paper>
      )}
    </Stack>
  );
}

export default function WaterfallPage() {
  const [input, setInput] = useState("");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const query = useQuery({
    queryKey: ["execution-detail", executionId],
    queryFn: async () => {
      const res = await api.get<ExecutionDetail>(`/executions/${executionId}`);
      return res.data;
    },
    enabled: !!executionId,
    retry: false,
  });

  return (
    <Box>
      <Typography variant="h5" mb={3}>Execution Waterfall</Typography>

      <Stack direction="row" spacing={2} mb={3} maxWidth={600}>
        <TextField
          fullWidth
          placeholder="Execution ID"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setExecutionId(input.trim())}
          inputProps={{ "data-testid": "execution-id-input" }}
        />
        <Button variant="contained" onClick={() => setExecutionId(input.trim())} disabled={!input.trim()} data-testid="load-btn">
          Load
        </Button>
      </Stack>

      {query.isLoading && <Typography>Loading…</Typography>}
      {query.isError && <Alert severity="error">{errorMessage(query.error)}</Alert>}

      {query.data && (
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="subtitle1">Execution: <code>{query.data.id}</code></Typography>
            <Chip label={query.data.status} size="small" />
            {query.data.durationMs !== null && (
              <Tooltip title="Total execution time">
                <Typography variant="body2" color="text.secondary">{query.data.durationMs}ms</Typography>
              </Tooltip>
            )}
          </Stack>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Waterfall" data-testid="tab-waterfall" />
            <Tab label="Steps List" data-testid="tab-steps" />
          </Tabs>

          {tab === 0 && query.data.waterfall && <WaterfallChart data={query.data.waterfall} />}

          {tab === 1 && (
            <Stack spacing={1}>
              {(query.data.waterfall?.steps ?? []).map((s) => (
                <Paper key={s.id} sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip label={s.status} size="small" />
                    <Typography variant="body2"><strong>{s.name}</strong></Typography>
                    {s.duration_ms !== null && <Typography variant="caption">{s.duration_ms}ms</Typography>}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
