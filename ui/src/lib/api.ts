import axios, { AxiosError } from "axios";
import { useTenantStore } from "./tenant-store.js";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "content-type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const { token, tenantId } = useTenantStore.getState();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  cfg.headers["x-tenant-id"] = tenantId;
  return cfg;
});

export type ApiError = { error: { code: string; message: string; details?: unknown } };

export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error?.message || err.message;
  }
  return String(err);
}
