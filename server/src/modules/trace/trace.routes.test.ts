import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { AppError } from "../../lib/errors.js";

const mockSelectResults: unknown[][] = [];
let selectIndex = 0;

const makeSelectChain = () => {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "orderBy", "limit", "offset", "innerJoin", "leftJoin"];
  for (const m of methods) chain[m] = () => chain;
  chain.then = (ok: (v: unknown) => unknown) => {
    const result = mockSelectResults[selectIndex++] ?? [];
    return Promise.resolve(result).then(ok);
  };
  return chain;
};

vi.mock("../../db/index.js", () => ({
  db: { select: () => makeSelectChain() },
}));
vi.mock("../../middleware/auth.js", () => ({
  requireAuth: async (c: any, next: any) => {
    c.set("user", { sub: "u-1", roles: ["tenant_admin"] });
    c.set("tenantId", "t-1");
    await next();
  },
}));

const mod = await import("./trace.routes.js");
const app = new Hono();
app.onError((err, c) => {
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/trace", mod.default);

function resetSelect(rows: unknown[][]) {
  mockSelectResults.length = 0;
  mockSelectResults.push(...rows);
  selectIndex = 0;
}

describe("trace routes", () => {
  beforeEach(() => resetSelect([]));

  it("returns 404 for unknown trace_id", async () => {
    resetSelect([[]]); // empty executions
    const res = await app.request("/trace/unknown-trace");
    expect(res.status).toBe(404);
  });

  it("GET /trace/:id returns correct data shape", async () => {
    const now = new Date();
    const later = new Date(now.getTime() + 1000);
    resetSelect([
      [{ id: "e1", status: "SUCCESS", traceId: "tr-1", signalId: "s1", startedAt: now, completedAt: later }],
      [{ id: "st1", executionId: "e1", stepIndex: 0 }],
      [{ id: "s1" }],
    ]);
    const res = await app.request("/trace/tr-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trace_id).toBe("tr-1");
    expect(Array.isArray(body.executions)).toBe(true);
    expect(Array.isArray(body.steps)).toBe(true);
    expect(Array.isArray(body.signals)).toBe(true);
    expect(typeof body.status).toBe("string");
  });

  it("status is 'success' when all executions succeeded", async () => {
    const now = new Date();
    resetSelect([
      [{ id: "e1", status: "SUCCESS", signalId: null, startedAt: now, completedAt: now }],
      [], // steps
      [], // signals
    ]);
    const res = await app.request("/trace/tr-success");
    const body = await res.json();
    expect(body.status).toBe("success");
  });

  it("status is 'in_progress' when execution is running", async () => {
    resetSelect([
      [{ id: "e1", status: "RUNNING", signalId: null, startedAt: new Date(), completedAt: null }],
      [],
      [],
    ]);
    const res = await app.request("/trace/tr-running");
    const body = await res.json();
    expect(body.status).toBe("in_progress");
  });

  it("duration_ms computed correctly", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T00:00:02Z"); // 2000ms later
    resetSelect([
      [{ id: "e1", status: "SUCCESS", signalId: null, startedAt: t0, completedAt: t1 }],
      [],
      [],
    ]);
    const res = await app.request("/trace/tr-dur");
    const body = await res.json();
    expect(body.duration_ms).toBe(2000);
  });
});
