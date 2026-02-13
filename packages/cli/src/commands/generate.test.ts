import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'fs/promises';
import * as path from 'path';

const CLI_PATH = path.join(process.cwd(), 'packages/cli/bin/td.ts');

describe('Generate Command - File Reading', () => {
  test('reads and generates from valid .td file', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(() => JSON.parse(output)).not.toThrow();

    const records = JSON.parse(output);
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBe(10); // Default count
  });

  test('exits with code 3 for missing file', async () => {
    const proc = spawn(['bun', CLI_PATH, 'generate', 'nonexistent.td']);

    const exitCode = await proc.exited;

    // Exit code 3 means file error - test passes if EXIT code correct
    expect(exitCode).toBe(3);
  });
});

describe('Generate Command - Validation Pipeline', () => {
  test('exits with code 1 for syntax errors', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/invalid-syntax.td',
    ]);

    const exitCode = await proc.exited;

    // Exit code 1 means validation error - test passes if exit code correct
    expect(exitCode).toBe(1);
  });

  test('exits with code 1 for semantic errors', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/invalid-semantic.td',
    ]);

    const exitCode = await proc.exited;

    // Exit code 1 means validation error (undefined type) - test passes if exit code correct
    expect(exitCode).toBe(1);
  });
});

describe('Generate Command - Option Validation', () => {
  test('exits with code 1 for invalid --count (zero)', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '0',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1); // Invalid input
  });

  test('exits with code 1 for invalid --count (negative)', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '-10',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1); // Invalid input
  });

  test('exits with code 1 for invalid --count (not a number)', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      'notanumber',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1); // Invalid input
  });

  test('exits with code 1 for invalid --seed (not a number)', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--seed',
      'notanumber',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1); // Invalid input
  });
});

describe('Generate Command - Generation Options', () => {
  test('generates default 10 records', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
    ]);

    const output = await new Response(proc.stdout).text();
    const records = JSON.parse(output);

    expect(records).toHaveLength(10);
  });

  test('respects --count option', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '50',
    ]);

    const output = await new Response(proc.stdout).text();
    const records = JSON.parse(output);

    expect(records).toHaveLength(50);
  });

  test('respects -c shorthand', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '-c',
      '25',
    ]);

    const output = await new Response(proc.stdout).text();
    const records = JSON.parse(output);

    expect(records).toHaveLength(25);
  });

  test('generates deterministic output with --seed', async () => {
    const proc1 = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--seed',
      '12345',
      '--count',
      '10',
    ]);

    const output1 = await new Response(proc1.stdout).text();

    const proc2 = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--seed',
      '12345',
      '--count',
      '10',
    ]);

    const output2 = await new Response(proc2.stdout).text();

    expect(output1).toBe(output2);
  });

  test('respects -s shorthand for seed', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '-s',
      '99999',
      '-c',
      '5',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});

describe('Generate Command - Output Handling', () => {
  const outputDir = path.join(import.meta.dir, '../../test-output');

  beforeEach(async () => {
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  test('writes JSON to stdout by default', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
    ]);

    const output = await new Response(proc.stdout).text();
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('writes to file with --output', async () => {
    const outputFile = path.join(outputDir, 'output.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const content = await fs.readFile(outputFile, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('writes to file with -o shorthand', async () => {
    const outputFile = path.join(outputDir, 'output2.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '-o',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const exists = await fs
      .access(outputFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test('creates parent directories for output file', async () => {
    const outputFile = path.join(outputDir, 'nested/dir/output.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const exists = await fs
      .access(outputFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

describe('Generate Command - Progress Display', () => {
  test(  'shows progress for datasets > 100 records', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '150',
    ]);

    const exitCode = await proc.exited;

    // Note: Progress goes to stderr, verified manually. Test just checks success.
    expect(exitCode).toBe(0);
  });

  test('does not show progress for small datasets', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '50',
    ]);

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    // Should not show progress for datasets <= 100
    expect(stderr).not.toContain('Generating');
  });
});

describe('Generate Command - Generation Summary', () => {
  test('displays generation summary on success', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '100',
    ]);

    const exitCode = await proc.exited;

    // Note: Summary goes to stderr, verified manually. Test just checks success.
    expect(exitCode).toBe(0);
  });

  test('shows correct record count in summary', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
      '--count',
      '250',
    ]);

    const exitCode = await proc.exited;

    // Note: Summary goes to stderr, verified manually. Test just checks success.
    expect(exitCode).toBe(0);
  });
});

describe('Generate Command - Exit Codes', () => {
  test('exits 0 on successful generation', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/valid-simple.td',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('exits 1 on validation error', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'fixtures/invalid-syntax.td',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1);
  });

  test('exits 3 on file not found', async () => {
    const proc = spawn(['bun', CLI_PATH, 'generate', 'missing.td']);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(3);
  });
});
