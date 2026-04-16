import { Command } from 'commander';
import { findTask, deleteTask } from '../core/registry';
import { log } from '../utils/logger';

export const removeCommand = new Command('remove')
  .alias('rm')
  .description('Remove a registered task')
  .argument('<task>', 'Task name')
  .option('-f, --force', 'Skip confirmation')
  .action((taskName: string, opts: { force?: boolean }) => {
    try {
      const entry = findTask(taskName);
      if (!entry) {
        log.error(`Task "${taskName}" not found`);
        process.exit(1);
      }

      if (!opts.force) {
        log.warn(`This will delete: ${entry.filePath}`);
        log.info('Use --force to skip confirmation');
        // In a real CLI we'd use readline for confirmation
        // For now, require --force
        return;
      }

      deleteTask(taskName);
      log.success(`Removed task "${taskName}"`);
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });
