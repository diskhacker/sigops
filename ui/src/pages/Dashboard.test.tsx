import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard.js";
import { withProviders } from "../test/helpers.js";

describe("Dashboard", () => {
  it("renders title", () => {
    render(withProviders({ children: <Dashboard /> }));
    expect(screen.getByText(/Phase 1 Backend/)).toBeDefined();
  });

  it("renders cards", () => {
    render(withProviders({ children: <Dashboard /> }));
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
  });
});
