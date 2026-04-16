import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { TaskDefinition, TaskEntry, TaskInput } from '../types';
import { getTasksDir } from './config';

/**
 * Load a single task definition from a YAML file.
 */
export function loadTask(filePath: string): TaskDefinition {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;
  return validateTask(parsed, filePath);
}

/**
 * Validate a parsed YAML object as a TaskDefinition.
 */
function validateTask(raw: Record<string, unknown>, filePath: string): TaskDefinition {
  const errors: string[] = [];

  if (!raw.name || typeof raw.name !== 'string') {
    errors.push('Missing or invalid "name" (string required)');
  }
  if (!raw.run || typeof raw.run !== 'string') {
    errors.push('Missing or invalid "run" (string required)');
  }

  // Validate inputs if present
  if (raw.inputs && typeof raw.inputs === 'object') {
    for (const [key, val] of Object.entries(raw.inputs as Record<string, unknown>)) {
      const input = val as Record<string, unknown>;
      if (!input.type || !['string', 'number', 'boolean', 'file', 'select'].includes(input.type as string)) {
        errors.push(`Input "${key}": invalid type (must be string|number|boolean|file|select)`);
      }
      if (input.type === 'select' && (!Array.isArray(input.options) || input.options.length === 0)) {
        errors.push(`Input "${key}": select type requires non-empty "options" array`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid task definition in ${filePath}:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  return {
    name: raw.name as string,
    description: (raw.description as string) || undefined,
    version: (raw.version as string) || '1.0.0',
    script: (raw.script as string) || '',
    inputs: (raw.inputs as Record<string, TaskInput>) || {},
    env: (raw.env as Record<string, string>) || undefined,
    run: raw.run as string,
    cwd: (raw.cwd as string) || undefined,
    timeout: (raw.timeout as number) || undefined,
    tags: (raw.tags as string[]) || undefined,
  };
}

/**
 * List all registered tasks.
 */
export function listTasks(): TaskEntry[] {
  const tasksDir = getTasksDir();
  if (!fs.existsSync(tasksDir)) return [];

  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  const entries: TaskEntry[] = [];

  for (const file of files) {
    const filePath = path.join(tasksDir, file);
    try {
      const def = loadTask(filePath);
      entries.push({ name: def.name, filePath, definition: def });
    } catch {
      // skip invalid files, don't crash listing
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find a task by name.
 */
export function findTask(name: string): TaskEntry | null {
  const tasks = listTasks();
  return tasks.find(t => t.name === name) || null;
}

/**
 * Save a new task definition as YAML.
 */
export function saveTask(def: TaskDefinition): string {
  const tasksDir = getTasksDir();
  const fileName = `${def.name.replace(/[^a-z0-9_-]/gi, '-')}.yaml`;
  const filePath = path.join(tasksDir, fileName);

  if (fs.existsSync(filePath)) {
    throw new Error(`Task file already exists: ${filePath}`);
  }

  const yamlStr = yaml.dump(def, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    sortKeys: false,
  });

  fs.writeFileSync(filePath, yamlStr);
  return filePath;
}

/**
 * Delete a task by name.
 */
export function deleteTask(name: string): boolean {
  const entry = findTask(name);
  if (!entry) return false;
  fs.unlinkSync(entry.filePath);
  return true;
}
