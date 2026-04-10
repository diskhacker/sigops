import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api.js";

export type Column = { key: string; label: string };
export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "json" | "email";
  required?: boolean;
};

export type CrudTableProps = {
  title: string;
  resource: string;
  columns: Column[];
  fields: Field[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

type Row = Record<string, unknown> & { id: string };

function coerceValue(type: Field["type"], raw: string): unknown {
  if (type === "number") return raw === "" ? undefined : Number(raw);
  if (type === "json") {
    if (raw === "") return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw === "" ? undefined : raw;
}

export default function CrudTable({
  title,
  resource,
  columns,
  fields,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: CrudTableProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: [resource],
    queryFn: async () => {
      const res = await api.get<{ data: Row[] }>(`/${resource}`);
      return res.data.data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(`/${resource}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resource] });
      setOpen(false);
      setForm({});
      setError(null);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await api.put(`/${resource}/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [resource] });
      setOpen(false);
      setEditing(null);
      setForm({});
      setError(null);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/${resource}/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
    onError: (e) => setError(errorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm({});
    setError(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = row[f.key];
      next[f.key] = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    setForm(next);
    setError(null);
    setOpen(true);
  }

  function submit() {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = coerceValue(f.type, form[f.key] ?? "");
      if (v !== undefined) body[f.key] = v;
    }
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{title}</Typography>
        {canCreate && (
          <Button variant="contained" onClick={openCreate} data-testid="create-btn">
            New
          </Button>
        )}
      </Stack>

      {list.isLoading && <Typography>Loading...</Typography>}
      {list.isError && <Alert severity="error">{errorMessage(list.error)}</Alert>}

      {list.data && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.label}</TableCell>
                ))}
                {(canEdit || canDelete) && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Typography color="text.secondary">No records</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map((row) => (
                  <TableRow key={row.id} data-testid={`row-${row.id}`}>
                    {columns.map((c) => {
                      const v = row[c.key];
                      return (
                        <TableCell key={c.key}>
                          {v === null || v === undefined
                            ? ""
                            : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v)}
                        </TableCell>
                      );
                    })}
                    {(canEdit || canDelete) && (
                      <TableCell align="right">
                        {canEdit && (
                          <IconButton size="small" onClick={() => openEdit(row)} data-testid={`edit-${row.id}`}>
                            <span aria-hidden>/</span>
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton
                            size="small"
                            onClick={() => deleteMut.mutate(row.id)}
                            data-testid={`delete-${row.id}`}
                          >
                            <span aria-hidden>x</span>
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} mt={1}>
            {fields.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                required={f.required}
                fullWidth
                multiline={f.type === "json"}
                inputProps={{ "data-testid": `field-${f.key}` }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={createMut.isPending || updateMut.isPending}
            data-testid="submit-btn"
          >
            {editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
