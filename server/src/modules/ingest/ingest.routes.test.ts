import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./ingest.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("ingest routes", () => {
  it("ingests prometheus payload (new + dedup)", async () => {
    // alert 1: not found => inserted
    // alert 2: found existing => deduped
    queueResults([
      [],
      [{ id: "s1" }],
      [{ id: "existing" }],
    ]);
    const res = await app.request("/r/prometheus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "firing",
        alerts: [
          {
            status: "firing",
            labels: { alertname: "HighCPU", severity: "critical" },
            annotations: { summary: "CPU > 95%" },
          },
          {
            status: "resolved",
            labels: { alertname: "DiskFull", severity: "warning" },
          },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.ingested).toBe(1);
    expect(body.deduped).toBe(1);
  });

  it("rejects malformed prometheus payload", async () => {
    const res = await app.request("/r/prometheus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alerts: "oops" }),
    });
    expect(res.status).toBe(400);
  });

  it("ingests generic webhook signal", async () => {
    queueResults([[], [{ id: "s1" }]]);
    const res = await app.request("/r/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "webhook",
        severity: "warning",
        title: "Latency spike",
        body: { p99: 1200 },
      }),
    });
    expect(res.status).toBe(201);
  });

  it("dedupes generic webhook on fingerprint", async () => {
    queueResults([[{ id: "existing" }]]);
    const res = await app.request("/r/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "webhook",
        severity: "warning",
        title: "Latency spike",
        body: { p99: 1200 },
      }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects invalid webhook payload", async () => {
    const res = await app.request("/r/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "webhook" }),
    });
    expect(res.status).toBe(400);
  });
});
