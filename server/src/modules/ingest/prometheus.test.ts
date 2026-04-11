import { describe, it, expect } from "vitest";
import { normalizePrometheusPayload, prometheusWebhookSchema } from "./prometheus.js";

describe("prometheus adapter", () => {
  it("normalizes firing critical alerts", () => {
    const raw = {
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: { alertname: "Oom", severity: "critical" },
          annotations: { summary: "OOM killer triggered" },
          startsAt: "2026-01-01T00:00:00Z",
        },
      ],
    };
    const parsed = prometheusWebhookSchema.parse(raw);
    const out = normalizePrometheusPayload(parsed);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("prometheus");
    expect(out[0].severity).toBe("critical");
    expect(out[0].title).toBe("OOM killer triggered");
  });

  it("maps warning/warn to warning", () => {
    const out = normalizePrometheusPayload({
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: { alertname: "X", severity: "warn" },
        },
      ],
    });
    expect(out[0].severity).toBe("warning");
  });

  it("maps resolved alerts to info severity", () => {
    const out = normalizePrometheusPayload({
      status: "resolved",
      alerts: [
        {
          status: "resolved",
          labels: { alertname: "X", severity: "critical" },
        },
      ],
    });
    expect(out[0].severity).toBe("info");
  });

  it("falls back to alertname when annotations missing", () => {
    const out = normalizePrometheusPayload({
      status: "firing",
      alerts: [
        { status: "firing", labels: { alertname: "FallbackName" } },
      ],
    });
    expect(out[0].title).toBe("FallbackName");
  });

  it("uses default title when nothing available", () => {
    const out = normalizePrometheusPayload({
      status: "firing",
      alerts: [{ status: "firing", labels: {} }],
    });
    expect(out[0].title).toBe("Prometheus alert");
  });
});
