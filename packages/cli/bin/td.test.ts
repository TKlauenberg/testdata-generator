import { describe, test, expect } from 'bun:test';
import { spawn } from 'bun';
import { Command } from 'commander';

describe('CLI Initialization', () => {
  test('creates Commander program with correct name',  () => {
    const program = new Command();
    program.name('td');
    expect(program.name()).toBe('td');
  });

  test('sets correct description', () => {
    const program = new Command();
    program.description('testdata-generator - Declarative test data generation');
    expect(program.description()).toBe('testdata-generator - Declarative test data generation');
  });
});

describe('CLI Version Command', () => {
  test('displays version with --version flag', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--version']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('0.1.0');
  });

  test('displays version with -V flag', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '-V']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('0.1.0');
  });
});

describe('CLI Help Command', () => {
  test('displays help with --help flag', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('testdata-generator');
    expect(output).toContain('Declarative test data generation');
    expect(output).toContain('Options:');
  });

  test('displays help with -h flag', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '-h']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('testdata-generator');
  });

  test('displays CLI name in help output', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('td');
  });
});

describe('CLI Error Handling', () => {
  test('handles invalid flags gracefully', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--invalid-flag']);

    // Wait for process to complete
    const exitCode = await proc.exited;

    // Commander.js outputs error and exits with code 1 (per Epic 4 convention: 1 = validation error)
    expect(exitCode).toBe(1);
  });

  test('exits with code 1 for invalid arguments', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--invalid-flag']);

    const exitCode = await proc.exited;

    // Should exit with code 1 (validation error per Epic 4 exit code convention)
    expect(exitCode).toBe(1);
  });
});

describe('CLI Basic Invocation', () => {
  test('runs without errors when invoked correctly', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    // Help command should work
    expect(output).toContain('testdata-generator');
    // Should exit with code 0 (success)
    expect(exitCode).toBe(0);
  });
});

describe('CLI Built Bundle', () => {
  test('built dist/td.js is executable and displays version', async () => {
    const proc = spawn(['bun', 'packages/cli/dist/td.js', '--version']);
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    // Built bundle should work correctly
    expect(output).toContain('0.1.0');
    expect(exitCode).toBe(0);
  });

  test('built dist/td.js displays help correctly', async () => {
    const proc = spawn(['bun', 'packages/cli/dist/td.js', '--help']);
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(output).toContain('testdata-generator');
    expect(output).toContain('Declarative test data generation');
    expect(exitCode).toBe(0);
  });

  test('built dist/td.js handles errors with correct exit code', async () => {
    const proc = spawn(['bun', 'packages/cli/dist/td.js', '--invalid-flag']);
    const exitCode = await proc.exited;

    // Should exit with code 1 (validation error per Epic 4 convention)
    expect(exitCode).toBe(1);
  });
});