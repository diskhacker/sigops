import { create } from "zustand";
import { persist } from "zustand/middleware";

type TenantState = {
  tenantId: string;
  token: string;
  setTenant: (id: string) => void;
  setToken: (t: string) => void;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: "dev-tenant",
      token: "",
      setTenant: (tenantId) => set({ tenantId }),
      setToken: (token) => set({ token }),
    }),
    { name: "sigops-tenant" },
  ),
);
