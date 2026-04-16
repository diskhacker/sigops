// ─── Task Definition (what lives in YAML) ───

export interface TaskInput {
  type: 'string' | 'number' | 'boolean' | 'file' | 'select';
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  secret?: boolean;       // mask in logs, resolve from env
  options?: string[];     // for select type
}

export interface TaskDefinition {
  name: string;
  description?: string;
  version?: string;
  script: string;           // path to script (relative to task dir or absolute)
  inputs: Record<string, TaskInput>;
  env?: Record<string, string>;  // extra env vars to set
  run: string;              // command template with {{variables}}
  cwd?: string;             // working directory (default: where task file lives)
  timeout?: number;         // seconds (default: 300)
  tags?: string[];          // for filtering/grouping
}

// ─── Execution History ───

export type RunStatus = 'success' | 'failed' | 'timeout' | 'cancelled';

export interface RunRecord {
  id: string;               // ulid or timestamp-based
  task: string;              // task name
  status: RunStatus;
  inputs: Record<string, string | number | boolean>;
  command: string;           // resolved command that was executed
  startedAt: string;         // ISO
  finishedAt: string;        // ISO
  durationMs: number;
  exitCode: number | null;
  output?: string;           // last N lines of stdout+stderr
  error?: string;            // error message if failed
}

// ─── Registry ───

export interface TaskEntry {
  name: string;
  filePath: string;          // absolute path to the YAML file
  definition: TaskDefinition;
}

// ─── Config ───

export interface SigOpsConfig {
  version: string;
  tasksDir: string;          // relative to .sigops/
  historyFile: string;       // relative to .sigops/
  maxHistoryEntries: number;
  defaultTimeout: number;    // seconds
  outputCapture: number;     // max lines of output to store in history
}

export const DEFAULT_CONFIG: SigOpsConfig = {
  version: '1.0.0',
  tasksDir: 'tasks',
  historyFile: 'history.json',
  maxHistoryEntries: 500,
  defaultTimeout: 300,
  outputCapture: 50,
};
