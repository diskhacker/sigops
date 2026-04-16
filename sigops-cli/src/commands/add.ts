import { Command } from 'commander';
import { saveTask, findTask } from '../core/registry';
import { TaskDefinition } from '../types';
import { log } from '../utils/logger';

export const addCommand = new Command('add')
  .description('Register a new task')
  .argument('<name>', 'Task name (lowercase, hyphens allowed)')
  .option('-s, --script <path>', 'Path to script file')
  .option('-r, --run <command>', 'Run command template')
  .option('-d, --description <text>', 'Task description')
  .action((name: string, opts: { script?: string; run?: string; description?: string }) => {
    try {
      // Validate name
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
        log.error('Task name must be lowercase alphanumeric (hyphens and underscores allowed)');
        process.exit(1);
      }

      // Check if already exists
      if (findTask(name)) {
        log.error(`Task "${name}" already exists`);
        process.exit(1);
      }

      const def: TaskDefinition = {
        name,
        description: opts.description || `Task: ${name}`,
        version: '1.0.0',
        script: opts.script || `./scripts/${name}.js`,
        inputs: {
          // Scaffold with one example input
          input_file: {
            type: 'string',
            required: true,
            description: 'Input file path',
          },
          dry_run: {
            type: 'boolean',
            default: true,
            description: 'Run without making changes',
          },
        },
        run: opts.run || `node {{script}} --input={{input_file}} --dry-run={{dry_run}}`,
        timeout: 300,
        tags: [],
      };

      const filePath = saveTask(def);
      log.success(`Created task "${name}"`);
      log.dim(`  File: ${filePath}`);
      log.dim('');
      log.info('Edit the YAML file to customize inputs and run command');
      log.info(`Then run: sigops run ${name} --input_file=./data.csv`);
    } catch (err: unknown) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });
