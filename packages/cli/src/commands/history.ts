import { Command } from 'commander';
import { GenerationHistoryParseError, queryGenerationHistory } from '@testdata-ai/core';
import * as path from 'node:path';
import { CliConfigError, loadEffectiveConfig } from '../config';
import { resolveHistoryLogPath } from '../historySupport';

interface HistoryCommandOptions {
  last?: string;
}

function parsePositiveIntegerOption(rawValue: string, optionName: string): number {
  const normalized = rawValue.trim();

  if (!/^[0-9]+$/.test(normalized)) {
    throw new CliConfigError(`Invalid ${optionName}: expected a positive integer`, 1);
  }

  const value = Number.parseInt(normalized, 10);
  if (value <= 0) {
    throw new CliConfigError(`Invalid ${optionName}: expected a positive integer`, 1);
  }

  return value;
}

function formatHistoryEntry(entry: Awaited<ReturnType<typeof queryGenerationHistory>>[number]): string {
  const segments = [
    entry.metadata.timestamp,
    entry.status,
    entry.metadata.sourcePattern ?? '<unknown-pattern>',
    entry.metadata.format,
    `count=${entry.metadata.count ?? 0}`,
    `durationMs=${entry.durationMs.toFixed(2)}`,
    `recordsPerSecond=${entry.recordsPerSecond.toFixed(2)}`,
  ];

  if (entry.errorMessage !== undefined) {
    segments.push(`error=${entry.errorMessage}`);
  }

  return segments.join(' | ');
}

export const historyCommand = new Command('history')
  .description('Query generation history')
  .option(
    '--last <number>',
    'Show only the most recent N generations',
  )
  .action(async (options: HistoryCommandOptions) => {
    try {
      const currentWorkingDirectory = process.cwd();
      const effectiveConfig = await loadEffectiveConfig({ currentDirectory: currentWorkingDirectory });
      const workspaceRoot = effectiveConfig.layers.workspace === undefined
        ? undefined
        : path.dirname(effectiveConfig.layers.workspace.path);
      const historyPath = resolveHistoryLogPath({
        currentWorkingDirectory,
        historyLogDirectory: effectiveConfig.config.history.logDirectory,
        workspaceRoot,
      });
      const last = options.last === undefined ? undefined : parsePositiveIntegerOption(options.last, '--last');
      const entries = [...await queryGenerationHistory(historyPath, { last })].reverse();

      if (entries.length === 0) {
        // eslint-disable-next-line no-console -- User-facing CLI output
        console.log(`No generation history found yet at ${historyPath}`);
        return;
      }

      for (const entry of entries) {
        // eslint-disable-next-line no-console -- User-facing CLI output
        console.log(formatHistoryEntry(entry));
      }
    } catch (error: unknown) {
      if (error instanceof CliConfigError) {
        console.error(`Error: ${error.message}`);
        process.exit(error.exitCode);
        return;
      }

      if (error instanceof GenerationHistoryParseError) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
        return;
      }

      throw error;
    }
  });