import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("../lib/api.js", () => ({
  api: { get: getMock, post: postMock, put: putMock, delete: deleteMock },
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import CrudTable from "./CrudTable.js";
import { renderWithProviders } from "../test/helpers.js";

const columns = [
  { key: "name", label: "Name" },
  { key: "value", label: "Value" },
];
const fields = [
  { key: "name", label: "Name", required: true },
  { key: "value", label: "Value", type: "number" as const },
  { key: "meta", label: "Meta", type: "json" as const },
];

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  deleteMock.mockReset();
});

describe("CrudTable", () => {
  it("renders rows", async () => {
    getMock.mockResolvedValue({ data: { data: [{ id: "r1", name: "A", value: 1, meta: { x: 1 } }] } });
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByText("A")).toBeDefined());
  });

  it("shows empty state", async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByText("No records")).toBeDefined());
  });

  it("shows error state", async () => {
    getMock.mockRejectedValue(new Error("boom"));
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByText("boom")).toBeDefined());
  });

  it("creates row", async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    postMock.mockResolvedValue({ data: { id: "n1" } });
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeDefined());
    fireEvent.click(screen.getByTestId("create-btn"));
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "B" } });
    fireEvent.change(screen.getByTestId("field-value"), { target: { value: "5" } });
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({ name: "B", value: 5 });
  });

  it("edits row", async () => {
    getMock.mockResolvedValue({ data: { data: [{ id: "r1", name: "A", value: 1, meta: null }] } });
    putMock.mockResolvedValue({ data: {} });
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByTestId("edit-r1")).toBeDefined());
    fireEvent.click(screen.getByTestId("edit-r1"));
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "Z" } });
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(putMock).toHaveBeenCalled());
  });

  it("deletes row", async () => {
    getMock.mockResolvedValue({ data: { data: [{ id: "r1", name: "A", value: 1, meta: null }] } });
    deleteMock.mockResolvedValue({});
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByTestId("delete-r1")).toBeDefined());
    fireEvent.click(screen.getByTestId("delete-r1"));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/w/r1"));
  });

  it("invalid json falls back to string", async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    postMock.mockResolvedValue({ data: { id: "n2" } });
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeDefined());
    fireEvent.click(screen.getByTestId("create-btn"));
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "N" } });
    fireEvent.change(screen.getByTestId("field-meta"), { target: { value: "not-json" } });
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1].meta).toBe("not-json");
  });

  it("surfaces mutation error", async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    postMock.mockRejectedValue(new Error("dup"));
    renderWithProviders(<CrudTable title="W" resource="w" columns={columns} fields={fields} />);
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeDefined());
    fireEvent.click(screen.getByTestId("create-btn"));
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "X" } });
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(screen.getByText("dup")).toBeDefined());
  });

  it("hides actions when canEdit/canDelete false", async () => {
    getMock.mockResolvedValue({ data: { data: [{ id: "r1", name: "A", value: 1, meta: null }] } });
    renderWithProviders(
      <CrudTable title="W" resource="w" columns={columns} fields={fields} canEdit={false} canDelete={false} />,
    );
    await waitFor(() => expect(screen.getByText("A")).toBeDefined());
    expect(screen.queryByText("Actions")).toBeNull();
  });
});
