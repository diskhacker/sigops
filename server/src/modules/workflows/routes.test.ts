import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const T = "550e8400-e29b-41d4-a716-446655440000";
const WID = "770e8400-e29b-41d4-a716-446655440001";
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

const { workflowRoutes } = await import("./routes.js");

function app() {
  const a = new Hono();
  a.route("/wf", workflowRoutes);
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

describe("workflow routes", () => {
  beforeEach(() => { _r = []; _i = 0; });

  it("POST / rejects invalid", async () => {
    const res = await app().request("/wf", post({}));
    expect(res.status).toBe(400);
  });

  it("POST / creates", async () => {
    _r = [[{ id: WID }]];
    const res = await app().request("/wf", post({
      name: "Restart on critical",
      selCode: "rule { match { severity >= critical } do { restart } }",
      triggerRules: { severityGte: "critical" },
    }));
    expect(res.status).toBe(201);
  });

  it("GET / lists", async () => {
    _r = [[{ id: WID }], [{ count: 1 }]];
    const res = await app().request("/wf");
    expect(res.status).toBe(200);
  });

  it("GET / searches", async () => {
    _r = [[], [{ count: 0 }]];
    const res = await app().request("/wf?q=restart");
    expect(res.status).toBe(200);
  });

  it("GET /:id returns", async () => {
    _r = [[{ id: WID }]];
    const res = await app().request(`/wf/${WID}`);
    expect(res.status).toBe(200);
  });

  it("GET /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/wf/nope");
    expect(res.status).toBe(404);
  });

  it("PATCH /:id updates", async () => {
    _r = [[{ id: WID }]];
    const res = await app().request(`/wf/${WID}`, patch({ isActive: false }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id rejects invalid", async () => {
    const res = await app().request(`/wf/${WID}`, patch({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("PATCH /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/wf/nope", patch({ isActive: false }));
    expect(res.status).toBe(404);
  });

  it("DELETE /:id", async () => {
    _r = [[{ id: WID }]];
    const res = await app().request(`/wf/${WID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/wf/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
