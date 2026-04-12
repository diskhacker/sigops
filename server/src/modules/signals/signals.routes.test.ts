import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./signals.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("signals routes", () => {
  it("lists with filters", async () => {
    queueResults([[{ id: "s1" }], [{ count: 1 }]]);
    const res = await app.request("/r?q=foo&severity=critical&status=OPEN&source=prometheus");
    expect(res.status).toBe(200);
  });

  it("lists empty filters", async () => {
    queueResults([[], [{ count: 0 }]]);
    expect((await app.request("/r")).status).toBe(200);
  });

  it("get one", async () => {
    queueResults([[{ id: "s1" }]]);
    expect((await app.request("/r/s1")).status).toBe(200);
  });

  it("get 404", async () => {
    queueResults([[]]);
    expect((await app.request("/r/x")).status).toBe(404);
  });

  it("ingest new signal", async () => {
    queueResults([[], [{ id: "s2", fingerprint: "fp" }]]);
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "prometheus",
        severity: "critical",
        title: "High CPU",
        body: { cpu: 99 },
      }),
    });
    expect(res.status).toBe(201);
  });

  it("ingest dedup returns existing", async () => {
    queueResults([[{ id: "s1", fingerprint: "fp" }]]);
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "prometheus",
        severity: "critical",
        title: "High CPU",
        body: { cpu: 99 },
      }),
    });
    expect(res.status).toBe(200);
  });

  it("ingest validation", async () => {
    const res = await app.request("/r", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "x" }),
    });
    expect(res.status).toBe(400);
  });

  it("update status", async () => {
    queueResults([[{ id: "s1" }]]);
    const res = await app.request("/r/s1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    expect(res.status).toBe(200);
  });

  it("update 404", async () => {
    queueResults([[]]);
    const res = await app.request("/r/x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    expect(res.status).toBe(404);
  });

  it("delete", async () => {
    queueResults([[{ id: "s1" }]]);
    expect((await app.request("/r/s1", { method: "DELETE" })).status).toBe(200);
  });

  it("delete 404", async () => {
    queueResults([[]]);
    expect((await app.request("/r/x", { method: "DELETE" })).status).toBe(404);
  });
});
