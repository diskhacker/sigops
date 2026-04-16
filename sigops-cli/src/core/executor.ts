import { spawn } from 'child_process';
import * as path from 'path';
import { TaskDefinition, RunStatus } from '../types';
import { resolveTemplate, resolveDefault } from '../utils/template';
import { recordRun } from './history';
import { getConfig } from './config';
import { log } from '../utils/logger';
import chalk from 'chalk';

export interface ExecuteOptions {
  inputs: Record<string, string | number | boolean>;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ExecuteResult {
  status: RunStatus;
  exitCode: number | null;
  durationMs: number;
  command: string;
}

/**
 * Resolve all inputs: apply defaults, validate required, coerce types.
 */
export function resolveInputs(
  def: TaskDefinition,
  provided: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const resolved: Record<string, string | number | boolean> = {};

  for (const [key, spec] of Object.entries(def.inputs)) {
    if (key in provided) {
      resolved[key] = coerce(provided[key], spec.type);
    } else if (spec.default !== undefined) {
      const defVal = resolveDefault(spec.default);
      if (defVal === undefined || (typeof defVal === 'string' && defVal.startsWith('${'))) {
        if (spec.required !== false) {
          throw new Error(
            `Input "${key}" has unresolved default (env var not set) and is required`
          );
        }
      } else {
        resolved[key] = coerce(defVal, spec.type);
      }
    } else if (spec.required !== false) {
      throw new Error(`Missing required input: --${key}`);
    }
  }

  // Include script path in template values
  if (def.script) {
    resolved['script'] = def.script;
  }

  return resolved;
}

function coerce(val: string | number | boolean, type: string): string | number | boolean {
  switch (type) {
    case 'number': return typeof val === 'number' ? val : Number(val);
    case 'boolean': {
      if (typeof val === 'boolean') return val;
      const s = String(val).toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }
    default: return String(val);
  }
}

/**
 * Execute a task.
 */
export async function executeTask(
  def: TaskDefinition,
  opts: ExecuteOptions
): Promise<ExecuteResult> {
  // 1. Resolve inputs
  const inputs = resolveInputs(def, opts.inputs);

  // 2. Resolve command template
  const command = resolveTemplate(def.run, inputs);

  // 3. Determine working directory
  const cwd = def.cwd
    ? path.resolve(def.cwd)
    : process.cwd();

  // 4. Build env
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (def.env) {
    for (const [k, v] of Object.entries(def.env)) {
      env[k] = resolveTemplate(v, inputs);
    }
  }

  // Dry run — show what would execute
  if (opts.dryRun) {
    log.header('Dry Run');
    log.info(`Task:    ${def.name}`);
    log.info(`Command: ${command}`);
    log.info(`CWD:     ${cwd}`);
    if (def.env) {
      log.info(`Env:     ${Object.keys(def.env).join(', ')}`);
    }
    log.dim('');
    log.dim('No execution performed (--dry-run)');
    return { status: 'success', exitCode: 0, durationMs: 0, command };
  }

  // 5. Execute
  const config = getConfig();
  const timeout = (def.timeout || config.defaultTimeout) * 1000;
  const startedAt = new Date();
  const outputLines: string[] = [];

  log.dim(`Running: ${command}`);
  log.dim(`CWD:     ${cwd}`);
  log.divider();

  return new Promise<ExecuteResult>((resolve) => {
    const proc = spawn(command, {
      shell: true,
      cwd,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000);
    }, timeout);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      captureOutput(outputLines, text, config.outputCapture);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stderr.write(text);
      captureOutput(outputLines, text, config.outputCapture);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      let status: RunStatus;
      if (timedOut) {
        status = 'timeout';
      } else if (code === 0) {
        status = 'success';
      } else {
        status = 'failed';
      }

      log.divider();

      // Mask secret inputs before recording
      const safeInputs: Record<string, string | number | boolean> = {};
      for (const [key, val] of Object.entries(inputs)) {
        const spec = def.inputs[key];
        safeInputs[key] = spec?.secret ? '***' : val;
      }

      // Record in history
      recordRun({
        task: def.name,
        status,
        inputs: safeInputs,
        command: maskSecrets(command, def, inputs),
        startedAt,
        finishedAt,
        exitCode: code,
        output: outputLines.join(''),
        error: status !== 'success'
          ? `Exit code: ${code}${timedOut ? ' (timeout)' : ''}`
          : undefined,
      });

      // Print result
      const duration = formatDuration(durationMs);
      if (status === 'success') {
        log.success(`Completed in ${duration}`);
      } else if (status === 'timeout') {
        log.error(`Timed out after ${def.timeout || config.defaultTimeout}s`);
      } else {
        log.error(`Failed with exit code ${code} (${duration})`);
      }

      resolve({ status, exitCode: code, durationMs, command });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      const finishedAt = new Date();
      log.error(`Failed to execute: ${err.message}`);

      recordRun({
        task: def.name,
        status: 'failed',
        inputs: opts.inputs,
        command,
        startedAt,
        finishedAt,
        exitCode: null,
        error: err.message,
      });

      resolve({ status: 'failed', exitCode: null, durationMs: 0, command });
    });
  });
}

function captureOutput(lines: string[], text: string, maxLines: number): void {
  lines.push(text);
  // Keep only last N lines worth of text
  while (lines.length > maxLines) {
    lines.shift();
  }
}

function maskSecrets(
  command: string,
  def: TaskDefinition,
  inputs: Record<string, string | number | boolean>
): string {
  let masked = command;
  for (const [key, spec] of Object.entries(def.inputs)) {
    if (spec.secret && key in inputs) {
      const val = String(inputs[key]);
      if (val.length > 0) {
        masked = masked.replaceAll(val, '***');
      }
    }
  }
  return masked;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
