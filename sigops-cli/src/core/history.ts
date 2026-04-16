import * as fs from 'fs';
import { RunRecord, RunStatus } from '../types';
import { getHistoryPath, getConfig } from './config';

/**
 * Generate a simple unique ID (timestamp + random).
 */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

/**
 * Read all history records.
 */
export function readHistory(): RunRecord[] {
  const histPath = getHistoryPath();
  if (!fs.existsSync(histPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(histPath, 'utf-8')) as RunRecord[];
  } catch {
    return [];
  }
}

/**
 * Write history records (with max cap).
 */
function writeHistory(records: RunRecord[]): void {
  const config = getConfig();
  const capped = records.slice(-config.maxHistoryEntries);
  fs.writeFileSync(getHistoryPath(), JSON.stringify(capped, null, 2) + '\n');
}

/**
 * Record an execution run.
 */
export function recordRun(params: {
  task: string;
  status: RunStatus;
  inputs: Record<string, string | number | boolean>;
  command: string;
  startedAt: Date;
  finishedAt: Date;
  exitCode: number | null;
  output?: string;
  error?: string;
}): RunRecord {
  const record: RunRecord = {
    id: generateId(),
    task: params.task,
    status: params.status,
    inputs: params.inputs,
    command: params.command,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs: params.finishedAt.getTime() - params.startedAt.getTime(),
    exitCode: params.exitCode,
    output: params.output,
    error: params.error,
  };

  const records = readHistory();
  records.push(record);
  writeHistory(records);
  return record;
}

/**
 * Get history for a specific task.
 */
export function getTaskHistory(taskName: string, limit = 10): RunRecord[] {
  return readHistory()
    .filter(r => r.task === taskName)
    .slice(-limit);
}

/**
 * Get recent runs across all tasks.
 */
export function getRecentRuns(limit = 20): RunRecord[] {
  return readHistory().slice(-limit);
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  writeHistory([]);
}
