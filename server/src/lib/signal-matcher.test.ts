import { describe, it, expect } from "vitest";
import {
  matchesRule,
  findBestMatch,
  severityGte,
  type SignalPayload,
  type MatchableRule,
} from "./signal-matcher.js";

describe("severityGte", () => {
  it("critical >= critical", () => expect(severityGte("critical", "critical")).toBe(true));
  it("critical >= warning", () => expect(severityGte("critical", "warning")).toBe(true));
  it("critical >= info", () => expect(severityGte("critical", "info")).toBe(true));
  it("warning >= warning", () => expect(severityGte("warning", "warning")).toBe(true));
  it("warning < critical", () => expect(severityGte("warning", "critical")).toBe(false));
  it("info < warning", () => expect(severityGte("info", "warning")).toBe(false));
  it("info >= info", () => expect(severityGte("info", "info")).toBe(true));
});

describe("matchesRule", () => {
  const signal: SignalPayload = {
    source: "prometheus",
    severity: "critical",
    title: "High CPU on web-01",
    body: { host: "web-01", cpu: 95, region: "us-east" },
  };

  it("matches exact source", () => {
    expect(matchesRule(signal, { source: "prometheus" })).toBe(true);
  });

  it("rejects wrong source", () => {
    expect(matchesRule(signal, { source: "datadog" })).toBe(false);
  });

  it("matches severityGte threshold", () => {
    expect(matchesRule(signal, { severityGte: "warning" })).toBe(true);
    expect(matchesRule(signal, { severityGte: "critical" })).toBe(true);
  });

  it("rejects when severity below threshold", () => {
    const infoSignal = { ...signal, severity: "info" };
    expect(matchesRule(infoSignal, { severityGte: "warning" })).toBe(false);
  });

  it("matches title regex", () => {
    expect(matchesRule(signal, { titleRegex: "High CPU" })).toBe(true);
    expect(matchesRule(signal, { titleRegex: "web-\\d+" })).toBe(true);
  });

  it("rejects non-matching title regex", () => {
    expect(matchesRule(signal, { titleRegex: "^Low Memory" })).toBe(false);
  });

  it("matches body jsonpath", () => {
    expect(matchesRule(signal, { bodyJsonpath: "host" })).toBe(true);
    expect(matchesRule(signal, { bodyJsonpath: "region" })).toBe(true);
  });

  it("rejects missing body jsonpath", () => {
    expect(matchesRule(signal, { bodyJsonpath: "nonexistent.path" })).toBe(false);
  });

  it("matches compound conditions (all must pass)", () => {
    expect(
      matchesRule(signal, {
        source: "prometheus",
        severityGte: "warning",
        titleRegex: "CPU",
        bodyJsonpath: "host",
      }),
    ).toBe(true);
  });

  it("rejects when any compound condition fails", () => {
    expect(
      matchesRule(signal, {
        source: "prometheus",
        severityGte: "warning",
        titleRegex: "Memory", // fails
      }),
    ).toBe(false);
  });

  it("matches empty condition (catch-all)", () => {
    expect(matchesRule(signal, {})).toBe(true);
  });

  it("handles invalid regex gracefully", () => {
    expect(matchesRule(signal, { titleRegex: "[invalid" })).toBe(false);
  });
});

describe("findBestMatch", () => {
  const signal: SignalPayload = {
    source: "prometheus",
    severity: "critical",
    title: "Disk full on db-01",
    body: { host: "db-01", disk: 99 },
  };

  const rules: MatchableRule[] = [
    {
      id: "r1", name: "low-prio", condition: { source: "prometheus" },
      workflowId: "w1", priority: 10, isActive: true,
    },
    {
      id: "r2", name: "high-prio", condition: { source: "prometheus", severityGte: "critical" },
      workflowId: "w2", priority: 100, isActive: true,
    },
    {
      id: "r3", name: "inactive", condition: { source: "prometheus" },
      workflowId: "w3", priority: 200, isActive: false,
    },
  ];

  it("returns highest-priority active matching rule", () => {
    const result = findBestMatch(signal, rules);
    expect(result.matched).toBe(true);
    expect(result.rule?.id).toBe("r2");
    expect(result.workflowId).toBe("w2");
  });

  it("skips inactive rules", () => {
    // r3 has highest priority but is inactive
    const result = findBestMatch(signal, rules);
    expect(result.rule?.id).not.toBe("r3");
  });

  it("returns no match when no rules match", () => {
    const noMatchSignal: SignalPayload = {
      source: "datadog",
      severity: "info",
      title: "Heartbeat OK",
      body: {},
    };
    const result = findBestMatch(noMatchSignal, rules);
    expect(result.matched).toBe(false);
    expect(result.rule).toBeNull();
    expect(result.workflowId).toBeNull();
  });

  it("returns no match with empty rules", () => {
    const result = findBestMatch(signal, []);
    expect(result.matched).toBe(false);
  });
});
