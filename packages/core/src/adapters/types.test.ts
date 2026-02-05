import { describe, test, expect } from 'bun:test';
import type { IAdapter, AdapterMetadata, JsonAdapterOptions } from './types';

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
        version: '1.0.0',
      };

      expect(metadata.timestamp).toBe('2026-02-05T14:32:01.234Z');
      expect(metadata.version).toBe('1.0.0');
    });

    test('should allow optional fields', () => {
      const metadata: AdapterMetadata = {
        timestamp: '2026-02-05T14:32:01.234Z',
        sourcePattern: 'User.td',
        count: 1000,
        seed: 12345,
        version: '1.0.0',
      };

      expect(metadata.sourcePattern).toBe('User.td');
      expect(metadata.count).toBe(1000);
      expect(metadata.seed).toBe(12345);
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
  });
});
