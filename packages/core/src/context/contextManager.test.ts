import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, readFile, rm } from 'node:fs/promises';
import * as path from 'node:path';
import type { GenerationMetadataLineageEntry } from '../common';
import { isContextData, loadContext, saveAsContext } from './contextManager';

const platformReserved = {
  contextReferences: [
    {
      raw: '@context.users@staging.random.email',
      collection: 'users',
      tags: ['staging'],
      selector: { kind: 'random' as const },
      fieldPath: ['email'],
    },
  ],
};

const TEST_DIR = path.join(import.meta.dir, '../../__test-output__/context-manager');

async function writeFixture(filename: string, value: string): Promise<string> {
  const filePath = path.join(TEST_DIR, filename);
  await Bun.write(filePath, value);
  return filePath;
}

describe('loadContext', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('loads JSON context and normalizes tags once at the boundary', async () => {
    const filePath = await writeFixture(
      'users.json',
      JSON.stringify([{ id: 'u-1', email: 'qa.one@example.com' }]),
    );

    const context = await loadContext(filePath, [' Staging ', 'REGION-US', 'staging']);

    expect(context.records).toHaveLength(1);
    expect(context.metadata.format).toBe('json');
    expect(context.metadata.tags).toEqual(['staging', 'region-us']);
  });

  test('preserves saved-context metadata and merges stored tags with load-time tags', async () => {
    const records = [
      { id: 'u-1', email: 'qa.one@example.com' },
      { id: 'u-2', email: 'qa.two@example.com' },
    ];

    await saveAsContext(records, 'baseline-users', [' Regression ', 'staging', 'REGRESSION'], {
      directory: TEST_DIR,
      sourcePattern: 'schemas/users.td',
    });

    const filePath = path.join(TEST_DIR, 'baseline-users.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const savedEnvelope = JSON.parse(fileContent) as {
      readonly metadata: {
        readonly timestamp: string;
        readonly sourcePattern?: string;
        readonly version: string;
        readonly tags: readonly string[];
        readonly count: number;
      };
      readonly data: readonly unknown[];
    };

    expect(savedEnvelope.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(savedEnvelope.metadata.sourcePattern).toBe('schemas/users.td');
    expect(savedEnvelope.metadata.version).toBe('0.1.0');
    expect(savedEnvelope.metadata.tags).toEqual(['regression', 'staging']);
    expect(savedEnvelope.metadata.count).toBe(2);
    expect(savedEnvelope.data).toEqual(records);

    const context = await loadContext(filePath, ['smoke', 'STAGING']);

    expect(context.records).toEqual(records);
    expect(context.metadata.format).toBe('json');
    expect(context.metadata.recordCount).toBe(2);
    expect(context.metadata.tags).toEqual(['regression', 'staging', 'smoke']);
    expect(context.metadata.sourcePattern).toBe('schemas/users.td');
    expect(context.metadata.version).toBe('0.1.0');
    expect(context.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('persists extended generation metadata when saving contexts', async () => {
    const lineage: readonly GenerationMetadataLineageEntry[] = [
      {
        type: 'root-pattern',
        identifier: 'schemas/users.td',
        hash: 'abc123',
      },
    ];

    await saveAsContext([{ id: 'u-1' }], 'metadata-rich', ['smoke'], {
      directory: TEST_DIR,
      timestamp: '2026-04-05T10:15:00.000Z',
      sourcePattern: 'schemas/users.td',
      format: 'csv',
      version: '0.1.0',
      seed: 42,
      patternHash: 'pattern-123',
      lineage,
      platformReserved,
    });

    const context = await loadContext(path.join(TEST_DIR, 'metadata-rich.json'));

    expect(context.metadata.generationFormat).toBe('csv');
    expect(context.metadata.timestamp).toBe('2026-04-05T10:15:00.000Z');
    expect(context.metadata.sourcePattern).toBe('schemas/users.td');
    expect(context.metadata.version).toBe('0.1.0');
    expect(context.metadata.seed).toBe(42);
    expect(context.metadata.patternHash).toBe('pattern-123');
    expect(context.metadata.lineage).toEqual(lineage);
    expect(context.metadata.platformReserved).toEqual(platformReserved);
  });

  test('loads CSV context through the orchestrating entry point', async () => {
    const filePath = await writeFixture(
      'users.csv',
      ['id,email', 'u-1,qa.one@example.com', 'u-2,qa.two@example.com'].join('\n'),
    );

    const context = await loadContext(filePath, ['Production']);

    expect(context.records).toHaveLength(2);
    expect(context.metadata.format).toBe('csv');
    expect(context.metadata.tags).toEqual(['production']);
  });

  test('rejects unsupported context file types with an actionable error', async () => {
    const filePath = await writeFixture('users.txt', 'nope');

    expect.assertions(1);
    try {
      await loadContext(filePath, ['staging']);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/unsupported context file type/i);
    }
  });

  test('rejects context-like objects whose metadata tags are not strings', () => {
    const candidate = {
      records: [{ id: 'u-1' }],
      metadata: {
        source: 'users.json',
        format: 'json',
        loadedAt: '2026-03-08T00:00:00.000Z',
        recordCount: 1,
        tags: [123],
      },
    };

    expect(isContextData(candidate)).toBe(false);
  });

  test('writes empty saved contexts as valid envelopes', async () => {
    await saveAsContext([], 'empty-context', [], {
      directory: TEST_DIR,
      sourcePattern: 'schemas/empty.td',
    });

    const context = await loadContext(path.join(TEST_DIR, 'empty-context.json'));

    expect(context.records).toEqual([]);
    expect(context.metadata.recordCount).toBe(0);
    expect(context.metadata.sourcePattern).toBe('schemas/empty.td');
  });

  test('rejects context names that could escape the destination directory', () => {
    expect(
      saveAsContext([{ id: 'u-1' }], '../outside', [], { directory: TEST_DIR }),
    ).rejects.toThrow(/invalid context name/i);
  });

  test('rejects platform-invalid reserved context names', () => {
    expect(
      saveAsContext([{ id: 'u-1' }], 'CON', [], { directory: TEST_DIR }),
    ).rejects.toThrow(/invalid context name/i);
  });

  test('rejects context names with trailing dots', () => {
    expect(
      saveAsContext([{ id: 'u-1' }], 'baseline-users.', [], { directory: TEST_DIR }),
    ).rejects.toThrow(/invalid context name/i);
  });
});