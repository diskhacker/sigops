import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./stats.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("stats routes", () => {
  it("returns dashboard stats", async () => {
    queueResults([
      [{ open: 2, acknowledged: 1, resolved: 3, suppressed: 0, total: 6 }],
      [{ critical: 1, warning: 2, info: 3 }],
      [
        {
          pending: 0,
          running: 1,
          success: 4,
          failed: 1,
          rolledBack: 0,
          cancelled: 0,
          total: 6,
          avgDurationMs: 1200,
        },
      ],
      [{ online: 2, degraded: 0, offline: 1, total: 3 }],
      [{ active: 3, inactive: 1, total: 4 }],
    ]);
    const res = await app.request("/r");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signals.total).toBe(6);
    expect(body.signalsBySeverity.critical).toBe(1);
    expect(body.executions.total).toBe(6);
    expect(body.executions.successRate).toBeGreaterThan(0);
    expect(body.agents.total).toBe(3);
    expect(body.workflows.total).toBe(4);
  });

  it("handles empty stats gracefully", async () => {
    queueResults([
      [{ open: 0, acknowledged: 0, resolved: 0, suppressed: 0, total: 0 }],
      [{ critical: 0, warning: 0, info: 0 }],
      [
        {
          pending: 0,
          running: 0,
          success: 0,
          failed: 0,
          rolledBack: 0,
          cancelled: 0,
          total: 0,
          avgDurationMs: 0,
        },
      ],
      [{ online: 0, degraded: 0, offline: 0, total: 0 }],
      [{ active: 0, inactive: 0, total: 0 }],
    ]);
    const res = await app.request("/r");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions.successRate).toBe(0);
  });

  it("returns signals trend", async () => {
    queueResults([[{ day: "2026-04-10", count: 4 }]]);
    const res = await app.request("/r/signals-trend");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trend[0].count).toBe(4);
  });
});
