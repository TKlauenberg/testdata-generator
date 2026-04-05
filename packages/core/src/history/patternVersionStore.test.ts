import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createGenerationMetadata } from '../common';
import {
  createPatternVersionSnapshot,
  PatternVersionStoreParseError,
  persistPatternVersionSnapshot,
  readPatternVersionSnapshot,
} from './patternVersionStore';

const tempDirectories = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

async function createStoreDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-pattern-version-store-'));
  tempDirectories.add(directory);
  return directory;
}

function createSnapshot() {
  const lineageInputs = [
    {
      type: 'root-pattern' as const,
      identifier: 'schemas/users.td',
      content: '@import "./shared.td"\nschema User { profile: SharedProfile }',
    },
    {
      type: 'imported-pattern' as const,
      identifier: 'schemas/shared.td',
      content: 'schema SharedProfile { id: uuid }',
    },
    {
      type: 'workspace-generator' as const,
      identifier: 'sharedEmail',
      content: '{"type":"template","template":"{{localPart}}@example.com"}',
    },
  ];

  const metadata = createGenerationMetadata({
    timestamp: '2026-04-05T12:00:00.000Z',
    sourcePattern: 'schemas/users.td',
    count: 1,
    format: 'json',
    version: '0.1.0',
    lineageInputs,
  });

  return {
    metadata,
    lineageInputs,
    snapshot: createPatternVersionSnapshot({ metadata, lineageInputs }),
  };
}

describe('pattern version store', () => {
  test('creates a canonical snapshot from generation metadata lineage', () => {
    const { metadata, snapshot } = createSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot?.patternHash).toBe(metadata.patternHash);
    expect(snapshot?.lineage.map((entry) => `${entry.type}:${entry.identifier}`)).toEqual(
      metadata.lineage?.map((entry) => `${entry.type}:${entry.identifier}`),
    );
    expect(snapshot?.lineage.find((entry) => entry.type === 'imported-pattern')?.content).toBe(
      'schema SharedProfile { id: uuid }',
    );
  });

  test('deduplicates persisted snapshots by pattern hash', async () => {
    const storeDirectory = await createStoreDirectory();
    const { snapshot } = createSnapshot();

    if (snapshot === undefined) {
      throw new Error('Expected snapshot to exist for deduplication test');
    }

    const snapshotPath = await persistPatternVersionSnapshot(storeDirectory, snapshot);
    const firstPayload = await fs.readFile(snapshotPath, 'utf-8');

    await persistPatternVersionSnapshot(storeDirectory, snapshot);

    expect(await fs.readdir(storeDirectory)).toEqual([`${snapshot.patternHash}.json`]);
    expect(await fs.readFile(snapshotPath, 'utf-8')).toBe(firstPayload);
  });

  test('loads stored snapshots by pattern hash and returns null for missing hashes', async () => {
    const storeDirectory = await createStoreDirectory();
    const { snapshot } = createSnapshot();

    if (snapshot === undefined) {
      throw new Error('Expected snapshot to exist for read test');
    }

    await persistPatternVersionSnapshot(storeDirectory, snapshot);

    await expect(readPatternVersionSnapshot(storeDirectory, snapshot.patternHash)).resolves.toEqual(snapshot);
    await expect(readPatternVersionSnapshot(storeDirectory, 'missing-pattern-hash')).resolves.toBeNull();
  });

  test('reports malformed snapshot files with a controlled parse error', async () => {
    const storeDirectory = await createStoreDirectory();
    const patternHash = 'deadbeef';
    await fs.writeFile(path.join(storeDirectory, `${patternHash}.json`), '{"patternHash":', 'utf-8');

    try {
      await readPatternVersionSnapshot(storeDirectory, patternHash);
      throw new Error('Expected malformed snapshot to throw a PatternVersionStoreParseError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(PatternVersionStoreParseError);
    }
  });
});