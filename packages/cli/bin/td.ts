#!/usr/bin/env bun
import { Command } from 'commander';
import { version } from '@testdata-ai/core';

const program = new Command();

program
  .name('td')
  .description('testdata-ai - Declarative test data generation')
  .version(version);

// Future commands will be added here in subsequent stories

program.parse();
