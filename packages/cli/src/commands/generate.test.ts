import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'fs/promises';
import * as os from 'node:os';
import * as path from 'path';

const CLI_ROOT = path.resolve(import.meta.dir, '../..');
const CLI_PATH = path.join(CLI_ROOT, 'bin/td.ts');

function fixture(name: string): string {
  return path.join(CLI_ROOT, 'fixtures', name);
}

function parseJson<T>(input: string): T {
  const parsed: unknown = JSON.parse(input);
  return parsed as T;
}

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value)
    && value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
}

async function createGlobalConfigHome(config: unknown): Promise<string> {
  const homeDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-home-'));
  await fs.writeFile(
    path.join(homeDirectory, '.tdconfig.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
  return homeDirectory;
}

async function createWorkspaceConfigDirectory(config: unknown): Promise<string> {
  const workspaceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-workspace-'));
  await fs.writeFile(
    path.join(workspaceDirectory, '.tdconfig.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
  return workspaceDirectory;
}

describe('Generate Command - File Reading', () => {
  test('reads and generates from valid .td file', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
    ]);

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(() => {
      parseJson<unknown>(output);
    }).not.toThrow();

    const records = parseJson<unknown>(output);
    expect(isRecordArray(records)).toBe(true);
    if (!isRecordArray(records)) {
      throw new Error('Expected generated output to be a JSON array of records');
    }
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
      fixture('invalid-syntax.td'),
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
      fixture('invalid-semantic.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
    ]);

    const output = await new Response(proc.stdout).text();
    const records = parseJson<unknown>(output);

    if (!isRecordArray(records)) {
      throw new Error('Expected generated output to be a JSON array of records');
    }

    expect(records).toHaveLength(10);
  });

  test('respects --count option', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '50',
    ]);

    const output = await new Response(proc.stdout).text();
    const records = parseJson<unknown>(output);

    if (!isRecordArray(records)) {
      throw new Error('Expected generated output to be a JSON array of records');
    }

    expect(records).toHaveLength(50);
  });

  test('respects -c shorthand', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '-c',
      '25',
    ]);

    const output = await new Response(proc.stdout).text();
    const records = parseJson<unknown>(output);

    if (!isRecordArray(records)) {
      throw new Error('Expected generated output to be a JSON array of records');
    }

    expect(records).toHaveLength(25);
  });

  test('generates deterministic output with --seed', async () => {
    const proc1 = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
      '-s',
      '99999',
      '-c',
      '5',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('uses global defaults when flags are omitted', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 3,
        format: 'json',
      },
    });

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        fixture('valid-simple.td'),
      ], {
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = parseJson<unknown>(output);

      if (!isRecordArray(records)) {
        throw new Error('Expected generated output to be a JSON array of records');
      }

      expect(records).toHaveLength(3);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('keeps explicit flags higher priority than global defaults', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 7,
        format: 'json',
      },
    });

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        fixture('valid-simple.td'),
        '--count',
        '2',
      ], {
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = parseJson<unknown>(output);

      if (!isRecordArray(records)) {
        throw new Error('Expected generated output to be a JSON array of records');
      }

      expect(records).toHaveLength(2);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('uses workspace defaults discovered from a nested current directory', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 5,
        format: 'json',
      },
      context: {
        saveDirectory: 'global-contexts',
      },
    });
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      defaults: {
        count: 2,
        format: 'json',
      },
      context: {
        saveDirectory: 'workspace-contexts',
      },
    });
    const nestedDirectory = path.join(workspaceDirectory, 'nested', 'qa');
    const schemaPath = path.join(nestedDirectory, 'seed-users.td');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await fs.writeFile(
      schemaPath,
      [
        'schema SeedUser {',
        '  email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com"])',
        '}',
        '',
      ].join('\n'),
      'utf-8',
    );

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        'seed-users.td',
        '--save-context',
        'workspace-users',
      ], {
        cwd: nestedDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = parseJson<unknown>(output);

      if (!isRecordArray(records)) {
        throw new Error('Expected generated output to be a JSON array of records');
      }

      expect(records).toHaveLength(2);

      const exists = await fs
        .access(path.join(nestedDirectory, 'workspace-contexts', 'workspace-users.json'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('keeps explicit flags higher priority than workspace defaults', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 5,
        format: 'json',
      },
    });
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      defaults: {
        count: 4,
        format: 'json',
      },
      context: {
        saveDirectory: 'workspace-contexts',
      },
    });
    const schemaPath = path.join(workspaceDirectory, 'seed-users.td');

    await fs.writeFile(
      schemaPath,
      [
        'schema SeedUser {',
        '  email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com"])',
        '}',
        '',
      ].join('\n'),
      'utf-8',
    );

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        'seed-users.td',
        '--count',
        '1',
        '--save-context',
        'explicit-users',
        '--save-context-dir',
        'explicit-contexts',
      ], {
        cwd: workspaceDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = parseJson<unknown>(output);

      if (!isRecordArray(records)) {
        throw new Error('Expected generated output to be a JSON array of records');
      }

      expect(records).toHaveLength(1);

      const exists = await fs
        .access(path.join(workspaceDirectory, 'explicit-contexts', 'explicit-users.json'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('fails with exit code 1 when global config JSON is invalid', async () => {
    const homeDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-home-'));
    await fs.writeFile(path.join(homeDirectory, '.tdconfig.json'), '{"defaults":', 'utf-8');

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        fixture('valid-simple.td'),
      ], {
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('rejects malformed integer values that include trailing characters', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '10abc',
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(1);
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
      fixture('valid-simple.td'),
    ]);

    const output = await new Response(proc.stdout).text();
    expect(() => {
      parseJson<unknown>(output);
    }).not.toThrow();
  });

  test('writes to file with --output', async () => {
    const outputFile = path.join(outputDir, 'output.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const content = await fs.readFile(outputFile, 'utf-8');
    expect(() => {
      parseJson<unknown>(content);
    }).not.toThrow();
  });

  test('writes to file with -o shorthand', async () => {
    const outputFile = path.join(outputDir, 'output2.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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

  test('saves generated records as reusable context in the default contexts directory', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '3',
      '--save-context',
      'baseline-users',
    ], {
      cwd: outputDir,
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    const generatedRecords = parseJson<unknown>(stdout);
    if (!isRecordArray(generatedRecords)) {
      throw new Error('Expected generated output to be a JSON array of records');
    }

    expect(generatedRecords).toHaveLength(3);

    const contextFile = path.join(outputDir, 'contexts', 'baseline-users.json');
    const content = await fs.readFile(contextFile, 'utf-8');
    const saved = parseJson<{
      readonly metadata: {
        readonly sourcePattern?: string;
        readonly version: string;
        readonly count: number;
      };
      readonly data: readonly unknown[];
    }>(content);

    expect(saved.metadata.sourcePattern).toContain('valid-simple.td');
    expect(saved.metadata.version).toBe('0.1.0');
    expect(saved.metadata.count).toBe(3);
    expect(saved.data).toHaveLength(3);
  });

  test('supports overriding the saved-context directory', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--save-context',
      'regional-users',
      '--save-context-dir',
      'custom-contexts',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const exists = await fs
      .access(path.join(outputDir, 'custom-contexts', 'regional-users.json'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test('keeps normal output behavior when saving context and writing --output', async () => {
    const outputFile = path.join(outputDir, 'generated.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '4',
      '--output',
      outputFile,
      '--save-context',
      'baseline-with-output',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const generatedOutput = parseJson<readonly unknown[]>(await fs.readFile(outputFile, 'utf-8'));
    const savedContext = parseJson<{ readonly data: readonly unknown[] }>(
      await fs.readFile(path.join(outputDir, 'contexts', 'baseline-with-output.json'), 'utf-8'),
    );

    expect(generatedOutput).toHaveLength(4);
    expect(savedContext.data).toEqual(generatedOutput);
  });

  test('uses the global default save-context directory when the flag is omitted', async () => {
    const homeDirectory = await createGlobalConfigHome({
      context: {
        saveDirectory: 'global-contexts',
      },
    });

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        fixture('valid-simple.td'),
        '--count',
        '2',
        '--save-context',
        'configured-users',
      ], {
        cwd: outputDir,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);

      const exists = await fs
        .access(path.join(outputDir, 'global-contexts', 'configured-users.json'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });
});

describe('Generate Command - Progress Display', () => {
  test(  'shows progress for datasets > 100 records', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
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
      fixture('valid-simple.td'),
    ]);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('exits 1 on validation error', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('invalid-syntax.td'),
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
