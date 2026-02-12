/**
 * Generate Command Implementation
 *
 * Implements the `td generate` command for generating test data from DSL schemas.
 *
 * @module commands/generate
 */

import { Command } from 'commander';
import { generateData, ValidationError } from '@testdata-ai/core';
import type { Diagnostic, GenerateOptions } from '@testdata-ai/core';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  .option('-c, --count <number>', 'Number of records to generate', '10')
  .option('-f, --format <format>', 'Output format (json)', 'json')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-s, --seed <number>', 'Random seed for reproducibility')
  .action(async (file: string, options: CommandOptions) => {
    try {
      // Parse options
      const count = parseInt(options.count, 10);
      const seed = options.seed ? parseInt(options.seed, 10) : undefined;

      // Validate count
      if (isNaN(count) || count <= 0) {
        console.error('Error: --count must be a positive integer');
        process.exit(1);
      }

      // Validate seed if provided
      if (options.seed !== undefined) {
        const parsedSeed = parseInt(options.seed, 10);
        if (isNaN(parsedSeed)) {
          console.error('Error: --seed must be an integer');
          process.exit(1);
        }
      }

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
        const output = JSON.stringify(records, null, 2);

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

        // Step 5: Display summary
        console.error(`Generated ${count} records in ${duration}s`);

        process.exit(0);
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          // Validation error - display diagnostics
          console.error('Validation failed:\n');
          displayDiagnostics(err.diagnostics);
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
 * Display diagnostic messages in a readable format.
 *
 * @param diagnostics - Array of diagnostic messages from validation
 */
function displayDiagnostics(diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const severity = diagnostic.severity === 'error' ? 'Error' : 'Warning';

    if (diagnostic.location) {
      const location = `${diagnostic.location.file}:${diagnostic.location.line}:${diagnostic.location.column}`;
      console.error(`${severity} in ${location}`);
    } else {
      console.error(`${severity}:`);
    }

    console.error(`  ${diagnostic.message}\n`);
  }

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  if (errorCount > 0) {
    console.error(`Validation failed with ${errorCount} error(s) and ${warningCount} warning(s)`);
  }
}

/**
 * Command options from Commander.js
 */
interface CommandOptions {
  count: string;
  format: string;
  output?: string;
  seed?: string;
}
