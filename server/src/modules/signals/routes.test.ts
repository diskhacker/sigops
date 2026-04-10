import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const T = "550e8400-e29b-41d4-a716-446655440000";
const SID = "770e8400-e29b-41d4-a716-446655440001";
let _r: unknown[][] = [];
let _i = 0;

function ch() {
  let d = false, v: unknown[];
  const g = () => { if (!d) { v = _r[_i++] || []; d = true; } return v; };
  const c: any = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy", "set", "values"]) c[m] = () => c;
  c.returning = () => Promise.resolve(g());
  c.then = (ok: any, er: any) => Promise.resolve(g()).then(ok, er);
  return c;
}

vi.mock("../../db/index.js", () => ({
  db: { select: () => ch(), insert: () => ch(), update: () => ch(), delete: () => ch() },
}));

vi.mock("../../middleware/auth.js", () => ({
  requireAuth: async (c: any, next: any) => {
    c.set("user", { sub: "user-1" });
    c.set("tenantId", T);
    await next();
  },
}));

const { signalRoutes } = await import("./routes.js");

function app() {
  const a = new Hono();
  a.route("/signals", signalRoutes);
  return a;
}

const post = (data: Record<string, unknown>) => ({
  method: "POST" as const,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

const patch = (data: Record<string, unknown>) => ({
  method: "PATCH" as const,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

describe("signal routes", () => {
  beforeEach(() => { _r = []; _i = 0; });

  it("POST / rejects invalid", async () => {
    const res = await app().request("/signals", post({}));
    expect(res.status).toBe(400);
  });

  it("POST / ingests signal", async () => {
    _r = [[{ id: SID }]];
    const res = await app().request("/signals", post({
      source: "prometheus",
      severity: "critical",
      title: "CPU high",
      body: { host: "srv1" },
    }));
    expect(res.status).toBe(201);
  });

  it("GET / lists", async () => {
    _r = [[{ id: SID }], [{ count: 1 }]];
    const res = await app().request("/signals");
    expect(res.status).toBe(200);
  });

  it("GET / with filters", async () => {
    _r = [[], [{ count: 0 }]];
    const res = await app().request("/signals?severity=critical&status=OPEN&source=prom&q=cpu");
    expect(res.status).toBe(200);
  });

  it("GET / rejects invalid filter", async () => {
    const res = await app().request("/signals?severity=nope");
    expect(res.status).toBe(400);
  });

  it("GET /:id returns", async () => {
    _r = [[{ id: SID }]];
    const res = await app().request(`/signals/${SID}`);
    expect(res.status).toBe(200);
  });

  it("GET /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/signals/nope");
    expect(res.status).toBe(404);
  });

  it("PATCH /:id updates status", async () => {
    _r = [[{ id: SID, status: "RESOLVED" }]];
    const res = await app().request(`/signals/${SID}`, patch({ status: "RESOLVED" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id rejects invalid", async () => {
    const res = await app().request(`/signals/${SID}`, patch({ status: "NOPE" }));
    expect(res.status).toBe(400);
  });

  it("PATCH /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/signals/nope", patch({ status: "ACKNOWLEDGED" }));
    expect(res.status).toBe(404);
  });

  it("DELETE /:id", async () => {
    _r = [[{ id: SID }]];
    const res = await app().request(`/signals/${SID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/signals/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
