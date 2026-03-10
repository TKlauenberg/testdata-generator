/**
 * Generate Command Implementation
 *
 * Implements the `td generate` command for generating test data from DSL schemas.
 *
 * @module commands/generate
 */

import { Command } from 'commander';
import { generateData, saveAsContext, ValidationError } from '@testdata-ai/core';
import type { Diagnostic, GenerateOptions } from '@testdata-ai/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BUILT_IN_CLI_CONFIG, CliConfigError, loadEffectiveConfig, validateOutputFormat } from '../config';
import { formatErrors } from '../formatters';

/**
 * Progress display threshold - show progress for datasets larger than this.
 */
const PROGRESS_THRESHOLD = 100;

/**
 * Type guard to check if an error is a Node.js errno exception.
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

/**
 * Generate command for creating test data from DSL schemas.
 *
 * Usage:
 *   td generate <file.td>
 *   td generate schema.td --count 100
 *   td generate schema.td --seed 12345 -o output.json
 */
export const generateCommand = new Command('generate')
  .description('Generate test data from DSL schema')
  .argument('<file>', 'DSL schema file (.td)')
  .option(
    '-c, --count <number>',
    `Number of records to generate (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.defaults.count})`,
  )
  .option(
    '-f, --format <format>',
    `Output format (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.defaults.format})`,
  )
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-s, --seed <number>', 'Random seed for reproducibility')
  .option('--save-context <name>', 'Save generated records as reusable context')
  .option(
    '--save-context-dir <directory>',
    `Directory for saved context files (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.context.saveDirectory})`,
  )
  .action(async (file: string, options: CommandOptions) => {
    try {
      const workingDirectory = process.cwd();
      let cliConfig = BUILT_IN_CLI_CONFIG;
      try {
        const loadedConfig = await loadEffectiveConfig({ currentDirectory: workingDirectory });
        cliConfig = loadedConfig.config;
      } catch (error: unknown) {
        if (error instanceof CliConfigError) {
          console.error(`Error: ${error.message}`);
          process.exit(error.exitCode);
        }

        throw error;
      }

      if (cliConfig.generatorDefaults.length > 0) {
        console.error(
          'Note: config generatorDefaults are validated but not applied by td generate yet; application is planned in later Epic 9 stories.',
        );
      }

      // Parse options
      const count = parsePositiveIntegerOption(
        options.count ?? String(cliConfig.defaults.count),
        '--count',
      );
      const format = validateOutputFormat(
        options.format ?? cliConfig.defaults.format,
        options.format === undefined ? 'effective config defaults.format' : '--format',
      );
      const seed = options.seed ? parseIntegerOption(options.seed, '--seed') : undefined;

      const saveContextDirectory = options.saveContextDir ?? cliConfig.context.saveDirectory;

      // Step 1: Read file
      let source: string;
      try {
        source = await fs.readFile(file, 'utf-8');
      } catch (err: unknown) {
        if (isNodeError(err)) {
          if (err.code === 'ENOENT') {
            console.error(`Error: File '${file}' not found`);
          } else if (err.code === 'EACCES') {
            console.error(`Error: Permission denied reading '${file}'`);
          } else {
            console.error(`Error reading file: ${err.message}`);
          }
        } else {
          console.error(`Error reading file: ${String(err)}`);
        }
        process.exit(3);
      }

      // Step 2: Validate and generate
      const startTime = performance.now();
      const records: Array<Record<string, unknown>> = [];

      const genOptions: GenerateOptions = {
        count,
        seed,
      };

      try {
        // Show progress for large datasets
        let recordCount = 0;
        const showProgress = count > PROGRESS_THRESHOLD;

        for await (const record of generateData(source, genOptions)) {
          records.push(record);
          recordCount++;

          // Update progress every 100 records or 10% (whichever is more frequent)
          if (showProgress && (recordCount % 100 === 0 || recordCount % Math.ceil(count / 10) === 0)) {
            const percentage = Math.floor((recordCount / count) * 100);
            process.stderr.write(`\rGenerating... ${recordCount}/${count} (${percentage}%)`);
          }
        }

        // Clear progress line
        if (showProgress) {
          process.stderr.write('\r\x1b[K'); // Clear line
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        // Step 3: Format output
        const output = formatRecords(records, format);

        // Step 4: Write output
        if (options.output) {
          try {
            // Create parent directories if needed
            const outputDir = path.dirname(options.output);
            await fs.mkdir(outputDir, { recursive: true });
            await fs.writeFile(options.output, output);
          } catch (err: unknown) {
            if (isNodeError(err)) {
              console.error(`Error writing output file: ${err.message}`);
            } else {
              console.error(`Error writing output file: ${String(err)}`);
            }
            process.exit(3);
          }
        } else {
          // Write to stdout
          // eslint-disable-next-line no-console
          console.log(output);
        }

        if (options.saveContext) {
          try {
            const contextDirectory = path.resolve(workingDirectory, saveContextDirectory);
            const sourcePattern = path.relative(workingDirectory, path.resolve(file));

            await saveAsContext(records, options.saveContext, [], {
              directory: contextDirectory,
              sourcePattern,
            });
          } catch (err: unknown) {
            if (isNodeError(err)) {
              console.error(`Error saving context file: ${err.message}`);
            } else if (err instanceof Error) {
              console.error(`Error saving context file: ${err.message}`);
            } else {
              console.error(`Error saving context file: ${String(err)}`);
            }
            process.exit(3);
          }
        }

        // Step 5: Display summary
        console.error(`Generated ${count} records in ${duration}s`);

        process.exit(0);
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          // Validation error - display diagnostics
          console.error('Validation failed:\n');
          displayDiagnostics(err.diagnostics, source);
          process.exit(1);
        } else {
          // Generation error (should be rare)
          const error = err as Error;
          console.error(`Error during generation: ${error.message}`);
          process.exit(2);
        }
      }
    } catch (err: unknown) {
      // Unexpected error
      const error = err as Error;
      console.error(`Unexpected error: ${error.message}`);
      process.exit(2);
    }
  });

/**
 * Display diagnostic messages in a readable format using Rust-style formatting.
 *
 * @param diagnostics - Array of diagnostic messages from validation
 * @param source - Source code for context display
 */
function displayDiagnostics(diagnostics: Diagnostic[], source: string): void {
  // Use new Rust-style error formatter
  const formatted = formatErrors(diagnostics, source);
  console.error(formatted);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  if (errorCount > 0) {
    console.error(`\nValidation failed with ${errorCount} error(s) and ${warningCount} warning(s)`);
  }
}

/**
 * Command options from Commander.js
 */
interface CommandOptions {
  count?: string;
  format?: string;
  output?: string;
  seed?: string;
  saveContext?: string;
  saveContextDir?: string;
}

function parsePositiveIntegerOption(rawValue: string, optionName: string): number {
  const value = parseIntegerOption(rawValue, optionName);

  if (value <= 0) {
    console.error(`Error: ${optionName} must be a positive integer`);
    process.exit(1);
  }

  return value;
}

function parseIntegerOption(rawValue: string, optionName: string): number {
  const normalized = rawValue.trim();
  if (!/^[+-]?\d+$/.test(normalized)) {
    console.error(`Error: ${optionName} must be an integer`);
    process.exit(1);
  }

  const value = Number.parseInt(normalized, 10);

  return value;
}

function formatRecords(records: readonly Record<string, unknown>[], format: 'json'): string {
  if (format === 'json') {
    return JSON.stringify(records, null, 2);
  }

  return JSON.stringify(records, null, 2);
}
