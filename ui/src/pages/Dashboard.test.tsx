import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(async (url: string) => {
    if (url === "/stats/recent-executions") {
      return {
        data: {
          executions: [
            { id: "e1", workflowId: "w1", status: "SUCCESS", triggerType: "manual", durationMs: 100, createdAt: "2025-01-01T00:00:00Z" },
          ],
        },
      };
    }
    return {
      data: {
        signals: { open: 2, acknowledged: 1, resolved: 3, suppressed: 0, total: 6 },
        signalsBySeverity: { critical: 1, warning: 2, info: 3 },
        executions: {
          pending: 0,
          running: 1,
          success: 4,
          failed: 1,
          rolledBack: 0,
          cancelled: 0,
          total: 6,
          avgDurationMs: 1200,
          successRate: 0.666,
        },
        agents: { online: 2, degraded: 0, offline: 1, total: 3 },
        workflows: { active: 3, inactive: 1, total: 4 },
      },
    };
  }),
}));

vi.mock("../lib/api.js", () => ({
  api: { get: getMock, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e: unknown) => String(e),
}));

import Dashboard from "./Dashboard.js";
import { withProviders } from "../test/helpers.js";

describe("Dashboard", () => {
  it("renders title", () => {
    render(withProviders({ children: <Dashboard /> }));
    expect(screen.getByText(/SigOps Dashboard/)).toBeDefined();
  });

  it("renders stat cards after fetch", async () => {
    render(withProviders({ children: <Dashboard /> }));
    await waitFor(() => expect(screen.getByText(/Agent Status/)).toBeDefined());
    expect(screen.getByText(/Active Workflows/)).toBeDefined();
  });
});
