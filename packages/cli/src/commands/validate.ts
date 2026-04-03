import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { validateSchema } from '@testdata-ai/core';
import type { Diagnostic } from '@testdata-ai/core';
import { findWorkspaceConfigPath } from '../config';
import { formatErrors } from '../formatters';

export const validateCommand = new Command('validate')
  .description('Validate DSL schema file')
  .argument('<file>', 'DSL schema file (.td)')
  .option('--json', 'Output validation results as JSON')
  .action(async (file: string, options: { json?: boolean }) => {
    try {
      const absoluteFile = path.resolve(file);
      const workspaceConfigPath = await findWorkspaceConfigPath({
        currentDirectory: path.dirname(absoluteFile),
      });
      const workspaceRoot = workspaceConfigPath !== undefined
        ? path.dirname(workspaceConfigPath)
        : undefined;

      // 1. Read file
      const source = await fs.readFile(absoluteFile, 'utf-8');

      // 2. Validate using the shared core pipeline
      const result = validateSchema(source, absoluteFile, {
        currentFile: absoluteFile,
        workspaceRoot,
      });

      // 3. Display results
      if (result.ok) {
        displaySuccess(options.json);
        process.exit(0);
      } else {
        displayErrors(result.errors, source, options.json);
        process.exit(1);
      }
    } catch (err) {
      // Handle file errors (exit code 3)
      handleFileError(err, file);
    }
  });

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
  source: string,
  jsonMode?: boolean
): void {
  if (jsonMode) {
    // eslint-disable-next-line no-console -- JSON output must go to stdout
    console.log(JSON.stringify({ valid: false, errors }, null, 2));
  } else {
    // Rust-style error formatting with errorFormatter
    const formatted = formatErrors(errors, source);
    console.error(formatted);
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
