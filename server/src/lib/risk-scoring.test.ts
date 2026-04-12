import { describe, it, expect } from "vitest";
import { computeRiskScore, type RiskInput } from "./risk-scoring.js";

describe("computeRiskScore", () => {
  it("returns low risk for simple safe workflow", () => {
    const input: RiskInput = {
      toolNames: ["sigops.wait", "sigops.condition"],
      stepCount: 2,
      triggerType: "manual",
    };
    const result = computeRiskScore(input);
    expect(result.level).toBe("low");
    expect(result.score).toBeLessThan(20);
    expect(result.factors).toHaveLength(0);
  });

  it("adds weight for high-risk tools", () => {
    const input: RiskInput = {
      toolNames: ["sigops.restart", "sigops.http"],
      stepCount: 2,
      triggerType: "manual",
    };
    const result = computeRiskScore(input);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.factors.some((f) => f.name === "high_risk_tools")).toBe(true);
  });

  it("adds weight for medium-risk tools", () => {
    const input: RiskInput = {
      toolNames: ["sigops.notify_slack"],
      stepCount: 2,
      triggerType: "manual",
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "medium_risk_tools")).toBe(true);
  });

  it("adds weight for many steps", () => {
    const input: RiskInput = {
      toolNames: ["sigops.wait"],
      stepCount: 10,
      triggerType: "manual",
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "step_count")).toBe(true);
  });

  it("adds weight for signal trigger", () => {
    const input: RiskInput = {
      toolNames: ["sigops.wait"],
      stepCount: 2,
      triggerType: "signal",
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "auto_triggered")).toBe(true);
  });

  it("adds weight for critical severity", () => {
    const input: RiskInput = {
      toolNames: ["sigops.wait"],
      stepCount: 2,
      triggerType: "signal",
      signalSeverity: "critical",
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "critical_signal")).toBe(true);
  });

  it("adds weight for warning severity", () => {
    const input: RiskInput = {
      toolNames: [],
      stepCount: 1,
      triggerType: "signal",
      signalSeverity: "warning",
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "warning_signal")).toBe(true);
  });

  it("adds weight for production target", () => {
    const input: RiskInput = {
      toolNames: ["sigops.restart"],
      stepCount: 3,
      triggerType: "signal",
      signalSeverity: "critical",
      targetLabels: { env: "production" },
    };
    const result = computeRiskScore(input);
    expect(result.factors.some((f) => f.name === "production_target")).toBe(true);
    expect(result.level).toBe("high" as string);
  });

  it("clamps score to max 100", () => {
    const input: RiskInput = {
      toolNames: [
        "sigops.restart", "sigops.restart", "sigops.restart",
        "sigops.http", "sigops.http", "sigops.http",
        "sigops.notify_slack", "sigops.notify_slack", "sigops.notify_slack",
      ],
      stepCount: 20,
      triggerType: "signal",
      signalSeverity: "critical",
      targetLabels: { env: "prod" },
    };
    const result = computeRiskScore(input);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe("critical");
  });

  it("returns critical for very high score", () => {
    const input: RiskInput = {
      toolNames: ["sigops.restart", "sigops.http", "sigops.restart"],
      stepCount: 12,
      triggerType: "signal",
      signalSeverity: "critical",
      targetLabels: { env: "prod" },
    };
    const result = computeRiskScore(input);
    expect(result.level).toBe("critical");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });
});
