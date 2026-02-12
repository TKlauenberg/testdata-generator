/**
 * Init Command Unit Tests
 *
 * Tests for the `td init` command implementation.
 *
 * @module commands/init.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test-output-init');
const CLI_PATH = path.join(process.cwd(), 'packages/cli/bin/td.ts');

beforeEach(async () => {
  // Create clean test directory
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  // Clean up test directory
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('Init Command - Template Creation', () => {
  test('creates basic.td template in current directory', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Created basic.td');

    // Verify file was created
    const filePath = path.join(TEST_DIR, 'basic.td');
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    expect(fileExists).toBe(true);

    // Verify content is valid
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('schema');
    expect(content).toContain('User');
  });

  test('uses basic template as default when no argument provided', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('basic.td');

    const filePath = path.join(TEST_DIR, 'basic.td');
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    expect(fileExists).toBe(true);
  });

  test('creates basic template when explicitly specified', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init', 'basic'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Created basic.td');
  });
});

describe('Init Command - Template Validation', () => {
  test('exits with code 3 for invalid template name', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init', 'nonexistent'], {
      cwd: TEST_DIR,
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    const output = stderr + stdout;

    expect(exitCode).toBe(3);
    expect(output).toContain('Template');
    expect(output).toContain('not found');
  });

  test('lists available templates on error', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init', 'invalid'], {
      cwd: TEST_DIR,
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    const output = stderr + stdout;

    expect(exitCode).toBe(3);
    expect(output).toContain('Available templates');
    expect(output).toContain('basic');
  });
});

describe('Init Command - File Existence Handling', () => {
  test('prompts confirmation when file already exists', async () => {
    // Create file first
    const filePath = path.join(TEST_DIR, 'basic.td');
    await fs.writeFile(filePath, 'existing content', 'utf-8');

    // Run init command with stdin providing "n" (no)
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
      stdin: 'pipe',
    });

    // Send "n\n" to stdin
    if (proc.stdin) {
      proc.stdin.write('n\n');
      await proc.stdin.end();
    }

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(3);
    expect(output).toContain('cancelled');

    // Verify original content unchanged
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('existing content');
  });

  test('overwrites file when user confirms', async () => {
    // Create file first
    const filePath = path.join(TEST_DIR, 'basic.td');
    await fs.writeFile(filePath, 'old content', 'utf-8');

    // Run init command with stdin providing "y" (yes)
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
      stdin: 'pipe',
    });

    // Send "y\n" to stdin
    if (proc.stdin) {
      proc.stdin.write('y\n');
      await proc.stdin.end();
    }

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Created basic.td');

    // Verify file was overwritten
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).not.toBe('old content');
    expect(content).toContain('schema');
  });

  test('accepts "yes" as confirmation', async () => {
    // Create file first
    const filePath = path.join(TEST_DIR, 'basic.td');
    await fs.writeFile(filePath, 'old content', 'utf-8');

    // Run init command with "yes" response
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
      stdin: 'pipe',
    });

    if (proc.stdin) {
      proc.stdin.write('yes\n');
      await proc.stdin.end();
    }

    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);

    // Verify file was overwritten
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('schema');
  });
});

describe('Init Command - Success Output', () => {
  test('displays success message with filename', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Created');
    expect(output).toContain('basic.td');
  });

  test('displays next steps after creation', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('Next steps');
    expect(output).toContain('Edit');
    expect(output).toContain('Validate');
    expect(output).toContain('Generate');
  });

  test('includes validate command in next steps', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('td validate basic.td');
  });

  test('includes generate command example in next steps', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('td generate basic.td');
    expect(output).toContain('--count 10');
  });

  test('references documentation in next steps', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('docs/dsl-reference.md');
  });
});

describe('Init Command - Exit Codes', () => {
  test('exits with code 0 on success', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
  });

  test('exits with code 3 for invalid template', async () => {
    const proc = spawn(['bun', CLI_PATH, 'init', 'invalid'], {
      cwd: TEST_DIR,
    });

    const exitCode = await proc.exited;

    expect(exitCode).toBe(3);
  });

  test('exits with code 3 when user cancels overwrite', async () => {
    // Create existing file
    const filePath = path.join(TEST_DIR, 'basic.td');
    await fs.writeFile(filePath, 'content', 'utf-8');

    const proc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
      stdin: 'pipe',
    });

    if (proc.stdin) {
      proc.stdin.write('n\n');
      await proc.stdin.end();
    }

    const exitCode = await proc.exited;

    expect(exitCode).toBe(3);
  });
});

describe('Init Command - Template Validity', () => {
  test('created template is valid and can be validated', async () => {
    // Create template
    const initProc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    await initProc.exited;

    // Validate created template
    const validateProc = spawn(['bun', CLI_PATH, 'validate', 'basic.td'], {
      cwd: TEST_DIR,
    });

    const output = await new Response(validateProc.stdout).text();
    const exitCode = await validateProc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain('✓ Schema is valid');
  });

  test('created template can be used for generation', async () => {
    // Create template
    const initProc = spawn(['bun', CLI_PATH, 'init'], {
      cwd: TEST_DIR,
    });

    await initProc.exited;

    // Generate from template
    const generateProc = spawn(
      ['bun', CLI_PATH, 'generate', 'basic.td', '--count', '5'],
      {
        cwd: TEST_DIR,
      }
    );

    const exitCode = await generateProc.exited;

    expect(exitCode).toBe(0);
  });
});
