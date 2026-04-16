#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { addCommand } from './commands/add';
import { runCommand } from './commands/run';
import { listCommand } from './commands/list';
import { historyCommand } from './commands/history';
import { inspectCommand } from './commands/inspect';
import { removeCommand } from './commands/remove';
import * as dotenv from 'dotenv';

// Load .env from cwd
dotenv.config();

const program = new Command();

program
  .name('sigops')
  .description('SigOps Task Registry — automate the boring stuff')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(historyCommand);
program.addCommand(inspectCommand);
program.addCommand(removeCommand);

program.parse();
