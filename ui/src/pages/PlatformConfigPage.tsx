import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api.js";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
type LogLevel = typeof LOG_LEVELS[number];

interface LogLevelResponse {
  current: LogLevel;
  changedAt?: string;
}

interface UsageBaseline {
  id: string;
  tenantId: string;
  metric: string;
  baselineValue: string;
  spikeThreshold: string;
  windowMinutes: number;
  lastComputed: string | null;
}

function LogLevelPanel() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<LogLevel>("info");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["platform-config", "log-level"],
    queryFn: async () => {
      const res = await api.get<LogLevelResponse>("/platform-config/log-level");
      setSelected(res.data.current);
      return res.data;
    },
  });

  const mut = useMutation({
    mutationFn: async (level: LogLevel) => {
      const res = await api.put<{ previous: string; current: string; changedAt: string }>(
        "/platform-config/log-level",
        { level },
      );
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-config", "log-level"] }); setError(null); },
    onError: (e) => setError(errorMessage(e)),
  });

  const isHighVerbosity = selected === "debug" || selected === "trace";

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Log Level</Typography>
      {query.isLoading && <Typography>Loading…</Typography>}
      {query.isError && <Alert severity="error">{errorMessage(query.error)}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {query.data && (
        <Stack spacing={2} maxWidth={400}>
          <Typography variant="body2" color="text.secondary">
            Current: <strong>{query.data.current}</strong>
            {query.data.changedAt && ` · Changed: ${new Date(query.data.changedAt).toLocaleString()}`}
          </Typography>
          {isHighVerbosity && (
            <Alert severity="warning" data-testid="verbosity-warning">
              High verbosity — revert after investigation
            </Alert>
          )}
          <FormControl fullWidth>
            <InputLabel>Log Level</InputLabel>
            <Select value={selected} label="Log Level" onChange={(e) => setSelected(e.target.value as LogLevel)} inputProps={{ "data-testid": "log-level-select" }}>
              {LOG_LEVELS.map((l) => (
                <MenuItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => mut.mutate(selected)} disabled={mut.isPending || selected === query.data.current} data-testid="apply-btn">
            Apply
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function UsageThresholdsPanel() {
  const qc = useQueryClient();
  const [metric, setMetric] = useState("signals_per_hour");
  const [multiplier, setMultiplier] = useState("3.0");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["usage-baselines"],
    queryFn: async () => {
      const res = await api.get<{ data: UsageBaseline[] }>("/usage-baselines");
      return res.data.data ?? [];
    },
  });

  const computeMut = useMutation({
    mutationFn: async (m: string) => {
      const res = await api.post("/usage-baselines/compute", { metric: m });
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usage-baselines"] }); setError(null); },
    onError: (e) => setError(errorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, threshold }: { id: string; threshold: string }) => {
      const res = await api.put(`/usage-baselines/${id}`, { spikeThreshold: threshold });
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usage-baselines"] }); setError(null); },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Usage Thresholds</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} mb={2} alignItems="flex-end" maxWidth={500}>
        <TextField
          label="Metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          size="small"
          inputProps={{ "data-testid": "metric-input" }}
        />
        <Button
          variant="outlined"
          onClick={() => computeMut.mutate(metric)}
          disabled={computeMut.isPending}
          data-testid="compute-baseline-btn"
        >
          Auto-compute Baseline (30d)
        </Button>
      </Stack>

      {query.isLoading && <Typography>Loading…</Typography>}
      {query.data && query.data.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Baseline</TableCell>
                <TableCell>Threshold (×)</TableCell>
                <TableCell>Window (min)</TableCell>
                <TableCell>Last Computed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.metric}</TableCell>
                  <TableCell>{parseFloat(b.baselineValue).toFixed(2)}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      defaultValue={b.spikeThreshold}
                      onBlur={(e) => setMultiplier(e.target.value)}
                      sx={{ width: 80 }}
                      inputProps={{ "data-testid": `threshold-${b.id}` }}
                    />
                  </TableCell>
                  <TableCell>{b.windowMinutes}</TableCell>
                  <TableCell>{b.lastComputed ? new Date(b.lastComputed).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => updateMut.mutate({ id: b.id, threshold: multiplier })}
                      data-testid={`save-threshold-${b.id}`}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {query.data && query.data.length === 0 && (
        <Typography color="text.secondary">
          No baselines configured. Use "Auto-compute Baseline" to create one.
        </Typography>
      )}

      <Box mt={2}>
        <Typography variant="caption" color="text.secondary">
          <Chip label="Notify" size="small" /> When a spike is detected, an in-app notification is sent to tenant admins and a signal is created (source: spike_detector).
        </Typography>
      </Box>
    </Box>
  );
}

export default function PlatformConfigPage() {
  return (
    <Box>
      <Typography variant="h5" mb={3}>Platform Configuration</Typography>
      <LogLevelPanel />
      <Divider sx={{ my: 4 }} />
      <UsageThresholdsPanel />
    </Box>
  );
}
