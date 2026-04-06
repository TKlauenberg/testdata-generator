import { afterEach, describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  createGenerationMetadata,
  createPatternVersionSnapshot,
  encodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
  persistPatternVersionSnapshot,
  saveAsContext,
} from '@testdata-ai/core';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(import.meta.dir, '../..');
const CLI_PATH = path.join(CLI_ROOT, 'bin/td.ts');

const tempDirectories = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

async function createWorkspaceDirectory(prefix: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirectories.add(directory);
  return directory;
}

async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });

  return {
    stdout: await new Response(proc.stdout).text(),
    stderr: await new Response(proc.stderr).text(),
    exitCode: await proc.exited,
  };
}

function createTestMetadata(
  format: 'json' | 'csv' | 'sql' = 'json',
): {
  readonly metadata: ReturnType<typeof createGenerationMetadata>;
  readonly lineageInputs: readonly [{
    readonly type: 'root-pattern';
    readonly identifier: string;
    readonly content: string;
  }];
} {
  const lineageInputs = [
    {
      type: 'root-pattern' as const,
      identifier: 'schemas/exportable.td',
      content: 'schema Exportable { email: string generator=pick(array=["@context.users.random.email"]) }',
    },
  ];

  const metadata = createGenerationMetadata({
    timestamp: '2026-04-06T09:15:00.000Z',
    sourcePattern: 'schemas/exportable.td',
    count: 2,
    format,
    seed: 42,
    version: '0.1.0',
    lineageInputs,
    platformReserved: {
      contextReferences: [
        {
          raw: '@context.users.random.email',
          collection: 'users',
          tags: [],
          selector: { kind: 'random' },
          fieldPath: ['email'],
        },
      ],
    },
  });

  return { metadata, lineageInputs };
}

async function writeAuditTrail(options: {
  readonly historyPath: string;
  readonly storePath: string;
  readonly metadata: ReturnType<typeof createGenerationMetadata>;
  readonly lineageInputs: readonly {
    readonly type: 'root-pattern';
    readonly identifier: string;
    readonly content: string;
  }[];
}): Promise<void> {
  await appendGenerationHistoryEntry(
    options.historyPath,
    createGenerationHistoryEntry({
      metadata: options.metadata,
      status: 'success',
      durationMs: 120,
      recordsPerSecond: 16.67,
      outputPath: 'artifacts/exportable.json',
    }),
  );

  const snapshot = createPatternVersionSnapshot({
    metadata: options.metadata,
    lineageInputs: options.lineageInputs,
  });

  if (!snapshot) {
    throw new Error('Expected snapshot to exist for export test metadata');
  }

  await persistPatternVersionSnapshot(options.storePath, snapshot);
}

async function writeJsonArtifact(filePath: string, metadata: ReturnType<typeof createGenerationMetadata>): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify({
    metadata,
    data: [
      { id: 1, email: 'qa.one@example.com' },
      { id: 2, email: 'qa.two@example.com' },
    ],
  }, null, 2)}\n`);
}

async function writeCsvArtifact(filePath: string, metadata: ReturnType<typeof createGenerationMetadata>): Promise<void> {
  await Bun.write(
    filePath,
    [
      `# ${GENERATION_METADATA_COMMENT_LABEL}${encodeGenerationMetadataComment(metadata)}`,
      'id,email',
      '1,qa.one@example.com',
      '2,qa.two@example.com',
      '',
    ].join('\n'),
  );
}

