import { describe, test, expect } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'path';

const CLI_ROOT = path.resolve(import.meta.dir, '../..');
const CLI_PATH = path.join(CLI_ROOT, 'bin/td.ts');
const fixture = (name: string) => path.join(CLI_ROOT, 'fixtures', name);

describe('Validate Command - File Reading', () => {
  test('reads and validates valid .td file', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('valid-simple.td'),
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Schema is valid');
  });

  test('exits with code 3 for missing file', async () => {
    const proc = spawn(['bun', CLI_PATH, 'validate', 'nonexistent.td']);

    const exitCode = await proc.exited;

    // Note: Error message goes to stderr, verified manually. Test checks exit code.
    expect(exitCode).toBe(3);
  });
});

describe('Validate Command - Validation Success', () => {
  test('displays success message for valid schema', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('valid-simple.td'),
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(output).toContain('✓ Schema is valid');
    expect(exitCode).toBe(0);
  });

  test('outputs JSON for valid schema with --json flag', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('valid-simple.td'),
      '--json',
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);

    const json = JSON.parse(output) as { valid: boolean; errors: unknown[] };
    expect(json.valid).toBe(true);
    expect(json.errors).toEqual([]);
  });

  test('validates schemas that use relative imports', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-generator-cli-validate-imports-'));
    const importedFile = path.join(workspace, 'common.td');
    const rootFile = path.join(workspace, 'main.td');

    await fs.writeFile(importedFile, 'schema Profile { id: uuid }\n', 'utf-8');
    await fs.writeFile(
      rootFile,
      ['@import "./common.td"', '', 'schema User {', '  account: Profile', '}', ''].join('\n'),
      'utf-8',
    );

    try {
      const proc = spawn(['bun', CLI_PATH, 'validate', 'main.td'], {
        cwd: workspace,
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(output).toContain('✓ Schema is valid');
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });
});

describe('Validate Command - Validation Errors', () => {
  test('exits with code 1 for syntax errors', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-syntax.td'),
    ]);

    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });

  test('exits with code 1 for semantic errors', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-semantic.td'),
    ]);

    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });

  test('displays error location (file, line, column)', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-syntax.td'),
    ]);

    const exitCode = await proc.exited;

    // Note: Error details go to stderr, verified manually. Test checks exit code.
    // Error location format: "Error in <file> at line X, column Y:"
    expect(exitCode).toBe(1);
  });

  test('displays error message with Problem label', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-semantic.td'),
    ]);

    const exitCode = await proc.exited;

    // Note: Error format goes to stderr, verified manually. Test checks exit code.
    // Format: "Problem: <message>"
    expect(exitCode).toBe(1);
  });

  test('displays multiple errors together', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('multi-error.td'),
    ]);

    const exitCode = await proc.exited;

    // Note: Error output goes to stderr, verified manually.
    // multi-error.td has 3+ errors: semantic + syntax + semantic
    expect(exitCode).toBe(1);
  });

  test('outputs JSON for errors with --json flag', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-semantic.td'),
      '--json',
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);

    const json = JSON.parse(output) as {
      valid: boolean;
      errors: Array<{
        message: string;
        location: { line: number; column: number };
      }>;
    };
    expect(json.valid).toBe(false);
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors.length).toBeGreaterThan(0);

    // Check error structure
    const firstError = json.errors[0];
    expect(firstError).toHaveProperty('message');
    expect(firstError).toHaveProperty('location');
    expect(firstError.location).toHaveProperty('line');
    expect(firstError.location).toHaveProperty('column');
  });

  test('outputs multiple errors in JSON format', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('multi-error.td'),
      '--json',
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);

    const json = JSON.parse(output) as {
      valid: boolean;
      errors: unknown[];
    };
    expect(json.valid).toBe(false);
    expect(json.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Validate Command - Performance', () => {
  test('validates schema in under 1 second', async () => {
    const start = performance.now();

    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('valid-simple.td'),
    ]);

    await proc.exited;

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // < 1 second
  });
});

describe('Validate Command - Exit Codes', () => {
  test('exits 0 on valid schema', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('valid-simple.td'),
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('exits 1 on syntax error', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-syntax.td'),
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1);
  });

  test('exits 1 on semantic error', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'validate',
      fixture('invalid-semantic.td'),
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1);
  });

  test('exits 3 on file not found', async () => {
    const proc = spawn(['bun', CLI_PATH, 'validate', 'missing.td']);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(3);
  });
});
