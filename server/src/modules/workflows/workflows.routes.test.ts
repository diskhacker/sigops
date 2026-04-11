import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./workflows.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("workflows routes", () => {
  it("lists", async () => {
    queueResults([[{ id: "r1" }], [{ count: 1 }]]);
    expect((await app.request("/r?isActive=true")).status).toBe(200);
  });

  it("get one", async () => {
    queueResults([[{ id: "r1" }]]);
    expect((await app.request("/r/r1")).status).toBe(200);
  });

  it("get 404", async () => {
    queueResults([[]]);
    expect((await app.request("/r/x")).status).toBe(404);
  });

  it("create", async () => {
    queueResults([[{ id: "r2" }]]);
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "x",
        selCode: `@sigops.wait {"seconds":0}`,
        triggerRules: {},
      }),
    });
    expect(res.status).toBe(201);
  });

  it("create rejects invalid SEL", async () => {
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "x",
        selCode: "garbage",
        triggerRules: {},
      }),
    });
    expect(res.status).toBe(400);
  });

  it("create validation", async () => {
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({name: ""}),
    });
    expect(res.status).toBe(400);
  });

  it("update", async () => {
    queueResults([[{ id: "r1" }]]);
    const res = await app.request("/r/r1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({name: "x"}),
    });
    expect(res.status).toBe(200);
  });

  it("update 404", async () => {
    queueResults([[]]);
    const res = await app.request("/r/x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({name: "x"}),
    });
    expect(res.status).toBe(404);
  });

  it("delete", async () => {
    queueResults([[{ id: "r1" }]]);
    expect((await app.request("/r/r1", { method: "DELETE" })).status).toBe(200);
  });

  it("delete 404", async () => {
    queueResults([[]]);
    expect((await app.request("/r/x", { method: "DELETE" })).status).toBe(404);
  });

  it("update rejects invalid SEL", async () => {
    const res = await app.request("/r/r1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selCode: "garbage line" }),
    });
    expect(res.status).toBe(400);
  });

  it("trigger 404 when workflow missing", async () => {
    queueResults([[]]);
    const res = await app.request("/r/x/trigger", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("trigger rejects inactive workflow", async () => {
    queueResults([
      [
        {
          id: "w1",
          tenantId: "t",
          selCode: `@sigops.wait {"seconds":0}`,
          isActive: false,
        },
      ],
    ]);
    const res = await app.request("/r/w1/trigger", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("trigger runs SEL and returns result", async () => {
    queueResults([
      [
        {
          id: "w1",
          tenantId: "t",
          selCode: `@sigops.wait {"seconds":0}`,
          isActive: true,
        },
      ],
      [{ id: "e1", status: "RUNNING" }],
      [],
      [
        {
          id: "e1",
          status: "SUCCESS",
          durationMs: 5,
        },
      ],
    ]);
    const res = await app.request("/r/w1/trigger", { method: "POST" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      execution: { id: string };
      result: { status: string; steps: unknown[] };
    };
    expect(json.execution.id).toBe("e1");
    expect(json.result.status).toBe("SUCCESS");
    expect(json.result.steps).toHaveLength(1);
  });

  it("trigger rejects workflow with invalid SEL", async () => {
    queueResults([
      [
        {
          id: "w2",
          tenantId: "t",
          selCode: "not valid",
          isActive: true,
        },
      ],
    ]);
    const res = await app.request("/r/w2/trigger", { method: "POST" });
    expect(res.status).toBe(400);
  });
});
