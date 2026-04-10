import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./workflow-schedules.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("workflow-schedules routes", () => {
  it("lists", async () => {
    queueResults([[{ id: "r1" }], [{ count: 1 }]]);
    expect((await app.request("/r?workflowId=x&isActive=true")).status).toBe(200);
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
      body: JSON.stringify({workflowId: "x", cron: "x"}),
    });
    expect(res.status).toBe(201);
  });

  it("create validation", async () => {
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({workflowId: ""}),
    });
    expect(res.status).toBe(400);
  });

  it("update", async () => {
    queueResults([[{ id: "r1" }]]);
    const res = await app.request("/r/r1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({cron: "x"}),
    });
    expect(res.status).toBe(200);
  });

  it("update 404", async () => {
    queueResults([[]]);
    const res = await app.request("/r/x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({cron: "x"}),
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
});
