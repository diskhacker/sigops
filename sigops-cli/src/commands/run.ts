import { Command } from 'commander';
import { findTask } from '../core/registry';
import { executeTask } from '../core/executor';
import { log } from '../utils/logger';
import chalk from 'chalk';

export const runCommand = new Command('run')
  .description('Execute a registered task')
  .argument('<task>', 'Task name')
  .option('--dry-run', 'Show what would execute without running')
  .option('-v, --verbose', 'Verbose output')
  .allowUnknownOption(true)        // task inputs come as --key=value
  .allowExcessArguments(true)
  .action(async (taskName: string, opts: { dryRun?: boolean; verbose?: boolean }, cmd: Command) => {
    try {
      const entry = findTask(taskName);
      if (!entry) {
        log.error(`Task "${taskName}" not found`);
        log.dim('Run "sigops list" to see available tasks');
        process.exit(1);
      }

      const def = entry.definition;

      // Parse task-specific inputs from raw args
      // Commander puts unknown options in cmd.args, but we need raw argv parsing
      const inputs = parseTaskInputs(process.argv.slice(3), def.inputs);

      log.bold(`▶ ${def.name}${def.description ? chalk.dim(` — ${def.description}`) : ''}`);

      const result = await executeTask(def, {
        inputs,
        dryRun: opts.dryRun,
        verbose: opts.verbose,
      });

      process.exit(result.status === 'success' ? 0 : 1);
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });

/**
 * Parse --key=value and --key value pairs from argv,
 * skipping known commander flags (--dry-run, --verbose, -v).
 */
function parseTaskInputs(
  args: string[],
  inputDefs: Record<string, { type: string }>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const skip = new Set(['--dry-run', '--verbose', '-v']);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (skip.has(arg)) continue;
    if (!arg.startsWith('--')) continue;

    let key: string;
    let value: string | undefined;

    if (arg.includes('=')) {
      const eqIdx = arg.indexOf('=');
      key = arg.slice(2, eqIdx);
      value = arg.slice(eqIdx + 1);
    } else {
      key = arg.slice(2);
      // Check if next arg is a value (not a flag)
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        value = args[++i];
      } else {
        // Boolean flag (--flag without value = true)
        value = 'true';
      }
    }

    // Normalize key: --dry-run → dry_run (but also accept dry_run directly)
    const normalizedKey = key.replace(/-/g, '_');
    result[normalizedKey] = value ?? 'true';
  }

  return result;
}
