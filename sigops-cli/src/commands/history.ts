import { Command } from 'commander';
import { getRecentRuns, getTaskHistory, clearHistory } from '../core/history';
import { log } from '../utils/logger';
import chalk from 'chalk';

export const historyCommand = new Command('history')
  .description('Show execution history')
  .argument('[task]', 'Filter by task name')
  .option('-n, --limit <n>', 'Number of entries', '20')
  .option('--clear', 'Clear all history')
  .option('--json', 'Output as JSON')
  .action((task: string | undefined, opts: { limit: string; clear?: boolean; json?: boolean }) => {
    try {
      if (opts.clear) {
        clearHistory();
        log.success('History cleared');
        return;
      }

      const limit = parseInt(opts.limit, 10) || 20;
      const runs = task
        ? getTaskHistory(task, limit)
        : getRecentRuns(limit);

      if (opts.json) {
        console.log(JSON.stringify(runs, null, 2));
        return;
      }

      if (runs.length === 0) {
        log.info(task ? `No history for task "${task}"` : 'No execution history');
        return;
      }

      log.header(task ? `History: ${task} (${runs.length})` : `Recent Runs (${runs.length})`);

      // Table header
      const rows: string[][] = [
        [
          chalk.dim('STATUS'),
          chalk.dim('TASK'),
          chalk.dim('DURATION'),
          chalk.dim('WHEN'),
          chalk.dim('EXIT'),
        ]
      ];

      for (const run of runs.reverse()) {
        const statusIcon = {
          success: chalk.green('✓'),
          failed: chalk.red('✗'),
          timeout: chalk.yellow('⏱'),
          cancelled: chalk.dim('○'),
        }[run.status];

        rows.push([
          statusIcon,
          chalk.white(run.task),
          formatDuration(run.durationMs),
          formatTime(run.startedAt),
          run.exitCode !== null ? String(run.exitCode) : '-',
        ]);
      }

      log.table(rows);

      // Show last failed error if any
      const lastFailed = runs.find(r => r.status !== 'success');
      if (lastFailed?.error) {
        console.log('');
        log.dim(`Last failure: ${lastFailed.error}`);
      }
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
