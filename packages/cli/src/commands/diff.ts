import { Command } from 'commander';
import {
  comparePatternVersions,
  type PatternVersionModifiedEntry,
  PatternVersionStoreParseError,
  PatternVersionStoreValidationError,
  readPatternVersionSnapshot,
} from '@testdata-generator/core';
import * as path from 'node:path';
import { CliConfigError, loadEffectiveConfig } from '../config';
import { resolvePatternVersionStorePath } from '../historySupport';

function writeModifiedEntry(output: { write(chunk: string): unknown }, entry: PatternVersionModifiedEntry): void {
  output.write(`modified | ${entry.type} | ${entry.identifier} | ${entry.oldHash} -> ${entry.newHash}\n`);

  if (entry.excerpt !== undefined) {
    const oldLine = entry.excerpt.oldLine ?? '<missing>';
    const newLine = entry.excerpt.newLine ?? '<missing>';
    output.write(`excerpt | ${entry.identifier} | line ${entry.excerpt.lineNumber} | old=${oldLine} | new=${newLine}\n`);
  }
}

export const diffCommand = new Command('diff')
  .description('Compare two stored pattern versions by hash')
  .argument('<old-hash>', 'Older pattern hash')
  .argument('<new-hash>', 'Newer pattern hash')
  .action(async (oldHash: string, newHash: string) => {
    try {
      const currentWorkingDirectory = process.cwd();
      const effectiveConfig = await loadEffectiveConfig({ currentDirectory: currentWorkingDirectory });
      const workspaceRoot = effectiveConfig.layers.workspace === undefined
        ? undefined
        : path.dirname(effectiveConfig.layers.workspace.path);
      const storeDirectory = resolvePatternVersionStorePath({
        currentWorkingDirectory,
        historyLogDirectory: effectiveConfig.config.history.logDirectory,
        workspaceRoot,
      });

      const [oldSnapshot, newSnapshot] = await Promise.all([
        readPatternVersionSnapshot(storeDirectory, oldHash),
        readPatternVersionSnapshot(storeDirectory, newHash),
      ]);

      if (oldSnapshot === null) {
        console.error(`Error: Unknown pattern hash '${oldHash}'`);
        process.exit(1);
        return;
      }

      if (newSnapshot === null) {
        console.error(`Error: Unknown pattern hash '${newHash}'`);
        process.exit(1);
        return;
      }

      if (oldHash === newHash) {
        console.log(`No changes between pattern versions ${oldHash} and ${newHash}.`);
        return;
      }

      const diff = comparePatternVersions(oldSnapshot, newSnapshot);

      if (diff.identical) {
        console.log(`No changes between pattern versions ${oldHash} and ${newHash}.`);
        return;
      }

      process.stdout.write(`pattern-diff | ${oldHash} -> ${newHash}\n`);
      process.stdout.write(`classification | ${diff.potentiallyBreaking ? 'potentially-breaking' : 'changes-detected'}\n`);

      for (const entry of diff.added) {
        process.stdout.write(`added | ${entry.type} | ${entry.identifier} | ${entry.hash}\n`);
      }

      for (const entry of diff.removed) {
        process.stdout.write(`removed | ${entry.type} | ${entry.identifier} | ${entry.hash}\n`);
      }

      for (const entry of diff.modified) {
        writeModifiedEntry(process.stdout, entry);
      }
    } catch (error: unknown) {
      if (error instanceof CliConfigError) {
        console.error(`Error: ${error.message}`);
        process.exit(error.exitCode);
        return;
      }

      if (error instanceof PatternVersionStoreParseError || error instanceof PatternVersionStoreValidationError) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
        return;
      }

      throw error;
    }
  });