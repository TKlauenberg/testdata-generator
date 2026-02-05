import { describe, it, expect } from 'bun:test';
import { createRNG } from './rng';
import { generateRecord } from './generator';
import type { ValidatedSchema, ValidatedField } from '../analyzer/types';
import type { FieldNode, GeneratorParameter, SchemaNode } from '../parser/ast';
import type { SourceLocation } from '../common/diagnostic';

/**
 * Helper to create mock ValidatedSchema for testing
 */
function createMockSchema(
  fields: Array<{
    name: string;
    type: string;
    params?: Array<{ name: string; value: unknown }>;
  }>
): ValidatedSchema {
  const mockLocation: SourceLocation = {
    file: 'test.td',
    line: 1,
    column: 1,
    length: 10,
  };

  const fieldNodes: FieldNode[] = fields.map(
    (f): FieldNode => ({
      kind: 'field',
      name: f.name,
      type: f.type,
      generator: {
        name: f.type,
        parameters: (f.params || []) as GeneratorParameter[],
      },
      location: mockLocation,
    })
  );

  const schemaNode: SchemaNode = {
    kind: 'schema',
    name: 'TestSchema',
    fields: fieldNodes,
    location: mockLocation,
  };

  const validatedFields: ValidatedField[] = fields.map(
    (f, idx): ValidatedField => ({
      node: fieldNodes[idx],
      resolvedType: f.type,
      resolvedGenerator: f.type,
      templateReferences: [],
    })
  );

  return {
    node: schemaNode,
    fields: validatedFields,
    dependencies: new Set(),
    sortOrder: 0,
  };
}

describe('generateRecord', () => {
  it('should generate record with all fields from schema', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'id', type: 'int', params: [{ name: 'min', value: 1 }, { name: 'max', value: 100 }] },
      { name: 'name', type: 'string', params: [{ name: 'length', value: 10 }] },
      { name: 'active', type: 'boolean', params: [] },
    ]);

    const rng = createRNG(12345);
    const record = generateRecord(schema, rng);

    // Verify structure
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('name');
    expect(record).toHaveProperty('active');

    // Verify types
    expect(typeof record.id).toBe('number');
    expect(typeof record.name).toBe('string');
    expect(typeof record.active).toBe('boolean');
  });

  it('should produce identical records with same seed', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'value', type: 'int', params: [{ name: 'min', value: 0 }, { name: 'max', value: 10 }] },
    ]);

    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const record1 = generateRecord(schema, rng1);
    const record2 = generateRecord(schema, rng2);

    expect(record1).toEqual(record2);
  });

  it('should produce different records with different seeds', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'value', type: 'int', params: [{ name: 'min', value: 0 }, { name: 'max', value: 100 }] },
    ]);

    const rng1 = createRNG(11111);
    const rng2 = createRNG(22222);

    const record1 = generateRecord(schema, rng1);
    const record2 = generateRecord(schema, rng2);

    expect(record1).not.toEqual(record2);
  });

  it('should respect generator parameters from schema', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'age', type: 'int', params: [{ name: 'min', value: 18 }, { name: 'max', value: 65 }] },
    ]);

    const rng = createRNG(777);
    const record = generateRecord(schema, rng);

    expect(record.age).toBeGreaterThanOrEqual(18);
    expect(record.age).toBeLessThanOrEqual(65);
  });

  it('should respect float parameters', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'score', type: 'float', params: [{ name: 'min', value: 0.0 }, { name: 'max', value: 1.0 }] },
    ]);

    const rng = createRNG(555);
    const record = generateRecord(schema, rng);

    expect(record.score).toBeGreaterThanOrEqual(0.0);
    expect(record.score).toBeLessThanOrEqual(1.0);
  });

  it('should respect string length parameter', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'code', type: 'string', params: [{ name: 'length', value: 15 }] },
    ]);

    const rng = createRNG(333);
    const record = generateRecord(schema, rng);

    expect(typeof record.code).toBe('string');
    expect((record.code as string).length).toBe(15);
  });

  it('should throw clear error for unknown generator type', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'weird', type: 'unknown-type', params: [] },
    ]);

    const rng = createRNG(123);

    expect(() => generateRecord(schema, rng)).toThrow(/unknown generator/i);
    expect(() => generateRecord(schema, rng)).toThrow(/weird/); // Field name in error
  });

  it('should handle empty schema', () => {
    const schema: ValidatedSchema = createMockSchema([]);
    const rng = createRNG(123);

    const record = generateRecord(schema, rng);

    expect(record).toEqual({});
  });

  it('should handle multi-field schema with different types', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'id', type: 'int', params: [{ name: 'min', value: 1 }, { name: 'max', value: 1000 }] },
      { name: 'price', type: 'float', params: [{ name: 'min', value: 0.0 }, { name: 'max', value: 100.0 }] },
      { name: 'name', type: 'string', params: [{ name: 'length', value: 10 }] },
      { name: 'active', type: 'boolean' },
    ]);

    const rng = createRNG(42);
    const record = generateRecord(schema, rng);

    expect(Object.keys(record)).toHaveLength(4);
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('price');
    expect(record).toHaveProperty('name');
    expect(record).toHaveProperty('active');

    expect(typeof record.id).toBe('number');
    expect(typeof record.price).toBe('number');
    expect(typeof record.name).toBe('string');
    expect(typeof record.active).toBe('boolean');
  });

  it('should handle generator type aliases (integer, double, text, bool)', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'a', type: 'integer', params: [{ name: 'min', value: 0 }, { name: 'max', value: 10 }] },
      { name: 'b', type: 'double', params: [{ name: 'min', value: 0.0 }, { name: 'max', value: 1.0 }] },
      { name: 'c', type: 'text', params: [{ name: 'length', value: 8 }] },
      { name: 'd', type: 'bool' },
    ]);

    const rng = createRNG(999);
    const record = generateRecord(schema, rng);

    expect(typeof record.a).toBe('number');
    expect(typeof record.b).toBe('number');
    expect(typeof record.c).toBe('string');
    expect(typeof record.d).toBe('boolean');
  });

  it('should use default parameters when not specified', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'defaultInt', type: 'int' },
      { name: 'defaultFloat', type: 'float' },
      { name: 'defaultString', type: 'string' },
    ]);

    const rng = createRNG(7777);
    const record = generateRecord(schema, rng);

    // Should not throw, should use defaults
    expect(typeof record.defaultInt).toBe('number');
    expect(typeof record.defaultFloat).toBe('number');
    expect(typeof record.defaultString).toBe('string');
  });
});
