#!/usr/bin/env bun
import { Command } from 'commander';
import { version } from '@testdata-ai/core';
import { generateCommand } from '../src/commands/generate.js';
import { validateCommand } from '../src/commands/validate.js';

const program = new Command();

program
  .name('td')
  .description('testdata-ai - Declarative test data generation')
  .version(version as string);

// Register commands
program.addCommand(generateCommand);
program.addCommand(validateCommand);

program.parse();
