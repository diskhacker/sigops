import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { AppError } from "../../lib/errors.js";

// Mock db and logger before module imports
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../../db/index.js", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelect }) }) }),
    insert: () => ({ values: mockInsert }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}));

const mockLogger = { level: "info", info: vi.fn(), warn: vi.fn() };
vi.mock("../../config/logger.js", () => ({ logger: mockLogger }));
vi.mock("../../middleware/auth.js", () => ({
  requireAuth: async (c: any, next: any) => {
    const role = c.req.header("x-test-role") ?? "platform_admin";
    c.set("user", { sub: "u-1", roles: [role] });
    c.set("tenantId", "t-1");
    await next();
  },
}));

const routesMod = await import("./platform-config.routes.js");
const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/platform-config", routesMod.default);

beforeEach(() => {
  vi.clearAllMocks();
  mockLogger.level = "info";
});

describe("platform-config routes", () => {
  it("GET /log-level returns current level", async () => {
    mockSelect.mockResolvedValue([{ key: "log_level", value: "debug" }]);
    const res = await app.request("/platform-config/log-level");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current).toBe("debug");
  });

  it("PUT /log-level changes level and persists", async () => {
    // First select returns existing row, second select returns nothing (re-read for previous)
    mockSelect
      .mockResolvedValueOnce([{ key: "log_level", value: "info" }]) // getLogLevel for previous
      .mockResolvedValueOnce([{ key: "log_level", value: "info" }]) // existing check
      .mockResolvedValue([]);
    mockUpdate.mockResolvedValue([{}]);
    mockInsert.mockResolvedValue([{}]);

    const res = await app.request("/platform-config/log-level", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ level: "debug" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.previous).toBe("info");
    expect(body.current).toBe("debug");
    expect(typeof body.changedAt).toBe("string");
    expect(mockLogger.level).toBe("debug");
  });

  it("PUT /log-level rejects invalid level", async () => {
    const res = await app.request("/platform-config/log-level", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ level: "verbose" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /log-level returns 403 for tenant_user role", async () => {
    const res = await app.request("/platform-config/log-level", {
      headers: { "x-test-role": "tenant_user" },
    });
    expect(res.status).toBe(403);
  });

  it("PUT /log-level returns 403 for tenant_user role", async () => {
    const res = await app.request("/platform-config/log-level", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-test-role": "tenant_user" },
      body: JSON.stringify({ level: "debug" }),
    });
    expect(res.status).toBe(403);
  });

  it("support_engineer can change log level", async () => {
    mockSelect
      .mockResolvedValueOnce([]) // getLogLevel → fallback to logger.level
      .mockResolvedValueOnce([]) // no existing row
      .mockResolvedValue([]);
    mockInsert.mockResolvedValue([{}]);

    const res = await app.request("/platform-config/log-level", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-test-role": "support_engineer" },
      body: JSON.stringify({ level: "trace" }),
    });
    expect(res.status).toBe(200);
  });
});
