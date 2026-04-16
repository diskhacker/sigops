import { Command } from 'commander';
import { initialize, findRoot } from '../core/config';
import { log } from '../utils/logger';

export const initCommand = new Command('init')
  .description('Initialize a SigOps task registry in the current directory')
  .action(() => {
    const existing = findRoot();
    if (existing) {
      log.warn(`Already initialized at ${existing}/.sigops`);
      return;
    }

    try {
      const sigDir = initialize();
      log.success(`Initialized SigOps task registry`);
      log.dim(`  Config:  ${sigDir}/config.json`);
      log.dim(`  Tasks:   ${sigDir}/tasks/`);
      log.dim(`  History: ${sigDir}/history.json`);
      log.dim('');
      log.info('Next: run "sigops add <name>" to register your first task');
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });
