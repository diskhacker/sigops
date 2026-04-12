import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { queueResults, resetMockDb, mockDb, mockAuthMiddleware } from "../../test/mock-db.js";
import { AppError } from "../../lib/errors.js";

vi.mock("../../db/index.js", () => ({ db: mockDb }));
vi.mock("../../middleware/auth.js", () => mockAuthMiddleware);

const mod = (await import("./sel.routes.js")).default;

const app = new Hono();
app.onError((err, c) => {
  if (err instanceof ZodError) return c.json({ error: "VAL" }, 400);
  if (err instanceof AppError) return c.json({ error: err.code }, err.status as 400);
  return c.json({ error: "E" }, 500);
});
app.route("/r", mod);

beforeEach(() => resetMockDb());

describe("sel routes", () => {
  it("validate valid SEL", async () => {
    const res = await app.request("/r/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `@sigops.wait {"seconds":1}` }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { valid: boolean; stepCount: number };
    expect(json.valid).toBe(true);
    expect(json.stepCount).toBe(1);
  });

  it("validate invalid SEL", async () => {
    const res = await app.request("/r/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "garbage" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { valid: boolean; error: string };
    expect(json.valid).toBe(false);
    expect(json.error).toContain("SEL parse error");
  });

  it("validate rejects empty code", async () => {
    const res = await app.request("/r/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("parse valid SEL", async () => {
    const res = await app.request("/r/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `@sigops.wait {"seconds":1}\n@sigops.http {"url":"https://x.com","method":"GET"}` }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { steps: { tool: string }[] };
    expect(json.steps).toHaveLength(2);
    expect(json.steps[0].tool).toBe("sigops.wait");
    expect(json.steps[1].tool).toBe("sigops.http");
  });

  it("parse rejects invalid SEL", async () => {
    const res = await app.request("/r/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "bad line" }),
    });
    expect(res.status).toBe(400);
  });

  it("test runs SEL dry-run", async () => {
    const res = await app.request("/r/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `@sigops.condition {"expression":"1 == 1"}` }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string; steps: unknown[] };
    expect(json.status).toBe("SUCCESS");
    expect(json.steps).toHaveLength(1);
  });

  it("test returns FAILED for unknown tool", async () => {
    const res = await app.request("/r/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `@unknown.tool {"x":1}` }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string };
    expect(json.status).toBe("FAILED");
  });

  it("deploy updates workflow selCode", async () => {
    queueResults([[{ id: "w1", selCode: `@sigops.wait {"seconds":1}` }]]);
    const res = await app.request("/r/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: `@sigops.wait {"seconds":2}`,
        workflowId: "00000000-0000-0000-0000-000000000001",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("deploy rejects invalid SEL", async () => {
    const res = await app.request("/r/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: "not valid sel",
        workflowId: "00000000-0000-0000-0000-000000000001",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("deploy 404 for missing workflow", async () => {
    queueResults([[]]);
    const res = await app.request("/r/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: `@sigops.wait {"seconds":1}`,
        workflowId: "00000000-0000-0000-0000-000000000001",
      }),
    });
    expect(res.status).toBe(404);
  });
});
