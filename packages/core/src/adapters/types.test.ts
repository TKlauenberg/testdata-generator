import { describe, test, expect } from 'bun:test';
import type { AdapterMetadata, CsvAdapterOptions, IAdapter, JsonAdapterOptions, SqlAdapterOptions } from './types';

describe('Adapter Types', () => {
  describe('IAdapter interface', () => {
    test('should accept AsyncIterable<Record> in write method', () => {
      // Type-only test - verifies interface structure
      const mockAdapter: IAdapter = {
        async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
          // Mock implementation
          for await (const _ of records) {
            // Consume records
          }
        },
      };

      expect(mockAdapter).toBeDefined();
      expect(typeof mockAdapter.write).toBe('function');
    });
  });

  describe('AdapterMetadata type', () => {
    test('should allow all required fields', () => {
      const metadata: AdapterMetadata = {
        timestamp: '2026-02-05T14:32:01.234Z',
        format: 'json',
        version: '1.0.0',
      };

      expect(metadata.timestamp).toBe('2026-02-05T14:32:01.234Z');
      expect(metadata.format).toBe('json');
      expect(metadata.version).toBe('1.0.0');
    });

    test('should allow optional fields', () => {
      const metadata: AdapterMetadata = {
        timestamp: '2026-02-05T14:32:01.234Z',
        sourcePattern: 'User.td',
        count: 1000,
        format: 'csv',
        seed: 12345,
        version: '1.0.0',
        patternHash: 'abc123',
      };

      expect(metadata.sourcePattern).toBe('User.td');
      expect(metadata.count).toBe(1000);
      expect(metadata.format).toBe('csv');
      expect(metadata.seed).toBe(12345);
      expect(metadata.patternHash).toBe('abc123');
    });
  });

  describe('JsonAdapterOptions type', () => {
    test('should require outputPath', () => {
      const options: JsonAdapterOptions = {
        outputPath: '/tmp/output.json',
      };

      expect(options.outputPath).toBe('/tmp/output.json');
    });

    test('should allow format option', () => {
      const arrayOptions: JsonAdapterOptions = {
        outputPath: '/tmp/output.json',
        format: 'array',
      };

      const jsonlOptions: JsonAdapterOptions = {
        outputPath: '/tmp/output.jsonl',
        format: 'jsonl',
      };

      expect(arrayOptions.format).toBe('array');
      expect(jsonlOptions.format).toBe('jsonl');
    });

    test('should allow metadata option', () => {
      const options: JsonAdapterOptions = {
        outputPath: '/tmp/output.json',
        metadata: {
          sourcePattern: 'User.td',
          count: 100,
          seed: 42,
        },
      };

      expect(options.metadata?.sourcePattern).toBe('User.td');
      expect(options.metadata?.count).toBe(100);
      expect(options.metadata?.seed).toBe(42);
    });

    test('should allow metadata option on CSV and SQL adapters', () => {
      const csvOptions: CsvAdapterOptions = {
        outputPath: '/tmp/output.csv',
        metadata: {
          sourcePattern: 'User.td',
          count: 100,
          format: 'csv',
          patternHash: 'hash-1',
        },
      };

      const sqlOptions: SqlAdapterOptions = {
        outputPath: '/tmp/output.sql',
        tableName: 'users',
        metadata: {
          sourcePattern: 'User.td',
          count: 100,
          format: 'sql',
          patternHash: 'hash-2',
        },
      };

      expect(csvOptions.metadata?.format).toBe('csv');
      expect(sqlOptions.metadata?.format).toBe('sql');
    });
  });
});
