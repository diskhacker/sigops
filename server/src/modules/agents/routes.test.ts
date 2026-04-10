import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const T = "550e8400-e29b-41d4-a716-446655440000";
const AID = "770e8400-e29b-41d4-a716-446655440001";
const TOOLID = "880e8400-e29b-41d4-a716-446655440002";
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

const { agentRoutes } = await import("./routes.js");

function app() {
  const a = new Hono();
  a.route("/a", agentRoutes);
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

describe("agent routes", () => {
  beforeEach(() => { _r = []; _i = 0; });

  it("POST / rejects invalid", async () => {
    const res = await app().request("/a", post({}));
    expect(res.status).toBe(400);
  });

  it("POST / registers agent", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request("/a", post({
      hostname: "host1", agentVersion: "0.1.0",
    }));
    expect(res.status).toBe(201);
  });

  it("GET / lists", async () => {
    _r = [[{ id: AID }], [{ count: 1 }]];
    const res = await app().request("/a");
    expect(res.status).toBe(200);
  });

  it("GET / searches", async () => {
    _r = [[], [{ count: 0 }]];
    const res = await app().request("/a?q=host");
    expect(res.status).toBe(200);
  });

  it("GET /:id returns", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request(`/a/${AID}`);
    expect(res.status).toBe(200);
  });

  it("GET /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/a/nope");
    expect(res.status).toBe(404);
  });

  it("PATCH /:id updates", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request(`/a/${AID}`, patch({ status: "DEGRADED" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id rejects invalid", async () => {
    const res = await app().request(`/a/${AID}`, patch({ status: "NOPE" }));
    expect(res.status).toBe(400);
  });

  it("PATCH /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/a/nope", patch({ status: "ONLINE" }));
    expect(res.status).toBe(404);
  });

  it("DELETE /:id", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request(`/a/${AID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/a/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("POST /:id/heartbeat rejects invalid", async () => {
    const res = await app().request(`/a/${AID}/heartbeat`, post({ status: "NOPE" }));
    expect(res.status).toBe(400);
  });

  it("POST /:id/heartbeat updates", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request(`/a/${AID}/heartbeat`, post({ status: "ONLINE", tools: ["sigops.wait"] }));
    expect(res.status).toBe(200);
  });

  it("POST /:id/heartbeat 404", async () => {
    _r = [[]];
    const res = await app().request("/a/nope/heartbeat", post({ status: "ONLINE" }));
    expect(res.status).toBe(404);
  });

  it("GET /:id/tools lists", async () => {
    _r = [[{ id: AID }], [{ id: TOOLID }]];
    const res = await app().request(`/a/${AID}/tools`);
    expect(res.status).toBe(200);
  });

  it("GET /:id/tools 404", async () => {
    _r = [[]];
    const res = await app().request("/a/nope/tools");
    expect(res.status).toBe(404);
  });

  it("POST /:id/tools 404 when agent missing", async () => {
    _r = [[]];
    const res = await app().request(`/a/${AID}/tools`, post({ toolName: "sigops.wait" }));
    expect(res.status).toBe(404);
  });

  it("POST /:id/tools rejects invalid", async () => {
    _r = [[{ id: AID }]];
    const res = await app().request(`/a/${AID}/tools`, post({}));
    expect(res.status).toBe(400);
  });

  it("POST /:id/tools creates", async () => {
    _r = [[{ id: AID }], [{ id: TOOLID }]];
    const res = await app().request(`/a/${AID}/tools`, post({ toolName: "sigops.wait", version: "1.0" }));
    expect(res.status).toBe(201);
  });
});
