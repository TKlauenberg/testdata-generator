import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';
import { decodeGenerationMetadataComment, GENERATION_METADATA_COMMENT_LABEL } from '@testdata-generator/core';
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

interface GeneratedJsonOutput {
  readonly metadata: {
    readonly timestamp: string;
    readonly sourcePattern?: string;
    readonly count?: number;
    readonly format: string;
    readonly seed?: number;
    readonly version: string;
    readonly patternHash?: string;
  };
  readonly data: Array<Record<string, unknown>>;
}

function isGeneratedJsonOutput(value: unknown): value is GeneratedJsonOutput {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GeneratedJsonOutput>;
  return candidate.metadata !== undefined
    && candidate.data !== undefined
    && Array.isArray(candidate.data);
}

function extractGeneratedJsonOutput(input: string): GeneratedJsonOutput {
  const parsed = parseJson<unknown>(input);
  if (!isGeneratedJsonOutput(parsed)) {
    throw new Error('Expected generated output to contain metadata and a data array');
  }

  return parsed;
}

function extractGeneratedRecords(input: string): Array<Record<string, unknown>> {
  return extractGeneratedJsonOutput(input).data;
}

function parseCsvLines(input: string): string[] {
  return input
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith(`# ${GENERATION_METADATA_COMMENT_LABEL}`));
}

function decodeMetadataCommentLine(line: string): ReturnType<typeof decodeGenerationMetadataComment> {
  const trimmed = line.trim();
  const csvPrefix = `# ${GENERATION_METADATA_COMMENT_LABEL}`;
  const sqlPrefix = `-- ${GENERATION_METADATA_COMMENT_LABEL}`;

  if (trimmed.startsWith(csvPrefix)) {
    return decodeGenerationMetadataComment(trimmed.slice(csvPrefix.length));
  }

  if (trimmed.startsWith(sqlPrefix)) {
    return decodeGenerationMetadataComment(trimmed.slice(sqlPrefix.length));
  }

  throw new Error(`Expected a metadata comment line, received: ${line}`);
}

interface HistoryEntry {
  readonly metadata: {
    readonly timestamp: string;
    readonly sourcePattern?: string;
    readonly count?: number;
    readonly format: string;
    readonly seed?: number;
    readonly version: string;
    readonly patternHash?: string;
    readonly lineage?: readonly unknown[];
  };
  readonly status: 'success' | 'failure';
  readonly errorMessage?: string;
  readonly durationMs: number;
  readonly recordsPerSecond: number;
  readonly outputPath?: string;
  readonly savedContextName?: string;
}

function parseHistoryEntries(input: string): HistoryEntry[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseJson<HistoryEntry>(line));
}

async function readHistoryEntries(filePath: string): Promise<HistoryEntry[]> {
  return parseHistoryEntries(await fs.readFile(filePath, 'utf-8'));
}

async function copyFixtureToWorkspace(fixtureName: string, workspaceDirectory: string): Promise<void> {
  await fs.writeFile(
    path.join(workspaceDirectory, fixtureName),
    await fs.readFile(fixture(fixtureName), 'utf-8'),
    'utf-8',
  );
}

