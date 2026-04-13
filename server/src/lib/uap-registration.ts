import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const PRODUCT_CONFIG = {
  name: "sigops",
  displayName: "SigOps",
  description: "Signal Operations Platform",
  roles: [
    {
      name: "sigops_admin",
      displayName: "SigOps Admin",
      permissions: ["*"],
    },
    {
      name: "operator",
      displayName: "Operator",
      permissions: [
        "signals:*",
        "workflows:*",
        "executions:*",
        "tools:*",
      ],
    },
    {
      name: "developer",
      displayName: "Developer",
      permissions: [
        "signals:read",
        "workflows:*",
        "executions:read",
        "sel:*",
      ],
    },
    {
      name: "viewer",
      displayName: "Viewer",
      permissions: [
        "signals:read",
        "workflows:read",
        "executions:read",
      ],
    },
  ],
  plans: [
    {
      name: "starter",
      displayName: "Starter",
      limits: { signals: 1000, workflows: 5, agents: 2 },
      features: ["signal_ingestion", "basic_workflows"],
    },
    {
      name: "professional",
      displayName: "Professional",
      limits: { signals: 50000, workflows: 50, agents: 20 },
      features: ["signal_ingestion", "workflows", "sel_engine", "scheduling"],
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      limits: { signals: -1, workflows: -1, agents: -1 },
      features: ["*"],
    },
  ],
};

export async function registerWithUap(): Promise<void> {
  const uapUrl = env.UAP_URL;
  if (!uapUrl) {
    logger.warn("UAP_URL not configured, skipping product registration");
    return;
  }

  try {
    const res = await fetch(`${uapUrl}/api/v1/products/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PRODUCT_CONFIG),
    });

    if (res.ok) {
      logger.info({ product: PRODUCT_CONFIG.name }, "Registered with UAP");
    } else {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Failed to register with UAP");
    }
  } catch (err) {
    logger.warn({ err }, "UAP unavailable, will retry on next boot");
  }
}
