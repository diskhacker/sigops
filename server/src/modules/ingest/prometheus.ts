import { z } from "zod";

/**
 * Prometheus Alertmanager webhook payload (v4).
 * https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
 */
export const prometheusWebhookSchema = z.object({
  version: z.string().optional(),
  groupKey: z.string().optional(),
  status: z.enum(["firing", "resolved"]),
  receiver: z.string().optional(),
  externalURL: z.string().optional(),
  alerts: z.array(
    z.object({
      status: z.enum(["firing", "resolved"]),
      labels: z.record(z.string()),
      annotations: z.record(z.string()).optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      generatorURL: z.string().optional(),
      fingerprint: z.string().optional(),
    }),
  ),
});

export type PrometheusWebhookPayload = z.infer<typeof prometheusWebhookSchema>;

export type NormalizedSignal = {
  source: "prometheus";
  severity: "critical" | "warning" | "info";
  title: string;
  body: Record<string, unknown>;
};

function mapSeverity(value: string | undefined): "critical" | "warning" | "info" {
  const v = (value ?? "").toLowerCase();
  if (v === "critical" || v === "error" || v === "page") return "critical";
  if (v === "warning" || v === "warn") return "warning";
  return "info";
}

/**
 * Convert a Prometheus Alertmanager webhook payload into normalized SigOps signals.
 * Resolved alerts are mapped to "info" severity so the downstream pipeline can
 * still dedupe and route them through signal rules.
 */
export function normalizePrometheusPayload(
  payload: PrometheusWebhookPayload,
): NormalizedSignal[] {
  const out: NormalizedSignal[] = [];
  for (const alert of payload.alerts) {
    const labels = alert.labels ?? {};
    const annotations = alert.annotations ?? {};
    const title =
      annotations.summary ??
      annotations.description ??
      labels.alertname ??
      "Prometheus alert";
    const severity =
      alert.status === "resolved" ? "info" : mapSeverity(labels.severity);
    out.push({
      source: "prometheus",
      severity,
      title,
      body: {
        status: alert.status,
        labels,
        annotations,
        startsAt: alert.startsAt,
        endsAt: alert.endsAt,
        generatorURL: alert.generatorURL,
        fingerprint: alert.fingerprint,
        receiver: payload.receiver,
        externalURL: payload.externalURL,
      },
    });
  }
  return out;
}