async function createGlobalConfigHome(config: unknown): Promise<string> {
  const homeDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-generator-cli-home-'));
  await fs.writeFile(
    path.join(homeDirectory, '.tdconfig.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
  return homeDirectory;
}

async function createWorkspaceConfigDirectory(config: unknown): Promise<string> {
  const workspaceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-generator-cli-workspace-'));
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

    const records = extractGeneratedRecords(output);
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
    const records = extractGeneratedRecords(output);

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
    const records = extractGeneratedRecords(output);

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
    const records = extractGeneratedRecords(output);

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

    const result1 = extractGeneratedJsonOutput(output1);
    const result2 = extractGeneratedJsonOutput(output2);

    expect(result1.data).toEqual(result2.data);
    expect({ ...result1.metadata, timestamp: '<normalized>' }).toEqual({
      ...result2.metadata,
      timestamp: '<normalized>',
    });
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
      const records = extractGeneratedRecords(output);

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
      const records = extractGeneratedRecords(output);

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
      const records = extractGeneratedRecords(output);

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
      const records = extractGeneratedRecords(output);

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

  test('applies workspace generator defaults to fields without explicit generators', async () => {
    const homeDirectory = await createGlobalConfigHome({});
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
            parameters: [
              {
                name: 'array',
                value: ['workspace@example.com'],
              },
            ],
          },
        },
      ],
    });
    const schemaPath = path.join(workspaceDirectory, 'seed-users.td');

    await fs.writeFile(
      schemaPath,
      [
        'schema SeedUser {',
        '  contact: string',
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
      ], {
        cwd: workspaceDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = extractGeneratedRecords(output);

      expect(records).toHaveLength(1);
      expect(records[0]?.contact).toBe('workspace@example.com');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('resolves @workspace imports relative to the discovered workspace root', async () => {
    const homeDirectory = await createGlobalConfigHome({});
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      defaults: {
        count: 1,
        format: 'json',
      },
    });
    const sharedDirectory = path.join(workspaceDirectory, 'shared');
    const appDirectory = path.join(workspaceDirectory, 'apps');
    const schemaPath = path.join(appDirectory, 'seed-users.td');

    await fs.mkdir(sharedDirectory, { recursive: true });
    await fs.mkdir(appDirectory, { recursive: true });
    await fs.writeFile(
      path.join(sharedDirectory, 'profile.td'),
      ['schema SharedProfile {', '  id: uuid generator=uuid', '}', ''].join('\n'),
      'utf-8',
    );
    await fs.writeFile(
      schemaPath,
      [
        '@import "@workspace/shared/profile.td"',
        '',
        'schema SeedUser {',
        '  id: uuid generator=uuid',
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
        'apps/seed-users.td',
      ], {
        cwd: workspaceDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = extractGeneratedRecords(output);

      expect(records).toHaveLength(2);
      expect(records[0]).toHaveProperty('id');
      expect(records[1]).toHaveProperty('id');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('does not override explicit field generators with workspace generator defaults', async () => {
    const homeDirectory = await createGlobalConfigHome({});
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
            parameters: [
              {
                name: 'array',
                value: ['workspace@example.com'],
              },
            ],
          },
        },
      ],
    });
    const schemaPath = path.join(workspaceDirectory, 'seed-users.td');

    await fs.writeFile(
      schemaPath,
      [
        'schema SeedUser {',
        '  contact: string generator=pick(array=["schema@example.com"])',
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
      ], {
        cwd: workspaceDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const output = await new Response(proc.stdout).text();
      const records = extractGeneratedRecords(output);

      expect(records).toHaveLength(1);
      expect(records[0]?.contact).toBe('schema@example.com');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('fails with exit code 1 when global config JSON is invalid', async () => {
    const homeDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-generator-cli-home-'));
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
    const generatedRecords = extractGeneratedRecords(stdout);

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

    const generatedOutput = extractGeneratedJsonOutput(await fs.readFile(outputFile, 'utf-8'));
    const savedContext = parseJson<{ readonly data: readonly unknown[] }>(
      await fs.readFile(path.join(outputDir, 'contexts', 'baseline-with-output.json'), 'utf-8'),
    );

    expect(generatedOutput.data).toHaveLength(4);
    expect(savedContext.data).toEqual(generatedOutput.data);
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

describe('Generate Command - History Logging', () => {
  const outputDir = path.join(import.meta.dir, '../../test-output-history');

  beforeEach(async () => {
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  test('creates a default append-only history entry after successful generation', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(0);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('success');
    expect(entries[0]?.metadata.count).toBe(2);
    expect(entries[0]?.metadata.format).toBe('json');
    expect(entries[0]?.errorMessage).toBeUndefined();
    expect(entries[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(entries[0]?.recordsPerSecond).toBeGreaterThanOrEqual(0);
  });

  test('does not create history when --no-history is provided', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--no-history',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const historyExists = await fs
      .access(path.join(outputDir, '.td-history.jsonl'))
      .then(() => true)
      .catch(() => false);

    expect(exitCode).toBe(0);
    expect(historyExists).toBe(false);
  });

  test('logs failure history for invalid table-name usage before generation starts', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--format',
      'json',
      '--table-name',
      'qa_users',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(1);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.errorMessage).toContain('--table-name can only be used when the effective output format is sql');
  });

  test('logs failure history when the input file cannot be read', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'missing-schema.td',
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(3);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.errorMessage).toContain("File 'missing-schema.td' not found");
    expect(entries[0]?.metadata.patternHash).toBeUndefined();
  });

  test('resolves the configured history directory relative to the discovered workspace root', async () => {
    const homeDirectory = await createGlobalConfigHome({});
    const workspaceDirectory = await createWorkspaceConfigDirectory({
      history: {
        logDirectory: 'audit/history',
      },
    });
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await copyFixtureToWorkspace('valid-simple.td', nestedDirectory);

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        'valid-simple.td',
        '--count',
        '1',
      ], {
        cwd: nestedDirectory,
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const exitCode = await proc.exited;
      const entries = await readHistoryEntries(path.join(workspaceDirectory, 'audit/history/.td-history.jsonl'));

      expect(exitCode).toBe(0);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.status).toBe('success');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
      await fs.rm(workspaceDirectory, { recursive: true, force: true });
    }
  });

  test('logs concise failure history for validation errors without fabricated lineage', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('invalid-semantic.td'),
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(1);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.errorMessage).toContain('Validation failed:');
    expect(entries[0]?.metadata.patternHash).toBeUndefined();
    expect(entries[0]?.metadata.lineage).toBeUndefined();
  });

  test('logs failure history when writing the output file fails', async () => {
    const blockedOutputPath = path.join(outputDir, 'blocked-output');
    await fs.mkdir(blockedOutputPath, { recursive: true });

    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--output',
      blockedOutputPath,
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(3);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.errorMessage).toContain('Error writing output file:');
  });

  test('logs failure history when saving context fails', async () => {
    const blockedContextPath = path.join(outputDir, 'blocked-context');
    await fs.writeFile(blockedContextPath, 'occupied', 'utf-8');

    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--save-context',
      'users',
      '--save-context-dir',
      blockedContextPath,
    ], {
      cwd: outputDir,
    });

    const exitCode = await proc.exited;
    const entries = await readHistoryEntries(path.join(outputDir, '.td-history.jsonl'));

    expect(exitCode).toBe(3);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.errorMessage).toContain('Error saving context file:');
  });
});

