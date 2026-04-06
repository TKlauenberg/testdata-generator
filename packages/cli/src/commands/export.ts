import { Command } from 'commander';
import {
  createPlatformReadyExport,
  GenerationHistoryParseError,
  PatternVersionStoreParseError,
  PatternVersionStoreValidationError,
  PlatformReadyExportError,
} from '@testdata-generator/core';
import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { CliConfigError, loadEffectiveConfig } from '../config';
import { resolveHistoryLogPath, resolvePatternVersionStorePath } from '../historySupport';

interface ExportCommandOptions {
  platformReady?: boolean;
  output?: string;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function resolveExportExitCode(error: PlatformReadyExportError): number {
  return error.code === 'artifact-not-found' || error.code === 'artifact-read-failed' ? 3 : 1;
}

export const exportCommand = new Command('export')
  .description('Export an existing artifact for future platform import')
  .argument('<artifact-file>', 'Generated JSON/CSV/SQL artifact or saved-context JSON file')
  .option('--platform-ready', 'Emit the deterministic platform-ready export bundle')
  .option('-o, --output <file>', 'Write the export bundle to a file instead of stdout')
  .action(async (artifactFile: string, options: ExportCommandOptions) => {
    try {
      if (options.platformReady !== true) {
        console.error('Error: td export currently supports only --platform-ready');
        process.exit(1);
        return;
      }

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
      const patternVersionStorePath = resolvePatternVersionStorePath({
        currentWorkingDirectory,
        historyLogDirectory: effectiveConfig.config.history.logDirectory,
        workspaceRoot,
      });
      const envelope = await createPlatformReadyExport({
        artifactPath: path.resolve(artifactFile),
        historyPath,
        patternVersionStorePath,
      });
      const serializedEnvelope = `${JSON.stringify(envelope, null, 2)}\n`;

      if (options.output !== undefined) {
        const outputPath = path.resolve(options.output);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await Bun.write(outputPath, serializedEnvelope);
        return;
      }

      process.stdout.write(serializedEnvelope);
    } catch (error: unknown) {
      if (error instanceof CliConfigError) {
        console.error(`Error: ${error.message}`);
        process.exit(error.exitCode);
        return;
      }

      if (error instanceof PlatformReadyExportError) {
        console.error(`Error: ${error.message}`);
        process.exit(resolveExportExitCode(error));
        return;
      }

      if (
        error instanceof GenerationHistoryParseError
        || error instanceof PatternVersionStoreParseError
        || error instanceof PatternVersionStoreValidationError
      ) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
        return;
      }

      if (error instanceof Error && (error.name === 'TypeError' || error.name === 'SystemError')) {
        console.error(`Error: ${normalizeErrorMessage(error)}`);
        process.exit(3);
        return;
      }

      throw error;
    }
  });