import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { setTenantMock, state } = vi.hoisted(() => ({
  setTenantMock: vi.fn(),
  state: { tenantId: "dev-tenant", token: "" },
}));

vi.mock("../lib/tenant-store.js", () => ({
  useTenantStore: Object.assign(
    () => ({ ...state, setTenant: setTenantMock }),
    { getState: () => ({ ...state, setTenant: setTenantMock }) },
  ),
}));

import Layout from "./Layout.js";

function renderLayout() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setTenantMock.mockReset();
  state.tenantId = "dev-tenant";
});

describe("Layout", () => {
  it("renders sidebar nav", () => {
    renderLayout();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("shows tenant value", () => {
    renderLayout();
    const input = screen.getByTestId("tenant-input") as HTMLInputElement;
    expect(input.value).toBe("dev-tenant");
  });

  it("updates tenant on input", () => {
    renderLayout();
    fireEvent.change(screen.getByTestId("tenant-input"), { target: { value: "t2" } });
    expect(setTenantMock).toHaveBeenCalledWith("t2");
  });
});
