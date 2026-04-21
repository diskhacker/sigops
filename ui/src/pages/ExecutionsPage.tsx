import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import CrudTable from "../components/CrudTable.js";
import { api, errorMessage } from "../lib/api.js";

interface TraceStep {
  id: string;
  stepIndex: number;
  toolName: string;
  status: string;
  durationMs: number | null;
}

interface TraceResult {
  trace_id: string;
  executions: { id: string; status: string; workflowId: string }[];
  steps: TraceStep[];
  signals: { id: string; title: string }[];
  duration_ms: number | null;
  status: string;
}

function TraceSearch() {
  const [input, setInput] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["trace", searchId],
    queryFn: async () => {
      const res = await api.get<TraceResult>(`/trace/${searchId}`);
      return res.data;
    },
    enabled: !!searchId,
    retry: false,
  });

  const statusColor: Record<string, "success" | "error" | "warning" | "info"> = {
    success: "success",
    failed: "error",
    partial: "warning",
    in_progress: "info",
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Trace Search
      </Typography>
      <Stack direction="row" spacing={2} mb={3} maxWidth={600}>
        <TextField
          fullWidth
          placeholder="Paste Trace ID (UUID)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearchId(input.trim())}
          inputProps={{ "data-testid": "trace-id-input" }}
        />
        <Button
          variant="contained"
          onClick={() => setSearchId(input.trim())}
          disabled={!input.trim()}
          data-testid="trace-search-btn"
        >
          Search
        </Button>
        {searchId && (
          <Button
            size="small"
            onClick={() => navigator.clipboard.writeText(searchId)}
            data-testid="copy-trace-id-btn"
          >
            Copy ID
          </Button>
        )}
      </Stack>

      {query.isLoading && <Typography>Searching…</Typography>}
      {query.isError && <Alert severity="error">{errorMessage(query.error)}</Alert>}

      {query.data && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Trace: <code>{query.data.trace_id}</code>
            </Typography>
            <Chip
              label={query.data.status}
              color={statusColor[query.data.status] ?? "default"}
              size="small"
            />
            {query.data.duration_ms !== null && (
              <Typography variant="body2" color="text.secondary">
                {query.data.duration_ms}ms total
              </Typography>
            )}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {query.data.signals.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2">Triggering Signals</Typography>
              {query.data.signals.map((s) => (
                <Typography key={s.id} variant="body2">
                  {s.id}: {s.title}
                </Typography>
              ))}
            </Box>
          )}

          <Typography variant="subtitle2" mb={1}>
            Executions ({query.data.executions.length})
          </Typography>
          {query.data.executions.map((e) => (
            <Stack key={e.id} direction="row" spacing={1} mb={0.5}>
              <Chip label={e.status} size="small" />
              <Typography variant="body2">{e.id}</Typography>
            </Stack>
          ))}

          {query.data.steps.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" mb={1}>
                Steps ({query.data.steps.length})
              </Typography>
              {query.data.steps.map((s) => (
                <Stack key={s.id} direction="row" spacing={2} mb={0.5}>
                  <Chip label={s.status} size="small" />
                  <Typography variant="body2">
                    [{s.stepIndex}] {s.toolName}
                    {s.durationMs !== null && ` — ${s.durationMs}ms`}
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default function ExecutionsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Executions" data-testid="tab-executions" />
        <Tab label="Trace Search" data-testid="tab-trace-search" />
      </Tabs>

      {tab === 0 && (
        <CrudTable
          title="Executions"
          resource="executions"
          columns={[
            { key: "workflowId", label: "Workflow" },
            { key: "signalId", label: "Signal" },
            { key: "traceId", label: "Trace ID" },
            { key: "status", label: "Status" },
          ]}
          fields={[
            { key: "workflowId", label: "Workflow ID", required: true },
            { key: "signalId", label: "Signal ID", required: true },
            { key: "status", label: "Status" },
          ]}
        />
      )}
      {tab === 1 && <TraceSearch />}
    </Box>
  );
}
