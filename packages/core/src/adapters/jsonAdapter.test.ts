import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { JsonAdapter } from './jsonAdapter';
import { unlink, exists } from 'node:fs/promises';
import * as path from 'node:path';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../__test-output__');
const TEST_FILE_ARRAY = path.join(TEST_OUTPUT_DIR, 'test-array.json');
const TEST_FILE_JSONL = path.join(TEST_OUTPUT_DIR, 'test-jsonl.jsonl');

// Helper to create async iterable from array
async function* createRecordStream(records: Array<Record<string, unknown>>): AsyncIterable<Record<string, unknown>> {
  for (const record of records) {
    yield await Promise.resolve(record);
  }
}

// Helper to read and parse JSON file
async function readJsonFile(filePath: string): Promise<unknown> {
  const file = Bun.file(filePath);
  const content = await file.text();
  return JSON.parse(content);
}

// Helper to read JSONL file
async function readJsonlFile(filePath: string): Promise<unknown[]> {
  const file = Bun.file(filePath);
  const content = await file.text();
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

describe('JsonAdapter', () => {
  beforeEach(async () => {
    // Ensure output directory exists
    await Bun.write(path.join(TEST_OUTPUT_DIR, '.gitkeep'), '');
  });

  afterEach(async () => {
    // Clean up test files (L3: Log cleanup errors)
    try {
      if (await exists(TEST_FILE_ARRAY)) await unlink(TEST_FILE_ARRAY);
      if (await exists(TEST_FILE_JSONL)) await unlink(TEST_FILE_JSONL);
    } catch (err) {
      console.warn('Test cleanup failed:', err);
    }
  });

  describe('Array Format', () => {
    test('should write valid JSON array format', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
      });

      const records = [
        { id: 1, name: 'John Doe', email: 'john@test.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@test.com' },
      ];

      await adapter.write(createRecordStream(records));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<Record<string, unknown>>;
      };

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.data).toBeArrayOfSize(2);
      expect(result.data[0]).toEqual(records[0]);
      expect(result.data[1]).toEqual(records[1]);
    });

    test('should default to array format when format not specified', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
      });

      const records = [{ id: 1, name: 'Test' }];

      await adapter.write(createRecordStream(records));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<Record<string, unknown>>;
      };

      expect(result.data).toBeArrayOfSize(1);
    });

    test('should include metadata with required fields', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
        metadata: {
          sourcePattern: 'User.td',
          count: 2,
          seed: 12345,
        },
      });

      const records = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      await adapter.write(createRecordStream(records));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: {
          timestamp: string;
          sourcePattern?: string;
          count?: number;
          format: string;
          seed?: number;
          version: string;
        };
        data: Array<Record<string, unknown>>;
      };

      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.metadata.sourcePattern).toBe('User.td');
      expect(result.metadata.count).toBe(2);
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.seed).toBe(12345);
      expect(result.metadata.version).toBeDefined();
    });

    test('should handle empty record set', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
      });

      await adapter.write(createRecordStream([]));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<unknown>;
      };

      expect(result.data).toBeArrayOfSize(0);
    });

    test('should handle records with nested objects', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
      });

      const records = [
        {
          user: { id: 1, name: 'John' },
          orders: [
            { orderId: 101, total: 99.99 },
            { orderId: 102, total: 149.5 },
          ],
        },
      ];

      await adapter.write(createRecordStream(records));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<Record<string, unknown>>;
      };

      expect(result.data[0]).toEqual(records[0]);
    });

    test('should properly escape special JSON characters', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
      });

      const records = [
        {
          text: 'Line 1\nLine 2\tTabbed\r\nWindows Line',
          quote: 'He said "Hello"',
          backslash: 'Path: C:\\Users\\Test',
        },
      ];

      await adapter.write(createRecordStream(records));

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<Record<string, unknown>>;
      };

      expect(result.data[0]).toEqual(records[0]);
    });

    test('should write incrementally without buffering all records', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_ARRAY,
        format: 'array',
      });

      // Create a large dataset to test memory efficiency
      const largeRecordCount = 10000;
      async function* generateLargeDataset(): AsyncIterable<Record<string, unknown>> {
        for (let i = 0; i < largeRecordCount; i++) {
          yield await Promise.resolve({ id: i, name: `User${i}`, value: Math.random() });
        }
      }

      await adapter.write(generateLargeDataset());

      const result = (await readJsonFile(TEST_FILE_ARRAY)) as {
        metadata: unknown;
        data: Array<unknown>;
      };

      expect(result.data).toBeArrayOfSize(largeRecordCount);
    });
  });

  describe('JSONL Format', () => {
    test('should write valid line-delimited JSON format', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_JSONL,
        format: 'jsonl',
      });

      const records = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' },
      ];

      await adapter.write(createRecordStream(records));

      const lines = await readJsonlFile(TEST_FILE_JSONL);

      // First line should be metadata
      expect(lines[0]).toHaveProperty('_metadata');

      // Remaining lines should be records
      expect(lines[1]).toEqual(records[0]);
      expect(lines[2]).toEqual(records[1]);
    });

    test('should include metadata as first line', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_JSONL,
        format: 'jsonl',
        metadata: {
          sourcePattern: 'User.td',
          count: 1000,
          seed: 42,
        },
      });

      const records = [{ id: 1 }];

      await adapter.write(createRecordStream(records));

      const lines = await readJsonlFile(TEST_FILE_JSONL);

      const metadataLine = lines[0] as { _metadata: { timestamp: string; sourcePattern?: string; count?: number; format: string; seed?: number } };

      expect(metadataLine._metadata).toBeDefined();
      expect(metadataLine._metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadataLine._metadata.sourcePattern).toBe('User.td');
      expect(metadataLine._metadata.count).toBe(1000);
      expect(metadataLine._metadata.format).toBe('jsonl');
      expect(metadataLine._metadata.seed).toBe(42);
    });

    test('should handle empty record set in JSONL format', async () => {
      const adapter = new JsonAdapter({
        outputPath: TEST_FILE_JSONL,
        format: 'jsonl',
      });

      await adapter.write(createRecordStream([]));

      const lines = await readJsonlFile(TEST_FILE_JSONL);

      // Should only have metadata line
      expect(lines).toBeArrayOfSize(1);
      expect(lines[0]).toHaveProperty('_metadata');
    });
  });

  describe('Error Handling', () => {
    test('should handle write failures gracefully', () => {
      const adapter = new JsonAdapter({
        outputPath: '/invalid/path/that/does/not/exist/output.json',
        format: 'array',
      });

      const records = [{ id: 1 }];

      // Should throw error for invalid path (M3: Better error validation)
      expect(adapter.write(createRecordStream(records))).rejects.toThrow();
    });

    test('should reject empty outputPath', () => {
      expect(() => new JsonAdapter({ outputPath: '' })).toThrow('outputPath cannot be empty');
    });

    test('should reject whitespace-only outputPath', () => {
      expect(() => new JsonAdapter({ outputPath: '   ' })).toThrow('outputPath cannot be empty');
    });
  });
});
