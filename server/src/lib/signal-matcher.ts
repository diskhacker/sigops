/**
 * Signal matcher — matches incoming signals against signal rules and
 * returns the best-matching rule (highest priority) to auto-trigger
 * a workflow.
 *
 * Rule conditions (stored in `pattern` jsonb):
 *   - source: exact match on signal source
 *   - severityGte: signal severity >= threshold (critical > warning > info)
 *   - titleRegex: regex match on signal title
 *   - bodyJsonpath: simple dot-path check on signal body
 */

export interface SignalPayload {
  source: string;
  severity: string;
  title: string;
  body: Record<string, unknown>;
}

export interface RulePattern {
  source?: string;
  severityGte?: string;
  titleRegex?: string;
  bodyJsonpath?: string;
}

export interface MatchableRule {
  id: string;
  name: string;
  pattern: RulePattern;
  workflowId: string;
  priority: number;
  isActive: boolean;
  dedupWindowSec?: number;
  suppressWindowSec?: number;
}

export interface MatchResult {
  matched: boolean;
  rule: MatchableRule | null;
  workflowId: string | null;
}

const SEVERITY_ORDER: Record<string, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export function severityGte(actual: string, threshold: string): boolean {
  const a = SEVERITY_ORDER[actual] ?? -1;
  const t = SEVERITY_ORDER[threshold] ?? -1;
  return a >= t;
}

export function matchesRule(signal: SignalPayload, pattern: RulePattern): boolean {
  // Source match
  if (pattern.source && pattern.source !== signal.source) return false;

  // Severity threshold
  if (pattern.severityGte && !severityGte(signal.severity, pattern.severityGte)) {
    return false;
  }

  // Title regex
  if (pattern.titleRegex) {
    try {
      const re = new RegExp(pattern.titleRegex, "i");
      if (!re.test(signal.title)) return false;
    } catch {
      return false;
    }
  }

  // Body jsonpath (simple dot-path check)
  if (pattern.bodyJsonpath) {
    const value = resolveDotPath(signal.body, pattern.bodyJsonpath);
    if (value === undefined) return false;
  }

  return true;
}

function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function findBestMatch(
  signal: SignalPayload,
  rules: MatchableRule[],
): MatchResult {
  const activeRules = rules
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of activeRules) {
    if (matchesRule(signal, rule.pattern)) {
      return {
        matched: true,
        rule,
        workflowId: rule.workflowId,
      };
    }
  }

  return { matched: false, rule: null, workflowId: null };
}
