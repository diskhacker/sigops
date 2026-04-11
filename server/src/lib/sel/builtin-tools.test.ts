import { describe, it, expect, vi } from "vitest";
import { toolRegistry, type ToolContext } from "./builtin-tools.js";

const ctx: ToolContext = { tenantId: "t1" };

describe("builtin tools", () => {
  const registry = toolRegistry();

  it("sigops.http makes request and returns status+body", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const http = registry.get("sigops.http")!;
    const out = (await http.execute(
      { url: "https://x.test/api", method: "POST", body: { a: 1 } },
      { tenantId: "t", fetchImpl: fakeFetch as unknown as typeof fetch },
    )) as { status: number; body: unknown };
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true });
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it("sigops.http rejects invalid url", async () => {
    const http = registry.get("sigops.http")!;
    await expect(http.execute({ url: "not-a-url" }, ctx)).rejects.toThrow();
  });

  it("sigops.notify_slack calls the hook", async () => {
    const webhook = vi.fn(async () => undefined);
    const slack = registry.get("sigops.notify_slack")!;
    const out = (await slack.execute(
      { channel: "#x", message: "hi" },
      { tenantId: "t", slackWebhook: webhook },
    )) as { delivered: boolean };
    expect(out.delivered).toBe(true);
    expect(webhook).toHaveBeenCalledWith("#x", "hi");
  });

  it("sigops.notify_slack falls back to stub when no hook", async () => {
    const slack = registry.get("sigops.notify_slack")!;
    const out = (await slack.execute(
      { channel: "#x", message: "hi" },
      { tenantId: "t" },
    )) as { delivered: boolean };
    expect(out.delivered).toBe(true);
  });

  it("sigops.wait sleeps the requested duration", async () => {
    const sleep = vi.fn(async () => undefined);
    const wait = registry.get("sigops.wait")!;
    const out = (await wait.execute(
      { seconds: 2.5 },
      { tenantId: "t", sleepImpl: sleep },
    )) as { waitedMs: number };
    expect(out.waitedMs).toBe(2500);
    expect(sleep).toHaveBeenCalledWith(2500);
  });

  it("sigops.wait rejects negative seconds", async () => {
    const wait = registry.get("sigops.wait")!;
    await expect(wait.execute({ seconds: -1 }, ctx)).rejects.toThrow();
  });

  it("sigops.restart delegates to impl", async () => {
    const impl = vi.fn(async () => ({ ok: true }));
    const restart = registry.get("sigops.restart")!;
    const out = (await restart.execute(
      { service: "nginx" },
      { tenantId: "t", restartImpl: impl },
    )) as { ok: boolean };
    expect(out.ok).toBe(true);
    expect(impl).toHaveBeenCalledWith("nginx", "systemctl");
  });

  it("sigops.restart stub returns ok when no impl", async () => {
    const restart = registry.get("sigops.restart")!;
    const out = (await restart.execute(
      { service: "nginx", method: "docker" },
      ctx,
    )) as { ok: boolean; service: string };
    expect(out.ok).toBe(true);
    expect(out.service).toBe("nginx");
  });

  it("sigops.condition evaluates numeric comparisons", async () => {
    const cond = registry.get("sigops.condition")!;
    expect(await cond.execute({ expression: "10 > 5" }, ctx)).toEqual({
      result: true,
    });
    expect(await cond.execute({ expression: "10 <= 5" }, ctx)).toEqual({
      result: false,
    });
    expect(await cond.execute({ expression: "3.14 == 3.14" }, ctx)).toEqual({
      result: true,
    });
  });

  it("sigops.condition evaluates string equality", async () => {
    const cond = registry.get("sigops.condition")!;
    expect(
      await cond.execute({ expression: `'ok' == 'ok'` }, ctx),
    ).toEqual({ result: true });
    expect(
      await cond.execute({ expression: `'ok' != 'bad'` }, ctx),
    ).toEqual({ result: true });
  });

  it("sigops.condition rejects bad expressions", async () => {
    const cond = registry.get("sigops.condition")!;
    await expect(
      cond.execute({ expression: "1 + 1" }, ctx),
    ).rejects.toThrow();
  });
});
