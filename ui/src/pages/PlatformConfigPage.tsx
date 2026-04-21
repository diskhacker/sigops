import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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

export default function PlatformConfigPage() {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-config", "log-level"] });
      setError(null);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const isHighVerbosity = selected === "debug" || selected === "trace";

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Platform Configuration
      </Typography>

      <Typography variant="h6" gutterBottom>
        Log Level
      </Typography>

      {query.isLoading && <Typography>Loading…</Typography>}
      {query.isError && <Alert severity="error">{errorMessage(query.error)}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {query.data && (
        <Stack spacing={2} maxWidth={400}>
          <Typography variant="body2" color="text.secondary">
            Current level: <strong>{query.data.current}</strong>
            {query.data.changedAt && ` · Last changed: ${new Date(query.data.changedAt).toLocaleString()}`}
          </Typography>

          {isHighVerbosity && (
            <Alert severity="warning" data-testid="verbosity-warning">
              High verbosity — revert after investigation
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>Log Level</InputLabel>
            <Select
              value={selected}
              label="Log Level"
              onChange={(e) => setSelected(e.target.value as LogLevel)}
              inputProps={{ "data-testid": "log-level-select" }}
            >
              {LOG_LEVELS.map((l) => (
                <MenuItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={() => mut.mutate(selected)}
            disabled={mut.isPending || selected === query.data.current}
            data-testid="apply-btn"
          >
            Apply
          </Button>
        </Stack>
      )}
    </Box>
  );
}
