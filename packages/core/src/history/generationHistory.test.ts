import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createGenerationMetadata } from '../common';
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  GenerationHistoryParseError,
  queryGenerationHistory,
  readGenerationHistory,
} from './generationHistory';

const tempDirectories = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

async function createTempHistoryPath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-history-'));
  tempDirectories.add(directory);
  return path.join(directory, '.td-history.jsonl');
}

function createMetadata(
  overrides: Partial<ReturnType<typeof createGenerationMetadata>> = {},
): ReturnType<typeof createGenerationMetadata> {
  return {
    ...createGenerationMetadata({
      timestamp: '2026-04-05T12:00:00.000Z',
      sourcePattern: 'fixtures/users.td',
      count: 5,
      format: 'json',
      seed: 123,
      version: '0.1.0',
      lineageInputs: [
        {
          type: 'root-pattern',
          identifier: 'fixtures/users.td',
          content: 'schema User { id: number }',
        },
      ],
    }),
    ...overrides,
  };
}

describe('generation history', () => {
  test('creates success entries around canonical generation metadata', () => {
    const entry = createGenerationHistoryEntry({
      metadata: createMetadata(),
      status: 'success',
      durationMs: 125.5,
      recordsPerSecond: 39.84,
      outputPath: 'reports/users.json',
      savedContextName: 'latest-users',
    });

    expect(entry.metadata.sourcePattern).toBe('fixtures/users.td');
    expect(entry.metadata.patternHash).toBeDefined();
    expect(entry.status).toBe('success');
    expect(entry.errorMessage).toBeUndefined();
    expect(entry.outputPath).toBe('reports/users.json');
    expect(entry.savedContextName).toBe('latest-users');
  });

  test('requires failure entries to include an error message without fabricated lineage data', () => {
    const metadata = createMetadata({
      patternHash: undefined,
      lineage: undefined,
      sourcePattern: 'fixtures/broken.td',
    });

    const entry = createGenerationHistoryEntry({
      metadata,
      status: 'failure',
      errorMessage: 'Validation failed: undefined type UserId',
      durationMs: 4,
      recordsPerSecond: 0,
    });

    expect(entry.metadata.patternHash).toBeUndefined();
    expect(entry.metadata.lineage).toBeUndefined();
    expect(entry.errorMessage).toBe('Validation failed: undefined type UserId');
  });

  test('appends exactly one json line per entry and preserves existing history', async () => {
    const historyPath = await createTempHistoryPath();

    await appendGenerationHistoryEntry(historyPath, createGenerationHistoryEntry({
      metadata: createMetadata({ timestamp: '2026-04-05T12:00:00.000Z' }),
      status: 'success',
      durationMs: 10,
      recordsPerSecond: 100,
    }));
    await appendGenerationHistoryEntry(historyPath, createGenerationHistoryEntry({
      metadata: createMetadata({ timestamp: '2026-04-05T12:00:01.000Z', count: 7 }),
      status: 'success',
      durationMs: 20,
      recordsPerSecond: 350,
    }));

    const rawContent = await fs.readFile(historyPath, 'utf-8');
    const nonEmptyLines = rawContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const entries = await readGenerationHistory(historyPath);

    expect(nonEmptyLines).toHaveLength(2);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.metadata.count).toBe(5);
    expect(entries[1]?.metadata.count).toBe(7);
  });

  test('tolerates a blank trailing line when reading history', async () => {
    const historyPath = await createTempHistoryPath();
    const entry = createGenerationHistoryEntry({
      metadata: createMetadata(),
      status: 'success',
      durationMs: 12,
      recordsPerSecond: 416.67,
    });

    await fs.writeFile(historyPath, `${JSON.stringify(entry)}\n\n`, 'utf-8');

    const entries = await readGenerationHistory(historyPath);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  test('returns requested trailing entries in append order', async () => {
    const historyPath = await createTempHistoryPath();

    for (const [index, count] of [2, 4, 6].entries()) {
      await appendGenerationHistoryEntry(historyPath, createGenerationHistoryEntry({
        metadata: createMetadata({
          timestamp: `2026-04-05T12:00:0${index}.000Z`,
          count,
        }),
        status: 'success',
        durationMs: 10 + index,
        recordsPerSecond: count * 10,
      }));
    }

    const entries = await queryGenerationHistory(historyPath, { last: 2 });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.metadata.count)).toEqual([4, 6]);
  });

  test('returns an empty result when the history file does not exist yet', async () => {
    const historyPath = await createTempHistoryPath();
    await fs.rm(path.dirname(historyPath), { recursive: true, force: true });
    tempDirectories.delete(path.dirname(historyPath));

    const entries = await readGenerationHistory(historyPath);

    expect(entries).toEqual([]);
  });

  test('throws a descriptive parse error for malformed lines', async () => {
    const historyPath = await createTempHistoryPath();
    await fs.writeFile(historyPath, '{"metadata":', 'utf-8');

    try {
      await readGenerationHistory(historyPath);
      throw new Error('Expected malformed history to throw a GenerationHistoryParseError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GenerationHistoryParseError);
      expect(error).toMatchObject({ lineNumber: 1 });
    }
  });
});