import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requestId } from "./request-id.js";

describe("requestId", () => {
  const app = new Hono();
  app.use("*", requestId);
  app.get("/", (c) => c.json({ id: c.get("requestId" as never) }));

  it("generates new id when missing", async () => {
    const res = await app.request("/");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("reuses incoming id", async () => {
    const res = await app.request("/", { headers: { "x-request-id": "abc-123" } });
    expect(res.headers.get("x-request-id")).toBe("abc-123");
  });
});
