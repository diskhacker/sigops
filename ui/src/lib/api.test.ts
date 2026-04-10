import { describe, it, expect, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

vi.mock("./tenant-store.js", () => {
  const state = { tenantId: "t1", token: "" };
  return {
    useTenantStore: {
      getState: () => state,
      __set: (p: Partial<typeof state>) => Object.assign(state, p),
    },
  };
});

const { api, errorMessage } = await import("./api.js");
const { useTenantStore } = await import("./tenant-store.js");

describe("api interceptors", () => {
  it("adds tenant header", () => {
    const req = api.interceptors.request as unknown as {
      handlers: { fulfilled: (c: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const cfg = req.handlers[0].fulfilled({ headers: {} });
    expect((cfg.headers as Record<string, string>)["x-tenant-id"]).toBe("t1");
  });

  it("adds bearer when token set", () => {
    (useTenantStore as unknown as { __set: (p: Record<string, unknown>) => void }).__set({ token: "tok" });
    const req = api.interceptors.request as unknown as {
      handlers: { fulfilled: (c: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const cfg = req.handlers[0].fulfilled({ headers: {} });
    expect((cfg.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
});

describe("errorMessage", () => {
  it("extracts api error message", () => {
    const err = new AxiosError("Bad", "400", undefined, null, {
      status: 400,
      statusText: "",
      data: { error: { code: "X", message: "Nope" } },
      headers: {},
      config: { headers: new AxiosHeaders() },
    });
    expect(errorMessage(err)).toBe("Nope");
  });

  it("falls back to axios message", () => {
    expect(errorMessage(new AxiosError("Net"))).toBe("Net");
  });

  it("stringifies unknown", () => {
    expect(errorMessage("x")).toBe("x");
  });
});
