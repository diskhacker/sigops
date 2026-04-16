import * as fs from 'fs';
import * as path from 'path';
import { SigOpsConfig, DEFAULT_CONFIG } from '../types';

const CONFIG_DIR = '.sigops';
const CONFIG_FILE = 'config.json';

/**
 * Find the .sigops directory by walking up from cwd.
 * Returns null if not found (not initialized).
 */
export function findRoot(from?: string): string | null {
  let dir = from || process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, CONFIG_DIR))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Get absolute path to .sigops directory. Throws if not initialized.
 */
export function getSigOpsDir(): string {
  const root = findRoot();
  if (!root) {
    throw new Error(
      'Not a SigOps workspace. Run "sigops init" first.'
    );
  }
  return path.join(root, CONFIG_DIR);
}

/**
 * Get config, merged with defaults.
 */
export function getConfig(): SigOpsConfig {
  const sigDir = getSigOpsDir();
  const configPath = path.join(sigDir, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return { ...DEFAULT_CONFIG, ...raw };
}

/**
 * Get absolute path to tasks directory.
 */
export function getTasksDir(): string {
  const sigDir = getSigOpsDir();
  const config = getConfig();
  return path.join(sigDir, config.tasksDir);
}

/**
 * Get absolute path to history file.
 */
export function getHistoryPath(): string {
  const sigDir = getSigOpsDir();
  const config = getConfig();
  return path.join(sigDir, config.historyFile);
}

/**
 * Initialize .sigops directory in the given (or current) directory.
 */
export function initialize(dir?: string): string {
  const target = dir || process.cwd();
  const sigDir = path.join(target, CONFIG_DIR);
  const tasksDir = path.join(sigDir, DEFAULT_CONFIG.tasksDir);

  if (fs.existsSync(sigDir)) {
    throw new Error(`Already initialized: ${sigDir}`);
  }

  fs.mkdirSync(sigDir, { recursive: true });
  fs.mkdirSync(tasksDir, { recursive: true });

  // Write config
  fs.writeFileSync(
    path.join(sigDir, CONFIG_FILE),
    JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n'
  );

  // Write empty history
  fs.writeFileSync(
    path.join(sigDir, DEFAULT_CONFIG.historyFile),
    '[]' + '\n'
  );

  // Write .gitignore for .sigops
  fs.writeFileSync(
    path.join(sigDir, '.gitignore'),
    'history.json\n'
  );

  return sigDir;
}
