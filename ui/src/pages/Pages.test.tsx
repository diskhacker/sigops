import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(async () => ({ data: { data: [] } })),
}));

vi.mock("../lib/api.js", () => ({
  api: { get: getMock, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e: unknown) => String(e),
}));

import SignalsPage from "./SignalsPage.js";
import WorkflowsPage from "./WorkflowsPage.js";
import ExecutionsPage from "./ExecutionsPage.js";
import AgentsPage from "./AgentsPage.js";
import ToolsPage from "./ToolsPage.js";
import SignalRulesPage from "./SignalRulesPage.js";
import WorkflowSchedulesPage from "./WorkflowSchedulesPage.js";
import ExecutionStepsPage from "./ExecutionStepsPage.js";
import AgentToolsPage from "./AgentToolsPage.js";
import { withProviders } from "../test/helpers.js";

describe("Page smoke tests", () => {
  const cases = [
    ["Signals", SignalsPage],
    ["Workflows", WorkflowsPage],
    ["Executions", ExecutionsPage],
    ["Agents", AgentsPage],
    ["Tools", ToolsPage],
    ["Signal Rules", SignalRulesPage],
    ["Workflow Schedules", WorkflowSchedulesPage],
    ["Execution Steps", ExecutionStepsPage],
    ["Agent Tools", AgentToolsPage],
  ] as const;

  for (const [name, Comp] of cases) {
    it(`${name} renders`, async () => {
      render(withProviders({ children: <Comp /> }));
      await waitFor(() => expect(screen.getByRole("heading", { name })).toBeDefined());
    });
  }
});
