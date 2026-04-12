import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.js";
import Layout from "./components/Layout.js";
import SignalsPage from "./pages/SignalsPage.js";
import WorkflowsPage from "./pages/WorkflowsPage.js";
import ExecutionsPage from "./pages/ExecutionsPage.js";
import AgentsPage from "./pages/AgentsPage.js";
import ToolsPage from "./pages/ToolsPage.js";
import SignalRulesPage from "./pages/SignalRulesPage.js";
import WorkflowSchedulesPage from "./pages/WorkflowSchedulesPage.js";
import ExecutionStepsPage from "./pages/ExecutionStepsPage.js";
import AgentToolsPage from "./pages/AgentToolsPage.js";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="signals" element={<SignalsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="executions" element={<ExecutionsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="signal-rules" element={<SignalRulesPage />} />
        <Route path="workflow-schedules" element={<WorkflowSchedulesPage />} />
        <Route path="execution-steps" element={<ExecutionStepsPage />} />
        <Route path="agent-tools" element={<AgentToolsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
