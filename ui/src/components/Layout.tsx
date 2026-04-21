import { useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  TextField,
  Tooltip,
} from "@mui/material";
import { useTenantStore } from "../lib/tenant-store.js";
import { useVersionStore } from "../lib/version-store.js";

const DRAWER_WIDTH = 220;

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/signals", label: "Signals" },
  { to: "/workflows", label: "Workflows" },
  { to: "/executions", label: "Executions" },
  { to: "/agents", label: "Agents" },
  { to: "/tools", label: "Tools" },
  { to: "/signal-rules", label: "Signal Rules" },
  { to: "/workflow-schedules", label: "Workflow Schedules" },
  { to: "/execution-steps", label: "Execution Steps" },
  { to: "/agent-tools", label: "Agent Tools" },
  { to: "/platform-config", label: "Platform Config" },
];

export default function Layout() {
  const { tenantId, setTenant } = useTenantStore();
  const { info, fetch: fetchVersion } = useVersionStore();

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "primary.main" }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SigOps
          </Typography>
          <TextField
            size="small"
            variant="outlined"
            label="Tenant"
            value={tenantId}
            onChange={(e) => setTenant(e.target.value)}
            sx={{ bgcolor: "white", borderRadius: 1, width: 200 }}
            inputProps={{ "data-testid": "tenant-input" }}
          />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box", display: "flex", flexDirection: "column" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", flexGrow: 1 }}>
          <List>
            {NAV.map((n) => (
              <ListItemButton key={n.to} component={NavLink} to={n.to}>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
        {info && (
          <Tooltip
            title={`Built: ${info.built_at} · Uptime: ${info.uptime_seconds}s`}
            placement="top"
          >
            <Box
              data-testid="version-chip"
              sx={{ px: 2, py: 1.5, color: "text.secondary", fontSize: "0.7rem" }}
            >
              v{info.version} · {info.commit_sha.slice(0, 7)}
            </Box>
          </Tooltip>
        )}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