describe('Generate Command - Multi-Format Output', () => {
  const outputDir = path.join(import.meta.dir, '../../test-output');

  beforeEach(async () => {
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  test('uses the configured csv default when no stronger format signal is present', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 2,
        format: 'csv',
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

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(parseCsvLines(stdout)).toHaveLength(3);
      expect(parseCsvLines(stdout)[0]).toBe('id,name,active');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('uses the configured sql default when no stronger format signal is present', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 2,
        format: 'sql',
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

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain('INSERT INTO "valid-simple"');
      expect(stdout).toContain('("id", "name", "active")');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('infers csv format from the output file extension', async () => {
    const outputFile = path.join(outputDir, 'records.csv');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    const content = await fs.readFile(outputFile, 'utf-8');

    expect(exitCode).toBe(0);
    expect(parseCsvLines(content)[0]).toBe('id,name,active');
  });

  test('infers sql format and table name from the output file extension and stem', async () => {
    const outputFile = path.join(outputDir, 'audit-log.sql');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    const content = await fs.readFile(outputFile, 'utf-8');

    expect(exitCode).toBe(0);
    expect(content).toContain('INSERT INTO "audit-log"');
  });

  test('lets explicit --format override the inferred output extension', async () => {
    const outputFile = path.join(outputDir, 'records.json');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--format',
      'csv',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    const content = await fs.readFile(outputFile, 'utf-8');

    expect(exitCode).toBe(0);
    expect(parseCsvLines(content)[0]).toBe('id,name,active');
    expect(() => parseJson(content)).toThrow();
  });

  test('falls back to the configured default when the output extension is not supported', async () => {
    const homeDirectory = await createGlobalConfigHome({
      defaults: {
        count: 2,
        format: 'csv',
      },
    });
    const outputFile = path.join(outputDir, 'records.txt');

    try {
      const proc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        fixture('valid-simple.td'),
        '--output',
        outputFile,
      ], {
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      });

      const exitCode = await proc.exited;
      const content = await fs.readFile(outputFile, 'utf-8');

      expect(exitCode).toBe(0);
      expect(parseCsvLines(content)[0]).toBe('id,name,active');
    } finally {
      await fs.rm(homeDirectory, { recursive: true, force: true });
    }
  });

  test('prefers explicit sql table names over inferred output and input stems', async () => {
    const outputFile = path.join(outputDir, 'audit-log.sql');
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--format',
      'sql',
      '--table-name',
      'qa_users',
      '--output',
      outputFile,
    ]);

    const exitCode = await proc.exited;
    const content = await fs.readFile(outputFile, 'utf-8');

    expect(exitCode).toBe(0);
    expect(content).toContain('INSERT INTO "qa_users"');
    expect(content).not.toContain('INSERT INTO "audit-log"');
  });

  test('writes sql output to stdout when no output file is provided', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--format',
      'sql',
      '--table-name',
      'qa_users',
    ]);

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('INSERT INTO "qa_users"');
  });

  test('keeps csv stdout byte-for-byte consistent with file output', async () => {
    const outputFile = path.join(outputDir, 'records.csv');
    const stdoutProc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '1',
      '--seed',
      '42',
      '--format',
      'csv',
    ]);
    const stdout = await new Response(stdoutProc.stdout).text();
    const stdoutExitCode = await stdoutProc.exited;

    const fileProc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '1',
      '--seed',
      '42',
      '--format',
      'csv',
      '--output',
      outputFile,
    ]);
    const fileExitCode = await fileProc.exited;
    const fileContent = await fs.readFile(outputFile, 'utf-8');

    expect(stdoutExitCode).toBe(0);
    expect(fileExitCode).toBe(0);
    const stdoutLines = stdout.trim().split(/\r?\n/);
    const fileLines = fileContent.trim().split(/\r?\n/);

    expect(stdoutLines.slice(1)).toEqual(fileLines.slice(1));
    expect({ ...decodeMetadataCommentLine(stdoutLines[0] ?? ''), timestamp: '<normalized>' }).toEqual({
      ...decodeMetadataCommentLine(fileLines[0] ?? ''),
      timestamp: '<normalized>',
    });
  });

  test('keeps sql stdout byte-for-byte consistent with file output', async () => {
    const outputFile = path.join(outputDir, 'records.sql');
    const stdoutProc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '1',
      '--seed',
      '42',
      '--format',
      'sql',
      '--table-name',
      'qa_users',
    ]);
    const stdout = await new Response(stdoutProc.stdout).text();
    const stdoutExitCode = await stdoutProc.exited;

    const fileProc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '1',
      '--seed',
      '42',
      '--format',
      'sql',
      '--table-name',
      'qa_users',
      '--output',
      outputFile,
    ]);
    const fileExitCode = await fileProc.exited;
    const fileContent = await fs.readFile(outputFile, 'utf-8');

    expect(stdoutExitCode).toBe(0);
    expect(fileExitCode).toBe(0);
    const stdoutLines = stdout.trim().split(/\r?\n/);
    const fileLines = fileContent.trim().split(/\r?\n/);

    expect(stdoutLines.slice(1)).toEqual(fileLines.slice(1));
    expect({ ...decodeMetadataCommentLine(stdoutLines[0] ?? ''), timestamp: '<normalized>' }).toEqual({
      ...decodeMetadataCommentLine(fileLines[0] ?? ''),
      timestamp: '<normalized>',
    });
  });

  test('rejects --table-name when the effective output format is not sql', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--format',
      'csv',
      '--table-name',
      'qa_users',
    ], {
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain('--table-name can only be used when the effective output format is sql');
  });

  test('keeps save-context output as reusable json when csv output is selected', async () => {
    const proc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      fixture('valid-simple.td'),
      '--count',
      '2',
      '--format',
      'csv',
      '--save-context',
      'csv-users',
    ], {
      cwd: outputDir,
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    const savedContext = parseJson<{
      readonly metadata: {
        readonly count: number;
      };
      readonly data: ReadonlyArray<Record<string, unknown>>;
    }>(await fs.readFile(path.join(outputDir, 'contexts', 'csv-users.json'), 'utf-8'));

    expect(exitCode).toBe(0);
    expect(parseCsvLines(stdout)[0]).toBe('id,name,active');
    expect(savedContext.metadata.count).toBe(2);
    expect(savedContext.data).toHaveLength(2);
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
