import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  createGenerationMetadata,
  createPatternVersionSnapshot,
  createPlatformReadyExport,
  encodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
  persistPatternVersionSnapshot,
  PlatformReadyExportError,
  saveAsContext,
} from '../index';
import type {
  CreatePlatformReadyExportOptions,
  GenerationMetadata,
  GenerationMetadataLineageInput,
} from '../index';

const TEST_DIR = path.join(import.meta.dir, '../../../__test-output__/platform-ready-export');

const contextReferences = [
  {
    raw: '@context.users[0].email',
    collection: 'users',
    tags: [],
    selector: { kind: 'index' as const, index: 0 },
    fieldPath: ['email'],
  },
  {
    raw: '@context.users@staging.random.email',
    collection: 'users',
    tags: ['staging'],
    selector: { kind: 'random' as const },
    fieldPath: ['email'],
  },
];

function createTestMetadata(overrides: Partial<GenerationMetadata> = {}): {
  readonly metadata: GenerationMetadata;
  readonly lineageInputs: readonly GenerationMetadataLineageInput[];
} {
  const lineageInputs: readonly GenerationMetadataLineageInput[] = [
    {
      type: 'root-pattern',
      identifier: 'schemas/exportable.td',
      content: 'schema Exportable { email: string generator=pick(array=["@context.users[0].email"]) }',
    },
  ];

  const metadata = createGenerationMetadata({
    timestamp: '2026-04-06T09:15:00.000Z',
    sourcePattern: 'schemas/exportable.td',
    count: 2,
    format: 'json',
    seed: 42,
    version: '0.1.0',
    lineageInputs,
    platformReserved: {
      contextReferences,
    },
    ...overrides,
  });

  return { metadata, lineageInputs };
}

async function writeAuditTrail(options: {
  readonly historyPath: string;
  readonly storePath: string;
  readonly metadata: GenerationMetadata;
  readonly lineageInputs: readonly GenerationMetadataLineageInput[];
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
    throw new Error('Expected pattern version snapshot to be created for test metadata');
  }

  await persistPatternVersionSnapshot(options.storePath, snapshot);
}

