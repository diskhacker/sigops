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
} from "@mui/material";
import { useTenantStore } from "../lib/tenant-store.js";

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
];

export default function Layout() {
  const { tenantId, setTenant } = useTenantStore();
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
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {NAV.map((n) => (
              <ListItemButton key={n.to} component={NavLink} to={n.to}>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
