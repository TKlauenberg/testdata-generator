import { Command } from 'commander';
import * as fs from 'fs/promises';
import { scan, parse, analyze } from '@testdata-ai/core';
import type { Diagnostic } from '@testdata-ai/core';

export const validateCommand = new Command('validate')
  .description('Validate DSL schema file')
  .argument('<file>', 'DSL schema file (.td)')
  .option('--json', 'Output validation results as JSON')
  .action(async (file: string, options: { json?: boolean }) => {
    try {
      // 1. Read file
      const source = await fs.readFile(file, 'utf-8');

      // 2. Validate (scan → parse → analyze)
      const errors = validateSchema(source);

      // 3. Display results
      if (errors.length === 0) {
        displaySuccess(options.json);
        process.exit(0);
      } else {
        displayErrors(errors, file, options.json);
        process.exit(1);
      }
    } catch (err) {
      // Handle file errors (exit code 3)
      handleFileError(err, file);
    }
  });

function validateSchema(source: string): Diagnostic[] {
  const errors: Diagnostic[] = [];

  // Scan
  const scanResult = scan(source);
  if (!scanResult.ok) {
    errors.push(...scanResult.errors);
    return errors; // Stop at scan errors
  }

  // Parse
  const parseResult = parse(scanResult.value);
  if (!parseResult.ok) {
    errors.push(...parseResult.errors);
    return errors; // Stop at parse errors
  }

  // Analyze
  const analyzeResult = analyze(parseResult.value);
  if (!analyzeResult.ok) {
    errors.push(...analyzeResult.errors);
  }

  return errors;
}

function displaySuccess(jsonMode?: boolean): void {
  if (jsonMode) {
    // eslint-disable-next-line no-console -- JSON output must go to stdout
    console.log(JSON.stringify({ valid: true, errors: [] }, null, 2));
  } else {
    // eslint-disable-next-line no-console -- Success message goes to stdout
    console.log('✓ Schema is valid');
  }
}

function displayErrors(
  errors: Diagnostic[],
  filename: string,
  jsonMode?: boolean
): void {
  if (jsonMode) {
    // eslint-disable-next-line no-console -- JSON output must go to stdout
    console.log(JSON.stringify({ valid: false, errors }, null, 2));
  } else {
    // Rust-style error formatting (simplified for MVP)
    for (const error of errors) {
      const location = error.location;
      if (location) {
        console.error(
          `\nError in ${filename} at line ${location.line}, column ${location.column}:`
        );
      } else {
        console.error(`\nError in ${filename}:`);
      }
      console.error(`  Problem: ${error.message}`);
      if (error.suggestion) {
        console.error(`  Suggestion: ${error.suggestion}`);
      }
    }
    console.error(
      `\nValidation failed with ${errors.length} error${
        errors.length > 1 ? 's' : ''
      }`
    );
  }
}

function handleFileError(err: unknown, filename: string): never {
  const error = err as { code?: string; message?: string };

  if (error.code === 'ENOENT') {
    console.error(`Error: File '${filename}' not found`);
  } else if (error.code === 'EACCES') {
    console.error(`Error: Permission denied reading '${filename}'`);
  } else {
    console.error(`Error reading file: ${error.message ?? 'Unknown error'}`);
  }
  process.exit(3);
}