describe('td export', () => {
  test('exports a platform-ready bundle to stdout for generated JSON artifacts', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-command-');
    const { metadata, lineageInputs } = createTestMetadata('json');
    const artifactPath = path.join(workspaceDirectory, 'artifacts', 'exportable.json');

    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await writeJsonArtifact(artifactPath, metadata);
    await writeAuditTrail({
      historyPath: path.join(workspaceDirectory, '.td-history.jsonl'),
      storePath: path.join(workspaceDirectory, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const result = await runCli(['export', 'artifacts/exportable.json', '--platform-ready'], workspaceDirectory);
    const parsed = JSON.parse(result.stdout) as {
      readonly artifact: { readonly type: string };
      readonly metadata: { readonly platformReserved?: { readonly contextReferences?: readonly unknown[] } };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.artifact.type).toBe('generated-json');
    expect(parsed.metadata.platformReserved?.contextReferences).toHaveLength(1);
  });

  test('writes platform-ready bundles to a file and preserves saved-context metadata', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-saved-context-');
    const { metadata, lineageInputs } = createTestMetadata('csv');
    const contextsDirectory = path.join(workspaceDirectory, 'contexts');
    const outputPath = path.join(workspaceDirectory, 'exports', 'platform-ready.json');

    await saveAsContext(
      [
        { id: 1, email: 'qa.one@example.com' },
        { id: 2, email: 'qa.two@example.com' },
      ],
      'exportable',
      ['staging'],
      {
        directory: contextsDirectory,
        timestamp: metadata.timestamp,
        sourcePattern: metadata.sourcePattern,
        format: metadata.format,
        version: metadata.version,
        seed: metadata.seed,
        patternHash: metadata.patternHash,
        lineage: metadata.lineage,
        platformReserved: metadata.platformReserved,
      },
    );
    await writeAuditTrail({
      historyPath: path.join(workspaceDirectory, '.td-history.jsonl'),
      storePath: path.join(workspaceDirectory, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const result = await runCli([
      'export',
      'contexts/exportable.json',
      '--platform-ready',
      '--output',
      'exports/platform-ready.json',
    ], workspaceDirectory);
    const written = JSON.parse(await fs.readFile(outputPath, 'utf-8')) as {
      readonly artifact: { readonly type: string };
      readonly metadata: { readonly format: string };
    };

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(written.artifact.type).toBe('saved-context-json');
    expect(written.metadata.format).toBe('csv');
  });

  test('uses audit history format for legacy saved-context artifacts without embedded format metadata', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-legacy-saved-context-');
    const { metadata, lineageInputs } = createTestMetadata('csv');
    const artifactPath = path.join(workspaceDirectory, 'contexts', 'legacy.json');

    await saveAsContext(
      [
        { id: 1, email: 'qa.one@example.com' },
        { id: 2, email: 'qa.two@example.com' },
      ],
      'legacy',
      ['staging'],
      {
        directory: path.join(workspaceDirectory, 'contexts'),
        timestamp: metadata.timestamp,
        sourcePattern: metadata.sourcePattern,
        version: metadata.version,
        seed: metadata.seed,
        patternHash: metadata.patternHash,
        lineage: metadata.lineage,
        platformReserved: metadata.platformReserved,
      },
    );
    await writeAuditTrail({
      historyPath: path.join(workspaceDirectory, '.td-history.jsonl'),
      storePath: path.join(workspaceDirectory, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const result = await runCli(['export', 'contexts/legacy.json', '--platform-ready'], workspaceDirectory);
    const parsed = JSON.parse(result.stdout) as {
      readonly metadata: { readonly format: string };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.metadata.format).toBe('csv');
    expect(await fs.readFile(artifactPath, 'utf-8')).not.toContain('"format"');
  });

  test('fails clearly for unsupported artifact types and malformed metadata comments', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-failures-');
    await Bun.write(path.join(workspaceDirectory, 'artifact.txt'), 'unsupported');
    await Bun.write(
      path.join(workspaceDirectory, 'bad.csv'),
      `# ${GENERATION_METADATA_COMMENT_LABEL}not-valid-base64\nid,email\n1,qa.one@example.com\n`,
    );

    const unsupported = await runCli(['export', 'artifact.txt', '--platform-ready'], workspaceDirectory);
    const malformed = await runCli(['export', 'bad.csv', '--platform-ready'], workspaceDirectory);

    expect(unsupported.exitCode).toBe(1);
    expect(unsupported.stderr).toContain('supports generated JSON, CSV, SQL, and saved-context JSON');
    expect(malformed.exitCode).toBe(1);
    expect(malformed.stderr).toContain('invalid generation metadata comment');
  });

  test('fails clearly for malformed saved-context reserved metadata', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-invalid-saved-context-');
    const artifactPath = path.join(workspaceDirectory, 'contexts', 'bad.json');
    const { metadata, lineageInputs } = createTestMetadata('json');

    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await Bun.write(artifactPath, `${JSON.stringify({
      metadata: {
        timestamp: metadata.timestamp,
        sourcePattern: metadata.sourcePattern,
        count: 1,
        version: metadata.version,
        tags: [],
        patternHash: metadata.patternHash,
        platformReserved: {
          contextReferences: [1],
        },
      },
      data: [{ id: 1 }],
    }, null, 2)}\n`);
    await writeAuditTrail({
      historyPath: path.join(workspaceDirectory, '.td-history.jsonl'),
      storePath: path.join(workspaceDirectory, '.td-pattern-versions'),
      metadata: createGenerationMetadata({
        timestamp: metadata.timestamp,
        sourcePattern: metadata.sourcePattern,
        count: 1,
        format: 'json',
        seed: metadata.seed,
        version: metadata.version,
        patternHash: metadata.patternHash,
        lineage: metadata.lineage,
        platformReserved: metadata.platformReserved,
      }),
      lineageInputs,
    });

    const result = await runCli(['export', 'contexts/bad.json', '--platform-ready'], workspaceDirectory);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('looks like a saved-context envelope');
  });

  test('fails clearly when matching audit history is missing', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-missing-history-');
    const { metadata } = createTestMetadata('json');
    const artifactPath = path.join(workspaceDirectory, 'exportable.json');

    await writeJsonArtifact(artifactPath, metadata);

    const result = await runCli(['export', 'exportable.json', '--platform-ready'], workspaceDirectory);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No generation history entry matches artifact metadata');
  });

  test('resolves workspace-relative audit paths from nested directories', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-ai-export-workspace-root-');
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa');
    const artifactPath = path.join(nestedDirectory, 'artifacts', 'exportable.csv');
    const { metadata, lineageInputs } = createTestMetadata('csv');

    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await fs.writeFile(
      path.join(workspaceDirectory, '.tdconfig.json'),
      JSON.stringify({ history: { logDirectory: 'audit/trail' } }, null, 2),
      'utf-8',
    );
    await writeCsvArtifact(artifactPath, metadata);
    await writeAuditTrail({
      historyPath: path.join(workspaceDirectory, 'audit', 'trail', '.td-history.jsonl'),
      storePath: path.join(workspaceDirectory, 'audit', 'trail', '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const result = await runCli(['export', 'artifacts/exportable.csv', '--platform-ready'], nestedDirectory);
    const parsed = JSON.parse(result.stdout) as { readonly artifact: { readonly type: string } };

    expect(result.exitCode).toBe(0);
    expect(parsed.artifact.type).toBe('generated-csv');
  });
});