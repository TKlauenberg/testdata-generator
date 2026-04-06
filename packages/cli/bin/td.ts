#!/usr/bin/env bun
import { Command } from 'commander';
import { version } from '@testdata-generator/core';
import { generateCommand } from '../src/commands/generate.js';
import { exportCommand } from '../src/commands/export.js';
import { historyCommand } from '../src/commands/history.js';
import { diffCommand } from '../src/commands/diff.js';
import { validateCommand } from '../src/commands/validate.js';
import { initCommand } from '../src/commands/init.js';
import { configCommand } from '../src/commands/config.js';

const program = new Command();

program
  .name('td')
  .description('testdata-generator - Declarative test data generation')
  .version(version as string);

// Register commands
program.addCommand(generateCommand);
program.addCommand(exportCommand);
program.addCommand(historyCommand);
program.addCommand(diffCommand);
program.addCommand(validateCommand);
program.addCommand(initCommand);
program.addCommand(configCommand);

program.parse();
