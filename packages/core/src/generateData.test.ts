/**
 * Tests for generateData() public API
 *
 * Tests the end-to-end data generation pipeline from DSL source to records.
 * Covers validation, generation, determinism, and error handling.
 */

import { describe, test, expect } from 'bun:test';
import { generateData } from './generateData';

describe('generateData()', () => {
  describe('Basic Generation', () => {
    test('generates records from valid schema', async () => {
      const source = `
        schema User {
          id: number
          name: string
        }
      `;

      const records = [];
      for await (const record of generateData(source, { count: 5 })) {
        records.push(record);
      }

      expect(records.length).toBe(5);
      expect(records[0]).toHaveProperty('id');
      expect(records[0]).toHaveProperty('name');
      expect(typeof records[0].id).toBe('number');
      expect(typeof records[0].name).toBe('string');
    });

    test('generates correct number of records', async () => {
      const source = `
        schema Product {
          id: number
        }
      `;

      let count = 0;
      for await (const _record of generateData(source, { count: 10 })) {
        count++;
      }

      expect(count).toBe(10);
    });

    test('generated records match schema structure', async () => {
      const source = `
        schema Item {
          id: number
          name: string
          active: boolean
          price: number
        }
      `;

      const records = [];
      for await (const record of generateData(source, { count: 3 })) {
        records.push(record);
      }

      expect(records.length).toBe(3);

      for (const record of records) {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('active');
        expect(record).toHaveProperty('price');

        expect(typeof record.id).toBe('number');
        expect(typeof record.name).toBe('string');
        expect(typeof record.active).toBe('boolean');
        expect(typeof record.price).toBe('number');
      }
    });
  });

  describe('Determinism (Seed Parameter)', () => {
    test('same seed produces identical data across runs', async () => {
      const source = `
        schema User {
          id: number
          name: string
        }
      `;

      const seed = 42;

      // First run
      const records1 = [];
      for await (const record of generateData(source, { count: 5, seed })) {
        records1.push(record);
      }

      // Second run with same seed
      const records2 = [];
      for await (const record of generateData(source, { count: 5, seed })) {
        records2.push(record);
      }

      expect(records1).toEqual(records2);
    });

    test('different seeds produce different data', async () => {
      const source = `
        schema User {
          id: number
        }
      `;

      const records1 = [];
      for await (const record of generateData(source, { count: 5, seed: 42 })) {
        records1.push(record);
      }

      const records2 = [];
      for await (const record of generateData(source, { count: 5, seed: 99 })) {
        records2.push(record);
      }

      // Should be different (highly likely with large range)
      expect(records1).not.toEqual(records2);
    });

    // Note: Testing non-deterministic behavior (no seed) is inherently flaky
    // as it depends on timing (Date.now()). The RNG module already tests
    // timestamp-based seeding, so we skip this test here to avoid flakiness.
  });

  describe('Multi-Schema Support', () => {
    test('generates records from multiple schemas', async () => {
      const source = `
        schema User {
          id: number
        }
        schema Product {
          sku: string
        }
      `;

      const records = [];
      for await (const record of generateData(source, { count: 2 })) {
        records.push(record);
      }

      // Should generate 2 records per schema = 4 total
      expect(records.length).toBe(4);

      // First 2 should be User records
      expect(records[0]).toHaveProperty('id');
      expect(records[1]).toHaveProperty('id');

      // Next 2 should be Product records
      expect(records[2]).toHaveProperty('sku');
      expect(records[3]).toHaveProperty('sku');
    });
  });

  describe('Error Handling', () => {
    test('throws ValidationError for invalid schema', async () => {
      const invalidSource = `schema User { id: whoops }`;

      expect(async () => {
        for await (const _record of generateData(invalidSource, { count: 1 })) {
          // Should not reach here
        }
      }).toThrow();
    });

    test('throws ValidationError for syntax errors', async () => {
      const invalidSource = `schema User { id int }`;  // Missing colon

      expect(async () => {
        for await (const _record of generateData(invalidSource, { count: 1 })) {
          // Should not reach here
        }
      }).toThrow();
    });

    test('throws ValidationError for semantic errors', async () => {
      const invalidSource = `
        schema User {
          id: unknownType
        }
      `;

      expect(async () => {
        for await (const _record of generateData(invalidSource, { count: 1 })) {
          // Should not reach here
        }
      }).toThrow();
    });

    test('ValidationError includes diagnostic information', async () => {
      const invalidSource = `schema User { id: whoops }`;

      try {
        for await (const _record of generateData(invalidSource, { count: 1 })) {
          // Should not reach here
        }
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('validation');
        // ValidationError should have diagnostics property
        expect(error).toHaveProperty('diagnostics');
      }
    });

    test('returns validation errors immediately without generation', async () => {
      const invalidSource = `schema User { id: whoops }`;  // Invalid type

      let generationStarted = false;

      try {
        for await (const _record of generateData(invalidSource, { count: 10 })) {
          generationStarted = true;
        }
        expect.unreachable('Should have thrown');
      } catch (error) {
        // Validation should fail BEFORE any generation
        expect(generationStarted).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles empty schema source', async () => {
      const emptySource = '';

      // Empty source is valid (no schemas)
      let count = 0;
      for await (const _record of generateData(emptySource, { count: 1 })) {
        count++;
      }
      
      // Should generate 0 records since there are no schemas
      expect(count).toBe(0);
    });

    test('handles count of 0', async () => {
      const source = `
        schema User {
          id: number
        }
      `;

      let count = 0;
      for await (const _record of generateData(source, { count: 0 })) {
        count++;
      }

      expect(count).toBe(0);
    });

    test('@slow handles large record count without memory issues', async () => {
      const source = `
        schema User {
          id: number
        }
      `;

      let count = 0;
      // Generate 10k records - should not cause memory issues due to streaming
      for await (const _record of generateData(source, { count: 10000 })) {
        count++;
        // Don't accumulate in array - defeats streaming purpose
      }

      expect(count).toBe(10000);
    });
  });
});
