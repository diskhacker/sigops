import { Command } from 'commander';
import { listTasks } from '../core/registry';
import { getTaskHistory } from '../core/history';
import { log } from '../utils/logger';
import chalk from 'chalk';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all registered tasks')
  .option('-t, --tag <tag>', 'Filter by tag')
  .action((opts: { tag?: string }) => {
    try {
      let tasks = listTasks();

      if (opts.tag) {
        tasks = tasks.filter(t => t.definition.tags?.includes(opts.tag!));
      }

      if (tasks.length === 0) {
        log.info('No tasks registered');
        log.dim('Run "sigops add <name>" to create one');
        return;
      }

      log.header(`Tasks (${tasks.length})`);

      for (const t of tasks) {
        const def = t.definition;
        const history = getTaskHistory(def.name, 1);
        const lastRun = history.length > 0 ? history[history.length - 1] : null;

        const inputCount = Object.keys(def.inputs).length;
        const requiredCount = Object.values(def.inputs).filter(i => i.required !== false).length;

        let statusBadge = '';
        if (lastRun) {
          const when = timeSince(new Date(lastRun.startedAt));
          statusBadge = lastRun.status === 'success'
            ? chalk.green(` ● ${when} ago`)
            : chalk.red(` ● ${when} ago`);
        }

        console.log(
          `  ${chalk.bold.white(def.name)}` +
          `${chalk.dim(` v${def.version || '1.0.0'}`)}` +
          statusBadge
        );

        if (def.description) {
          console.log(`  ${chalk.dim(def.description)}`);
        }

        console.log(
          `  ${chalk.dim(`${inputCount} inputs (${requiredCount} required)` +
          (def.tags?.length ? ` · tags: ${def.tags.join(', ')}` : ''))}`
        );
        console.log('');
      }
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
