/**
 * Risk scoring — computes a risk assessment for a workflow execution.
 *
 * The risk score has a level (low / medium / high / critical) and a list
 * of factors that contributed to the score. Risk is computed from:
 *
 * 1. Tool types used (restart, http = higher risk)
 * 2. Number of steps (more steps = higher risk)
 * 3. Trigger type (signal-triggered = higher than manual)
 * 4. Severity of triggering signal
 * 5. Whether the workflow targets production (labels/metadata)
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
}

export interface RiskScore {
  level: RiskLevel;
  score: number; // 0–100
  factors: RiskFactor[];
}

export interface RiskInput {
  toolNames: string[];
  stepCount: number;
  triggerType: string; // signal / manual / schedule
  signalSeverity?: string; // critical / warning / info
  targetLabels?: Record<string, unknown>; // agent labels
}

const HIGH_RISK_TOOLS = new Set([
  "sigops.restart",
  "sigops.http",
]);

const MEDIUM_RISK_TOOLS = new Set([
  "sigops.notify_slack",
]);

export function computeRiskScore(input: RiskInput): RiskScore {
  const factors: RiskFactor[] = [];
  let score = 0;

  // Factor 1: High-risk tools
  const highRiskCount = input.toolNames.filter((t) =>
    HIGH_RISK_TOOLS.has(t),
  ).length;
  if (highRiskCount > 0) {
    const weight = Math.min(highRiskCount * 15, 40);
    score += weight;
    factors.push({
      name: "high_risk_tools",
      weight,
      description: `${highRiskCount} high-risk tool(s): ${input.toolNames.filter((t) => HIGH_RISK_TOOLS.has(t)).join(", ")}`,
    });
  }

  // Factor 2: Medium-risk tools
  const medRiskCount = input.toolNames.filter((t) =>
    MEDIUM_RISK_TOOLS.has(t),
  ).length;
  if (medRiskCount > 0) {
    const weight = Math.min(medRiskCount * 5, 15);
    score += weight;
    factors.push({
      name: "medium_risk_tools",
      weight,
      description: `${medRiskCount} medium-risk tool(s)`,
    });
  }

  // Factor 3: Step count
  if (input.stepCount > 5) {
    const weight = Math.min((input.stepCount - 5) * 3, 20);
    score += weight;
    factors.push({
      name: "step_count",
      weight,
      description: `${input.stepCount} steps (complex workflow)`,
    });
  }

  // Factor 4: Trigger type
  if (input.triggerType === "signal") {
    score += 10;
    factors.push({
      name: "auto_triggered",
      weight: 10,
      description: "Triggered automatically by signal",
    });
  }

  // Factor 5: Signal severity
  if (input.signalSeverity === "critical") {
    score += 15;
    factors.push({
      name: "critical_signal",
      weight: 15,
      description: "Triggered by critical severity signal",
    });
  } else if (input.signalSeverity === "warning") {
    score += 5;
    factors.push({
      name: "warning_signal",
      weight: 5,
      description: "Triggered by warning severity signal",
    });
  }

  // Factor 6: Production target
  const labels = input.targetLabels ?? {};
  const env = String(labels.env ?? labels.environment ?? "").toLowerCase();
  if (env === "production" || env === "prod") {
    score += 20;
    factors.push({
      name: "production_target",
      weight: 20,
      description: "Targets production environment",
    });
  }

  // Clamp to 0–100
  score = Math.min(Math.max(score, 0), 100);

  const level = scoreToLevel(score);

  return { level, score, factors };
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}
