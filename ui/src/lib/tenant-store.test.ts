import { describe, it, expect, beforeEach } from "vitest";
import { useTenantStore } from "./tenant-store.js";

describe("tenant-store", () => {
  beforeEach(() => {
    useTenantStore.getState().setTenant("dev-tenant");
    useTenantStore.getState().setToken("");
  });

  it("has default tenant", () => {
    expect(useTenantStore.getState().tenantId).toBe("dev-tenant");
  });

  it("setTenant updates id", () => {
    useTenantStore.getState().setTenant("t2");
    expect(useTenantStore.getState().tenantId).toBe("t2");
  });

  it("setToken updates token", () => {
    useTenantStore.getState().setToken("tok");
    expect(useTenantStore.getState().token).toBe("tok");
  });
});