async function createJsonArtifact(filePath: string, metadata: GenerationMetadata): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify({
    metadata,
    data: [
      { id: 1, email: 'qa.one@example.com' },
      { id: 2, email: 'qa.two@example.com' },
    ],
  }, null, 2)}\n`);
}

async function createCsvArtifact(filePath: string, metadata: GenerationMetadata): Promise<void> {
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

async function createSqlArtifact(filePath: string, metadata: GenerationMetadata): Promise<void> {
  await Bun.write(
    filePath,
    [
      `-- ${GENERATION_METADATA_COMMENT_LABEL}${encodeGenerationMetadataComment(metadata)}`,
      `INSERT INTO "users" ("id", "email") VALUES (1, 'qa.one@example.com'), (2, 'qa.two@example.com');`,
      '',
    ].join('\n'),
  );
}

function createExportOptions(artifactPath: string): CreatePlatformReadyExportOptions {
  return {
    artifactPath,
    historyPath: path.join(TEST_DIR, '.td-history.jsonl'),
    patternVersionStorePath: path.join(TEST_DIR, '.td-pattern-versions'),
    exportedAt: '2026-04-06T12:00:00.000Z',
  };
}

describe('createPlatformReadyExport', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('creates a platform-ready bundle for generated JSON artifacts', async () => {
    const { metadata, lineageInputs } = createTestMetadata();
    const artifactPath = path.join(TEST_DIR, 'generated.json');

    await createJsonArtifact(artifactPath, metadata);
    await writeAuditTrail({
      historyPath: path.join(TEST_DIR, '.td-history.jsonl'),
      storePath: path.join(TEST_DIR, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const bundle = await createPlatformReadyExport(createExportOptions(artifactPath));
    const patternHash = metadata.patternHash;

    if (patternHash === undefined) {
      throw new Error('Expected patternHash to be defined for export test metadata');
    }

    expect(bundle.artifact.type).toBe('generated-json');
    expect(bundle.metadata.platformReserved?.contextReferences).toEqual([
      contextReferences[0],
      contextReferences[1],
    ]);
    expect(bundle.historyEntry.metadata.patternHash).toBe(metadata.patternHash);
    expect(bundle.patternSnapshot.patternHash).toBe(patternHash);
  });

  test('creates a platform-ready bundle for generated CSV and SQL artifacts', async () => {
    const { metadata, lineageInputs } = createTestMetadata({ format: 'csv' });
    const csvPath = path.join(TEST_DIR, 'generated.csv');
    const sqlMetadata = createGenerationMetadata({
      ...metadata,
      timestamp: '2026-04-06T09:15:01.000Z',
      format: 'sql',
    });
    const sqlPath = path.join(TEST_DIR, 'generated.sql');

    await writeAuditTrail({
      historyPath: path.join(TEST_DIR, '.td-history.jsonl'),
      storePath: path.join(TEST_DIR, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });
    await appendGenerationHistoryEntry(
      path.join(TEST_DIR, '.td-history.jsonl'),
      createGenerationHistoryEntry({
        metadata: sqlMetadata,
        status: 'success',
        durationMs: 140,
        recordsPerSecond: 14.29,
        outputPath: 'artifacts/exportable.sql',
      }),
    );

    await createCsvArtifact(csvPath, metadata);
    await createSqlArtifact(sqlPath, sqlMetadata);

    const csvBundle = await createPlatformReadyExport({
      ...createExportOptions(csvPath),
      exportedAt: '2026-04-06T12:00:00.000Z',
    });
    const sqlBundle = await createPlatformReadyExport({
      ...createExportOptions(sqlPath),
      exportedAt: '2026-04-06T12:00:00.000Z',
    });

    expect(csvBundle.artifact.type).toBe('generated-csv');
    expect(typeof csvBundle.artifact.payload).toBe('string');
    expect(sqlBundle.artifact.type).toBe('generated-sql');
    expect(typeof sqlBundle.artifact.payload).toBe('string');
  });

  test('creates a platform-ready bundle for saved-context JSON artifacts', async () => {
    const { metadata, lineageInputs } = createTestMetadata({ format: 'csv' });
    const artifactPath = path.join(TEST_DIR, 'contexts', 'exportable.json');

    await saveAsContext(
      [
        { id: 1, email: 'qa.one@example.com' },
        { id: 2, email: 'qa.two@example.com' },
      ],
      'exportable',
      ['staging'],
      {
        directory: path.join(TEST_DIR, 'contexts'),
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
      historyPath: path.join(TEST_DIR, '.td-history.jsonl'),
      storePath: path.join(TEST_DIR, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    const bundle = await createPlatformReadyExport(createExportOptions(artifactPath));

    expect(bundle.artifact.type).toBe('saved-context-json');
    expect(bundle.metadata.format).toBe('csv');
    expect(bundle.metadata.platformReserved?.contextReferences).toEqual([
      contextReferences[0],
      contextReferences[1],
    ]);
  });

  test('fails clearly when no matching history entry exists', async () => {
    const { metadata } = createTestMetadata();
    const artifactPath = path.join(TEST_DIR, 'generated.json');

    await createJsonArtifact(artifactPath, metadata);

    try {
      await createPlatformReadyExport(createExportOptions(artifactPath));
      throw new Error('Expected platform-ready export to fail when history is missing');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'PlatformReadyExportError',
        code: 'missing-history',
      });
    }
  });

  test('fails clearly when the pattern-version snapshot is missing', async () => {
    const { metadata } = createTestMetadata();
    const artifactPath = path.join(TEST_DIR, 'generated.json');

    await createJsonArtifact(artifactPath, metadata);
    await appendGenerationHistoryEntry(
      path.join(TEST_DIR, '.td-history.jsonl'),
      createGenerationHistoryEntry({
        metadata,
        status: 'success',
        durationMs: 120,
        recordsPerSecond: 16.67,
        outputPath: 'artifacts/exportable.json',
      }),
    );

    try {
      await createPlatformReadyExport(createExportOptions(artifactPath));
      throw new Error('Expected platform-ready export to fail when the snapshot is missing');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'PlatformReadyExportError',
        code: 'missing-pattern-snapshot',
      });
    }
  });

  test('fails clearly for malformed metadata comments and produces deterministic output', async () => {
    const { metadata, lineageInputs } = createTestMetadata({ format: 'csv' });
    const malformedCsvPath = path.join(TEST_DIR, 'malformed.csv');
    const validCsvPath = path.join(TEST_DIR, 'valid.csv');

    await Bun.write(malformedCsvPath, '# not-valid-metadata\nid,email\n1,qa.one@example.com\n');
    await createCsvArtifact(validCsvPath, metadata);
    await writeAuditTrail({
      historyPath: path.join(TEST_DIR, '.td-history.jsonl'),
      storePath: path.join(TEST_DIR, '.td-pattern-versions'),
      metadata,
      lineageInputs,
    });

    try {
      await createPlatformReadyExport(createExportOptions(malformedCsvPath));
      throw new Error('Expected malformed metadata export to fail');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(PlatformReadyExportError);
    }

    const firstBundle = await createPlatformReadyExport(createExportOptions(validCsvPath));
    const secondBundle = await createPlatformReadyExport(createExportOptions(validCsvPath));

    expect(JSON.stringify(firstBundle)).toBe(JSON.stringify(secondBundle));
  });
});