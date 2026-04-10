import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const T = "550e8400-e29b-41d4-a716-446655440000";
const EID = "770e8400-e29b-41d4-a716-446655440001";
const STEPID = "880e8400-e29b-41d4-a716-446655440002";
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

const { executionRoutes } = await import("./routes.js");

function app() {
  const a = new Hono();
  a.route("/e", executionRoutes);
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

describe("execution routes", () => {
  beforeEach(() => { _r = []; _i = 0; });

  it("POST / rejects invalid", async () => {
    const res = await app().request("/e", post({}));
    expect(res.status).toBe(400);
  });

  it("POST / triggers execution", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request("/e", post({ workflowId: "wf1" }));
    expect(res.status).toBe(201);
  });

  it("GET / lists", async () => {
    _r = [[{ id: EID }], [{ count: 1 }]];
    const res = await app().request("/e");
    expect(res.status).toBe(200);
  });

  it("GET /:id returns", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}`);
    expect(res.status).toBe(200);
  });

  it("GET /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/e/nope");
    expect(res.status).toBe(404);
  });

  it("PATCH /:id updates status RUNNING", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}`, patch({ status: "RUNNING" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id updates status SUCCESS", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}`, patch({ status: "SUCCESS" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id updates status FAILED", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}`, patch({ status: "FAILED" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id rejects invalid", async () => {
    const res = await app().request(`/e/${EID}`, patch({ status: "NOPE" }));
    expect(res.status).toBe(400);
  });

  it("PATCH /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/e/nope", patch({ status: "RUNNING" }));
    expect(res.status).toBe(404);
  });

  it("DELETE /:id", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id 404", async () => {
    _r = [[]];
    const res = await app().request("/e/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("GET /:id/steps lists", async () => {
    _r = [[{ id: EID }], [{ id: STEPID }]];
    const res = await app().request(`/e/${EID}/steps`);
    expect(res.status).toBe(200);
  });

  it("GET /:id/steps 404", async () => {
    _r = [[]];
    const res = await app().request(`/e/${EID}/steps`);
    expect(res.status).toBe(404);
  });

  it("POST /:id/steps 404 when execution missing", async () => {
    _r = [[]];
    const res = await app().request(`/e/${EID}/steps`, post({ stepIndex: 0, toolName: "sigops.wait", input: { seconds: 1 } }));
    expect(res.status).toBe(404);
  });

  it("POST /:id/steps rejects invalid", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}/steps`, post({}));
    expect(res.status).toBe(400);
  });

  it("POST /:id/steps creates", async () => {
    _r = [[{ id: EID }], [{ id: STEPID }]];
    const res = await app().request(`/e/${EID}/steps`, post({
      stepIndex: 0, toolName: "sigops.wait", input: { seconds: 1 },
    }));
    expect(res.status).toBe(201);
  });

  it("PATCH /:id/steps/:stepId 404 when execution missing", async () => {
    _r = [[]];
    const res = await app().request(`/e/${EID}/steps/${STEPID}`, patch({ status: "SUCCESS" }));
    expect(res.status).toBe(404);
  });

  it("PATCH /:id/steps/:stepId rejects invalid", async () => {
    _r = [[{ id: EID }]];
    const res = await app().request(`/e/${EID}/steps/${STEPID}`, patch({ status: "NOPE" }));
    expect(res.status).toBe(400);
  });

  it("PATCH /:id/steps/:stepId updates", async () => {
    _r = [[{ id: EID }], [{ id: STEPID }]];
    const res = await app().request(`/e/${EID}/steps/${STEPID}`, patch({ status: "SUCCESS" }));
    expect(res.status).toBe(200);
  });

  it("PATCH /:id/steps/:stepId 404 when step missing", async () => {
    _r = [[{ id: EID }], []];
    const res = await app().request(`/e/${EID}/steps/${STEPID}`, patch({ status: "SUCCESS" }));
    expect(res.status).toBe(404);
  });
});
