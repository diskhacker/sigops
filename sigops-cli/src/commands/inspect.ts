import { Command } from 'commander';
import { findTask } from '../core/registry';
import { getTaskHistory } from '../core/history';
import { log } from '../utils/logger';
import chalk from 'chalk';

export const inspectCommand = new Command('inspect')
  .description('Show detailed task configuration')
  .argument('<task>', 'Task name')
  .option('--json', 'Output as JSON')
  .action((taskName: string, opts: { json?: boolean }) => {
    try {
      const entry = findTask(taskName);
      if (!entry) {
        log.error(`Task "${taskName}" not found`);
        process.exit(1);
      }

      const def = entry.definition;

      if (opts.json) {
        console.log(JSON.stringify(def, null, 2));
        return;
      }

      log.header(def.name);

      if (def.description) console.log(`  ${chalk.dim(def.description)}`);
      console.log('');

      console.log(`  ${chalk.dim('Version:')}  ${def.version || '1.0.0'}`);
      console.log(`  ${chalk.dim('Script:')}   ${def.script || '(inline)'}`);
      console.log(`  ${chalk.dim('Run:')}      ${def.run}`);
      console.log(`  ${chalk.dim('Timeout:')}  ${def.timeout || 300}s`);
      console.log(`  ${chalk.dim('File:')}     ${entry.filePath}`);
      if (def.cwd) console.log(`  ${chalk.dim('CWD:')}      ${def.cwd}`);
      if (def.tags?.length) console.log(`  ${chalk.dim('Tags:')}     ${def.tags.join(', ')}`);

      // Inputs
      const inputEntries = Object.entries(def.inputs);
      if (inputEntries.length > 0) {
        console.log('');
        console.log(`  ${chalk.bold('Inputs:')}`);
        for (const [key, spec] of inputEntries) {
          const required = spec.required !== false;
          const reqBadge = required ? chalk.red('*') : ' ';
          const defaultVal = spec.default !== undefined ? chalk.dim(` (default: ${spec.default})`) : '';
          const secretBadge = spec.secret ? chalk.yellow(' [secret]') : '';
          console.log(
            `    ${reqBadge} --${key}  ${chalk.dim(`<${spec.type}>`)}${defaultVal}${secretBadge}`
          );
          if (spec.description) {
            console.log(`      ${chalk.dim(spec.description)}`);
          }
          if (spec.options) {
            console.log(`      ${chalk.dim(`Options: ${spec.options.join(', ')}`)}`);
          }
        }
      }

      // Env
      if (def.env && Object.keys(def.env).length > 0) {
        console.log('');
        console.log(`  ${chalk.bold('Environment:')}`);
        for (const [k, v] of Object.entries(def.env)) {
          console.log(`    ${k} = ${chalk.dim(v)}`);
        }
      }

      // Recent runs
      const history = getTaskHistory(taskName, 5);
      if (history.length > 0) {
        console.log('');
        console.log(`  ${chalk.bold('Recent Runs:')}`);
        for (const run of history.reverse()) {
          const icon = run.status === 'success' ? chalk.green('✓') : chalk.red('✗');
          const when = new Date(run.startedAt).toLocaleString();
          const dur = run.durationMs < 1000
            ? `${run.durationMs}ms`
            : `${(run.durationMs / 1000).toFixed(1)}s`;
          console.log(`    ${icon} ${when}  ${chalk.dim(dur)}`);
        }
      }

      // Usage example
      console.log('');
      console.log(`  ${chalk.bold('Usage:')}`);
      const requiredInputs = inputEntries
        .filter(([_, spec]) => spec.required !== false && spec.default === undefined)
        .map(([key, spec]) => `--${key}=<${spec.type}>`)
        .join(' ');
      console.log(`    sigops run ${def.name} ${requiredInputs}`);
      console.log('');
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });
