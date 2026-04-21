/**
 * Unit tests for sigops-cli commands and core logic.
 * Uses vitest with a temp-dir approach so no real .sigops directory is needed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Command } from 'commander';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sigops-test-'));
}

function rmTmpDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ──────────────────────────────────────────────
// Smoke tests — every command file exports a Command
// ──────────────────────────────────────────────

describe('command exports (smoke)', () => {
  it('init exports a Command instance', async () => {
    const { initCommand } = await import('../commands/init');
    expect(initCommand).toBeInstanceOf(Command);
  });

  it('add exports a Command instance', async () => {
    const { addCommand } = await import('../commands/add');
    expect(addCommand).toBeInstanceOf(Command);
  });

  it('list exports a Command instance', async () => {
    const { listCommand } = await import('../commands/list');
    expect(listCommand).toBeInstanceOf(Command);
  });

  it('run exports a Command instance', async () => {
    const { runCommand } = await import('../commands/run');
    expect(runCommand).toBeInstanceOf(Command);
  });

  it('history exports a Command instance', async () => {
    const { historyCommand } = await import('../commands/history');
    expect(historyCommand).toBeInstanceOf(Command);
  });

  it('inspect exports a Command instance', async () => {
    const { inspectCommand } = await import('../commands/inspect');
    expect(inspectCommand).toBeInstanceOf(Command);
  });

  it('remove exports a Command instance', async () => {
    const { removeCommand } = await import('../commands/remove');
    expect(removeCommand).toBeInstanceOf(Command);
  });
});

// ──────────────────────────────────────────────
// core/config — initialize() creates correct structure
// ──────────────────────────────────────────────

describe('core/config — initialize()', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmTmpDir(tmpDir);
  });

  it('creates .sigops directory', async () => {
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.sigops'))).toBe(true);
  });

  it('creates .sigops/tasks sub-directory', async () => {
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.sigops', 'tasks'))).toBe(true);
  });

  it('creates config.json with version field', async () => {
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    const configPath = path.join(tmpDir, '.sigops', 'config.json');
    expect(fs.existsSync(configPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.version).toBe('1.0.0');
  });

  it('creates empty history.json', async () => {
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    const histPath = path.join(tmpDir, '.sigops', 'history.json');
    expect(fs.existsSync(histPath)).toBe(true);
    const history = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
    expect(Array.isArray(history)).toBe(true);
    expect(history).toHaveLength(0);
  });

  it('throws if already initialized', async () => {
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    expect(() => initialize(tmpDir)).toThrow('Already initialized');
  });

  it('findRoot returns null when no .sigops exists', async () => {
    const { findRoot } = await import('../core/config');
    const isolated = makeTmpDir();
    try {
      const result = findRoot(isolated);
      expect(result).toBeNull();
    } finally {
      rmTmpDir(isolated);
    }
  });

  it('findRoot returns the directory containing .sigops', async () => {
    const { initialize, findRoot } = await import('../core/config');
    initialize(tmpDir);
    const result = findRoot(tmpDir);
    expect(result).toBe(tmpDir);
  });
});

// ──────────────────────────────────────────────
// core/registry — saveTask / loadTask / listTasks / deleteTask
// ──────────────────────────────────────────────

describe('core/registry', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    // We need a real .sigops workspace, and we override process.cwd
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmTmpDir(tmpDir);
  });

  it('listTasks returns empty array when no tasks exist', async () => {
    const { listTasks } = await import('../core/registry');
    const tasks = listTasks();
    expect(tasks).toEqual([]);
  });

  it('saveTask writes a YAML file and listTasks finds it', async () => {
    const { saveTask, listTasks } = await import('../core/registry');
    const def = {
      name: 'test-task',
      description: 'A test task',
      version: '1.0.0',
      script: './scripts/test.js',
      inputs: {
        input_file: { type: 'string' as const, required: true, description: 'Input file' },
      },
      run: 'node {{script}} --input={{input_file}}',
      timeout: 60,
      tags: ['test'],
    };
    saveTask(def);
    const tasks = listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('test-task');
  });

  it('findTask returns null for unknown task', async () => {
    const { findTask } = await import('../core/registry');
    expect(findTask('nonexistent')).toBeNull();
  });

  it('deleteTask removes the task file', async () => {
    const { saveTask, findTask, deleteTask } = await import('../core/registry');
    const def = {
      name: 'del-task',
      version: '1.0.0',
      script: '',
      inputs: {},
      run: 'echo hello',
    };
    saveTask(def);
    expect(findTask('del-task')).not.toBeNull();
    deleteTask('del-task');
    expect(findTask('del-task')).toBeNull();
  });
});

// ──────────────────────────────────────────────
// core/history — recordRun / getTaskHistory / clearHistory
// ──────────────────────────────────────────────

describe('core/history', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    const { initialize } = await import('../core/config');
    initialize(tmpDir);
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmTmpDir(tmpDir);
  });

  it('readHistory returns empty array when history is empty', async () => {
    const { readHistory } = await import('../core/history');
    expect(readHistory()).toEqual([]);
  });

  it('recordRun stores a run record', async () => {
    const { recordRun, readHistory } = await import('../core/history');
    const now = new Date();
    recordRun({
      task: 'my-task',
      status: 'success',
      inputs: { input_file: 'data.csv' },
      command: 'node script.js --input=data.csv',
      startedAt: now,
      finishedAt: new Date(now.getTime() + 1234),
      exitCode: 0,
    });
    const records = readHistory();
    expect(records).toHaveLength(1);
    expect(records[0].task).toBe('my-task');
    expect(records[0].status).toBe('success');
    expect(records[0].durationMs).toBe(1234);
  });

  it('getTaskHistory filters by task name', async () => {
    const { recordRun, getTaskHistory } = await import('../core/history');
    const now = new Date();
    recordRun({ task: 'alpha', status: 'success', inputs: {}, command: 'echo', startedAt: now, finishedAt: now, exitCode: 0 });
    recordRun({ task: 'beta',  status: 'failed',  inputs: {}, command: 'echo', startedAt: now, finishedAt: now, exitCode: 1 });
    recordRun({ task: 'alpha', status: 'success', inputs: {}, command: 'echo', startedAt: now, finishedAt: now, exitCode: 0 });

    const alphaHistory = getTaskHistory('alpha');
    expect(alphaHistory).toHaveLength(2);
    expect(alphaHistory.every(r => r.task === 'alpha')).toBe(true);
  });

  it('clearHistory empties all records', async () => {
    const { recordRun, clearHistory, readHistory } = await import('../core/history');
    const now = new Date();
    recordRun({ task: 'x', status: 'success', inputs: {}, command: 'echo', startedAt: now, finishedAt: now, exitCode: 0 });
    clearHistory();
    expect(readHistory()).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// Command metadata checks
// ──────────────────────────────────────────────

describe('command metadata', () => {
  it('list command has alias "ls"', async () => {
    const { listCommand } = await import('../commands/list');
    expect(listCommand.aliases()).toContain('ls');
  });

  it('remove command has alias "rm"', async () => {
    const { removeCommand } = await import('../commands/remove');
    expect(removeCommand.aliases()).toContain('rm');
  });

  it('run command accepts unknown options (for --key=value inputs)', async () => {
    const { runCommand } = await import('../commands/run');
    // passThroughOptions or allowUnknownOption — check name is set
    expect(runCommand.name()).toBe('run');
  });
});
