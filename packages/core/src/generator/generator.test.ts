import { describe, it, expect } from 'bun:test';
import { createRNG } from './rng';
import { generateRecord, generate, sortFieldsByDependency } from './generator';
import type { ValidatedSchema, ValidatedField, ValidatedProgram } from '../analyzer/types';
import type { FieldNode, GeneratorParameter, SchemaNode } from '../parser/ast';
import type { SourceLocation } from '../common/diagnostic';
import { SymbolTable } from '../analyzer/symbolTable';

/**
 * Helper to create mock ValidatedSchema for testing
 */
function createMockSchema(
  fields: Array<{
    name: string;
    type: string;
    params?: Array<{ name: string; value: unknown }>;
    isUnique?: boolean;
  }>,
  schemaName: string = 'TestSchema',
  compositeUniques: readonly (readonly string[])[] = [],
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
        parameters: (f.params ?? []) as GeneratorParameter[],
      },
      constraints: f.isUnique ? { unique: true } : undefined,
      location: mockLocation,
    })
  );

  const schemaNode: SchemaNode = {
    kind: 'schema',
    name: schemaName,
    fields: fieldNodes,
    compositeUniques,
    location: mockLocation,
  };

  const validatedFields: ValidatedField[] = fields.map(
    (f, idx): ValidatedField => ({
      node: fieldNodes[idx],
      resolvedType: f.type,
      resolvedGenerator: f.type,
      isUnique: f.isUnique ?? false,
      templateReferences: [],
      referencedSchema: f.type.startsWith('@schema:') ? f.type.replace('@schema:', '') : undefined,
    })
  );

  return {
    node: schemaNode,
    fields: validatedFields,
    dependencies: new Set(),
    compositeUniques,
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

  it('should generate pick values from array parameter', () => {
    const schema: ValidatedSchema = createMockSchema([
      {
        name: 'status',
        type: 'pick',
        params: [
          { name: 'array', value: ['active', 'inactive', 'pending'] },
        ],
      },
    ]);

    const rng = createRNG(4242);
    const record = generateRecord(schema, rng);

    expect(['active', 'inactive', 'pending']).toContain(record.status);
  });

  it('should generate weightedPick values from options parameter', () => {
    const schema: ValidatedSchema = createMockSchema([
      {
        name: 'accountType',
        type: 'weightedPick',
        params: [
          {
            name: 'options',
            value: [
              { value: 'free', weight: 70 },
              { value: 'premium', weight: 25 },
              { value: 'enterprise', weight: 5 },
            ],
          },
        ],
      },
    ]);

    const rng = createRNG(4343);
    const record = generateRecord(schema, rng);

    expect(['free', 'premium', 'enterprise']).toContain(record.accountType);
  });

  it('should use resolvedGenerator when present', () => {
    const schema = createMockSchema([
      {
        name: 'status',
        type: 'string',
        params: [{ name: 'array', value: ['active', 'inactive'] }],
      },
    ]);

    schema.fields[0] = {
      ...schema.fields[0],
      resolvedGenerator: 'pick',
    };

    const rng = createRNG(4545);
    const record = generateRecord(schema, rng);

    expect(['active', 'inactive']).toContain(record.status);
  });

  it('should evaluate template parameter values using current record context', () => {
    const schema: ValidatedSchema = createMockSchema([
      {
        name: 'firstName',
        type: 'pick',
        params: [{ name: 'array', value: ['Ada'] }],
      },
      {
        name: 'lastName',
        type: 'pick',
        params: [{ name: 'array', value: ['Lovelace'] }],
      },
      {
        name: 'email',
        type: 'string',
        params: [{ name: 'template', value: '{{firstName}}.{{lastName}}@test.com' }],
      },
    ]);

    schema.fields[2] = {
      ...schema.fields[2],
      resolvedGenerator: 'pick',
      node: {
        ...schema.fields[2].node,
        generator: {
          name: 'pick',
          parameters: [{ name: 'array', value: ['{{firstName}}.{{lastName}}@test.com'] }],
        },
      },
    };

    const rng = createRNG(1212);
    const record = generateRecord(schema, rng);

    expect(record.email).toBe('Ada.Lovelace@test.com');
  });

  it('should fail with field-scoped error when template reference is missing', () => {
    const schema: ValidatedSchema = createMockSchema([
      {
        name: 'firstName',
        type: 'pick',
        params: [{ name: 'array', value: ['Ada'] }],
      },
      {
        name: 'email',
        type: 'pick',
        params: [{ name: 'array', value: ['{{firstName}}.{{lastName}}@test.com'] }],
      },
    ]);

    const rng = createRNG(9898);

    expect(() => generateRecord(schema, rng)).toThrow(/email/i);
    expect(() => generateRecord(schema, rng)).toThrow(/lastName/i);
  });

  it('should throw a clear error when a template field is declared before its dependency (ordering issue)', () => {
    // email references {{firstName}} but is declared BEFORE firstName in field order.
    // Story 6.2: sortFieldsByDependency re-orders fields so firstName generates first.
    // The record must now SUCCEED, not throw.
    const schema: ValidatedSchema = createMockSchema([
      {
        name: 'email',
        type: 'pick',
        params: [{ name: 'array', value: ['{{firstName}}@test.com'] }],
      },
      {
        name: 'firstName',
        type: 'pick',
        params: [{ name: 'array', value: ['Ada'] }],
      },
    ]);

    // Set templateReferences so the order resolver knows email depends on firstName
    schema.fields[0] = {
      ...schema.fields[0],
      templateReferences: ['firstName'],
    };

    const rng = createRNG(1234);

    // After 6.2: ordering is resolved automatically – record generates successfully
    const record = generateRecord(schema, rng);
    expect(record.email).toBe('Ada@test.com');
    expect(record.firstName).toBe('Ada');
  });
});

// ---------------------------------------------------------------------------
// sortFieldsByDependency unit tests (Story 6.2 – AC: 4, 5, 8)
// ---------------------------------------------------------------------------

describe('sortFieldsByDependency', () => {
  /**
   * Small helper: build a minimal ValidatedField with given name and deps.
   * Avoids importing the full createMockSchema for field-level tests.
   */
  function makeField(
    name: string,
    templateReferences: string[] = []
  ): ValidatedField {
    const mockLocation = { file: 'test.td', line: 1, column: 1, length: 10 };
    const node: FieldNode = {
      kind: 'field',
      name,
      type: 'string',
      generator: { name: 'string', parameters: [] },
      location: mockLocation,
    };
    return {
      node,
      resolvedType: 'string',
      resolvedGenerator: 'string',
      isUnique: false,
      templateReferences,
    };
  }

  it('should return fields unchanged when there are no dependencies (stable declaration order)', () => {
    const a = makeField('a');
    const b = makeField('b');
    const c = makeField('c');

    const result = sortFieldsByDependency([a, b, c]);

    expect(result.map((f) => f.node.name)).toEqual(['a', 'b', 'c']);
  });

  it('should resolve a linear chain C → B → A into order A, B, C', () => {
    // C depends on B, B depends on A → generation order: A, B, C
    const a = makeField('a');
    const b = makeField('b', ['a']);
    const c = makeField('c', ['b']);

    // Declare in reverse order: C, B, A
    const result = sortFieldsByDependency([c, b, a]);

    expect(result.map((f) => f.node.name)).toEqual(['a', 'b', 'c']);
  });

  it('should resolve fan-in: C references both A and B (independent of each other)', () => {
    // A and B are independent; C depends on both → A and B come before C
    const a = makeField('a');
    const b = makeField('b');
    const c = makeField('c', ['a', 'b']);

    const result = sortFieldsByDependency([c, a, b]);
    const names = result.map((f) => f.node.name);

    // A and B must appear before C
    const idxA = names.indexOf('a');
    const idxB = names.indexOf('b');
    const idxC = names.indexOf('c');
    expect(idxA).toBeLessThan(idxC);
    expect(idxB).toBeLessThan(idxC);
    expect(names).toHaveLength(3);
  });

  it('should resolve multiple independent chains [A→B] and [C→D] in the same schema', () => {
    const a = makeField('a');
    const b = makeField('b', ['a']);
    const c = makeField('c');
    const d = makeField('d', ['c']);

    const result = sortFieldsByDependency([b, d, a, c]);
    const names = result.map((f) => f.node.name);

    // A must come before B; C must come before D
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('c')).toBeLessThan(names.indexOf('d'));
    expect(names).toHaveLength(4);
  });

  it('should handle an empty field list', () => {
    const result = sortFieldsByDependency([]);
    expect(result).toHaveLength(0);
  });

  it('should throw a clear error listing field names when a runtime cycle is detected', () => {
    // Manually construct a cycle: a → b → a (impossible after analyzer, but guard must fire)
    const a = makeField('a', ['b']);
    const b = makeField('b', ['a']);

    expect(() => sortFieldsByDependency([a, b])).toThrow(
      /circular field dependency/i
    );
    // Error message must mention the involved fields
    expect(() => sortFieldsByDependency([a, b])).toThrow(/a/);
    expect(() => sortFieldsByDependency([a, b])).toThrow(/b/);
  });

  it('should throw a clear error when a field references a missing dependency', () => {
    const a = makeField('a', ['missingField']);

    expect(() => sortFieldsByDependency([a])).toThrow(/invalid field dependency/i);
    expect(() => sortFieldsByDependency([a])).toThrow(/a/);
    expect(() => sortFieldsByDependency([a])).toThrow(/missingField/);
  });

  it('should produce correct record via generateRecord when email is declared before firstName', () => {
    // Integration check: sortFieldsByDependency is wired into generateRecord()
    const schema = createMockSchema([
      {
        name: 'email',
        type: 'pick',
        params: [{ name: 'array', value: ['{{firstName}}@example.com'] }],
      },
      {
        name: 'firstName',
        type: 'pick',
        params: [{ name: 'array', value: ['Grace'] }],
      },
    ]);

    schema.fields[0] = {
      ...schema.fields[0],
      templateReferences: ['firstName'],
    };

    const rng = createRNG(5555);
    const record = generateRecord(schema, rng);

    expect(record.firstName).toBe('Grace');
    expect(record.email).toBe('Grace@example.com');
  });
});

/**
 * Helper to create mock ValidatedProgram for streaming tests
 */
function createMockProgram(
  schemas: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      params?: Array<{ name: string; value: unknown }>;
      isUnique?: boolean;
    }>;
    compositeUniques?: readonly (readonly string[])[];
  }>
): ValidatedProgram {
  const mockLocation: SourceLocation = {
    file: 'test.td',
    line: 1,
    column: 1,
    length: 10,
  };

  const schemaMap = new Map<string, ValidatedSchema>();

  for (const s of schemas) {
    const schema = createMockSchema(s.fields, s.name, s.compositeUniques ?? []);
    schemaMap.set(s.name, schema);
  }

  return {
    ast: {
      kind: 'program',
      declarations: [],
      location: mockLocation,
    },
    symbolTable: new SymbolTable(),
    schemas: schemaMap,
    metadata: {
      analyzedAt: new Date(),
      schemaCount: schemas.length,
      totalFields: schemas.reduce((sum, s) => sum + s.fields.length, 0),
    },
  };
}

async function expectAsyncError(action: () => Promise<void>, matcher: RegExp): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    if (!(error instanceof Error)) {
      throw error;
    }

    expect(error.message).toMatch(matcher);
    return;
  }

  throw new Error(`Expected async action to fail with ${matcher.toString()}`);
}

describe('generate (streaming)', () => {
  describe('basic streaming behavior', () => {
    it('should yield exactly count records', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'id', type: 'int', params: [] }],
        },
      ]);

      const records = [];
      for await (const record of generate(program, { count: 10 })) {
        records.push(record);
      }

      expect(records).toHaveLength(10);
    });

    it('should yield records one at a time (lazy evaluation)', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'value', type: 'int', params: [] }],
        },
      ]);

      let yieldCount = 0;
      for await (const record of generate(program, { count: 5 })) {
        yieldCount++;
        expect(record).toBeDefined();
        expect(record).toHaveProperty('value');
        if (yieldCount === 3) break; // Stop early to test laziness
      }

      expect(yieldCount).toBe(3); // Only 3 records generated, not all 5
    });

    it('should work with for-await-of loop', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'id', type: 'int', params: [] }],
        },
      ]);

      let count = 0;
      for await (const record of generate(program, { count: 10 })) {
        count++;
        expect(record).toHaveProperty('id');
      }

      expect(count).toBe(10);
    });

    it('should handle zero count', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'id', type: 'int', params: [] }],
        },
      ]);

      const records = [];
      for await (const record of generate(program, { count: 0 })) {
        records.push(record);
      }

      expect(records).toHaveLength(0);
    });
  });

  describe('determinism', () => {
    it('should produce identical sequences with same seed', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [
            {
              name: 'value',
              type: 'int',
              params: [
                { name: 'min', value: 0 },
                { name: 'max', value: 100 },
              ],
            },
          ],
        },
      ]);

      const records1 = [];
      for await (const record of generate(program, {
        count: 10,
        seed: 12345,
      })) {
        records1.push(record);
      }

      const records2 = [];
      for await (const record of generate(program, {
        count: 10,
        seed: 12345,
      })) {
        records2.push(record);
      }

      expect(records1).toEqual(records2);
    });

    it('should produce different sequences with different seeds', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'value', type: 'int', params: [] }],
        },
      ]);

      const records1 = [];
      for await (const record of generate(program, { count: 10, seed: 111 })) {
        records1.push(record);
      }

      const records2 = [];
      for await (const record of generate(program, { count: 10, seed: 222 })) {
        records2.push(record);
      }

      expect(records1).not.toEqual(records2);
    });

    it('should use random seed when seed not provided', async () => {
      const program = createMockProgram([
        {
          name: 'TestSchema',
          fields: [{ name: 'value', type: 'int', params: [] }],
        },
      ]);

      // When no seed is provided, createRNG uses Date.now()
      // This test verifies that omitting seed parameter works correctly
      const records = [];
      for await (const record of generate(program, { count: 10 })) {
        records.push(record);
      }

      // Should generate 10 records successfully
      expect(records).toHaveLength(10);

      // All records should have the expected structure
      for (const record of records) {
        expect(record).toHaveProperty('value');
        expect(typeof record.value).toBe('number');
      }
    });
  });

  describe('context reference resolution', () => {
    it('resolves @context.<collection>.random.<field> references', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users.random.email'] }],
            },
          ],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, {
        count: 5,
        seed: 42,
        context: {
          users: [
            { id: 1, email: 'ada@example.com' },
            { id: 2, email: 'grace@example.com' },
          ],
        },
      })) {
        records.push(record);
      }

      for (const record of records) {
        expect(['ada@example.com', 'grace@example.com']).toContain(record.email);
      }
    });

    it('resolves @context.<collection>[index].<field> references', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users[0].email'] }],
            },
          ],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, {
        count: 3,
        context: {
          users: [
            { id: 1, email: 'ada@example.com' },
            { id: 2, email: 'grace@example.com' },
          ],
        },
      })) {
        records.push(record);
      }

      for (const record of records) {
        expect(record.email).toBe('ada@example.com');
      }
    });

    it('keeps random context selection deterministic with same seed', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users.random.email'] }],
            },
          ],
        },
      ]);

      const firstRun: Record<string, unknown>[] = [];
      for await (const record of generate(program, {
        count: 6,
        seed: 999,
        context: {
          users: [
            { id: 1, email: 'ada@example.com' },
            { id: 2, email: 'grace@example.com' },
            { id: 3, email: 'linus@example.com' },
          ],
        },
      })) {
        firstRun.push(record);
      }

      const secondRun: Record<string, unknown>[] = [];
      for await (const record of generate(program, {
        count: 6,
        seed: 999,
        context: {
          users: [
            { id: 1, email: 'ada@example.com' },
            { id: 2, email: 'grace@example.com' },
            { id: 3, email: 'linus@example.com' },
          ],
        },
      })) {
        secondRun.push(record);
      }

      expect(firstRun).toEqual(secondRun);
    });

    it('throws clear runtime error when context collection is missing', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users.random.email'] }],
            },
          ],
        },
      ]);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, {
          count: 1,
          context: {
            teams: [{ id: 1, name: 'platform' }],
          },
        })) {
          // consume stream
        }
      }, /context collection 'users' is not available/i);
    });

    it('throws clear runtime error when index is out of range', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users[3].email'] }],
            },
          ],
        },
      ]);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, {
          count: 1,
          context: {
            users: [{ id: 1, email: 'ada@example.com' }],
          },
        })) {
          // consume stream
        }
      }, /out of range/i);
    });

    it('throws clear runtime error when selected field is missing', async () => {
      const program = createMockProgram([
        {
          name: 'UserSchema',
          fields: [
            {
              name: 'department',
              type: 'pick',
              params: [{ name: 'array', value: ['@context.users.random.department'] }],
            },
          ],
        },
      ]);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, {
          count: 1,
          context: {
            users: [{ id: 1, email: 'ada@example.com' }],
          },
        })) {
          // consume stream
        }
      }, /field 'department' not found/i);
    });
  });

  describe('memory efficiency', () => {
    it(
      '@slow @performance should handle 1M+ records without memory issues (NFR3)',
      async () => {
        const program = createMockProgram([
          {
            name: 'TestSchema',
            fields: [
              { name: 'id', type: 'int', params: [] },
              {
                name: 'value',
                type: 'string',
                params: [{ name: 'length', value: 50 }],
              },
            ],
          },
        ]);

        let count = 0;
        for await (const record of generate(program, {
          count: 1_000_000,
          seed: 999,
        })) {
          count++;
          // Only validate structure every 100k records to keep test fast
          if (count % 100_000 === 0) {
            expect(record).toHaveProperty('id');
            expect(record).toHaveProperty('value');
          }
        }

        expect(count).toBe(1_000_000);
      },
      { timeout: 60000 } // 60 second timeout for 1M records
    );
  });

  describe('template field resolution', () => {
    it('should resolve template references through the async generate() pipeline', async () => {
      // Verifies that template substitution works end-to-end through the streaming path,
      // not just through the synchronous generateRecord() helper.
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'firstName',
              type: 'pick',
              params: [{ name: 'array', value: ['Ada'] }],
            },
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['{{firstName}}@test.com'] }],
            },
          ],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 3, seed: 7777 })) {
        records.push(record);
      }

      expect(records).toHaveLength(3);
      for (const record of records) {
        expect(record.email).toBe('Ada@test.com');
      }
    });
  });

  describe('single-field uniqueness enforcement', () => {
    it('enforces uniqueness for fields marked unique across count > 1', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'randomInt',
              params: [
                { name: 'min', value: 1 },
                { name: 'max', value: 10_000 },
              ],
              isUnique: true,
            },
          ],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 5, seed: 99 })) {
        records.push(record);
      }

      const ids = records.map((record) => record.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('retries transient duplicates and eventually succeeds deterministically', async () => {
      // Array has 9 copies of 'dup' and 1 copy of 'unique'.
      // Generating 2 records forces the tracker to reject 'dup' for the second
      // record at least once (90% chance per draw), exercising the retry loop.
      // Asserting both 'dup' and 'unique' appear in the output proves the retry
      // path was reached: without retry enforcement both records would likely be 'dup'.
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'pick',
              params: [{ name: 'array', value: ['dup', 'dup', 'dup', 'dup', 'dup', 'dup', 'dup', 'dup', 'dup', 'unique'] }],
              isUnique: true,
            },
          ],
        },
      ]);

      const records1: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 2, seed: 1234 })) {
        records1.push(record);
      }

      const records2: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 2, seed: 1234 })) {
        records2.push(record);
      }

      const ids = records1.map((record) => record.id);
      // Uniqueness enforced: no duplicate values
      expect(new Set(ids).size).toBe(ids.length);
      // Both values present: 'dup' was picked once and 'unique' was reached via retry
      expect(ids).toContain('dup');
      expect(ids).toContain('unique');
      // Deterministic: same seed produces identical output
      expect(records1).toEqual(records2);
    });

    it('exhausts an exact integer range without failing on the final unseen value', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'randomInt',
              params: [
                { name: 'min', value: 1 },
                { name: 'max', value: 50 },
              ],
              isUnique: true,
            },
          ],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 50, seed: 20260309 })) {
        records.push(record);
      }

      const ids = records.map((record) => record.id);
      expect(ids).toHaveLength(50);
      expect(new Set(ids).size).toBe(50);
      if (!ids.every((id): id is number => typeof id === 'number')) {
        throw new Error('Expected all generated ids to be numbers');
      }

      expect(Math.min(...ids)).toBe(1);
      expect(Math.max(...ids)).toBe(50);
    });

    it('fails with field-scoped guidance after exhausting uniqueness retries', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'status',
              type: 'pick',
              params: [{ name: 'array', value: ['same'] }],
              isUnique: true,
            },
          ],
        },
      ]);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, { count: 2, seed: 111 })) {
          // consume stream
        }
      }, /status/i);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, { count: 2, seed: 111 })) {
          // consume stream
        }
      }, /increase.*variety|relax.*constraint/i);
    });

    it('resets uniqueness tracking between separate generate() sessions', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'status',
              type: 'pick',
              params: [{ name: 'array', value: ['only-value'] }],
              isUnique: true,
            },
          ],
        },
      ]);

      const firstSession: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 1, seed: 55 })) {
        firstSession.push(record);
      }

      const secondSession: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 1, seed: 55 })) {
        secondSession.push(record);
      }

      expect(firstSession).toEqual([{ status: 'only-value' }]);
      expect(secondSession).toEqual([{ status: 'only-value' }]);
    });
  });

  describe('schema relationship generation', () => {
    it('generates related records inline for @schema:<name> fields', async () => {
      const program = createMockProgram([
        {
          name: 'Profile',
          fields: [
            {
              name: 'bio',
              type: 'pick',
              params: [{ name: 'array', value: ['hello-world'] }],
            },
          ],
        },
        {
          name: 'User',
          fields: [{ name: 'profile', type: '@schema:Profile' }],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 1, seed: 123 })) {
        records.push(record);
      }

      const userRecord = records.find((record) => 'profile' in record);
      expect(userRecord).toBeDefined();
      if (userRecord === undefined) {
        throw new Error('Expected a generated user record with profile');
      }

      const profile = userRecord?.profile as Record<string, unknown>;
      expect(typeof profile).toBe('object');
      expect(profile.bio).toBe('hello-world');
    });

    it('preserves deterministic output with relationships for fixed seed', async () => {
      const program = createMockProgram([
        {
          name: 'Department',
          fields: [
            {
              name: 'name',
              type: 'pick',
              params: [{ name: 'array', value: ['Engineering', 'QA', 'Design'] }],
            },
          ],
        },
        {
          name: 'User',
          fields: [{ name: 'department', type: '@schema:Department' }],
        },
      ]);

      const records1: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 4, seed: 77 })) {
        records1.push(record);
      }

      const records2: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 4, seed: 77 })) {
        records2.push(record);
      }

      expect(records1).toEqual(records2);
    });

    it('throws actionable error when relationship depth exceeds configured max depth', async () => {
      const program = createMockProgram([
        {
          name: 'A',
          fields: [{ name: 'b', type: '@schema:B' }],
        },
        {
          name: 'B',
          fields: [{ name: 'c', type: '@schema:C' }],
        },
        {
          name: 'C',
          fields: [{ name: 'value', type: 'pick', params: [{ name: 'array', value: ['leaf'] }] }],
        },
      ]);

      const stream = generate(program, { count: 1, seed: 42, maxRelationshipDepth: 1 });

      await expectAsyncError(async () => {
        for await (const _record of stream) {
          // consume
        }
      }, /depth exceeded max depth 1/i);
    });
  });

  describe('composite uniqueness enforcement', () => {
    it('enforces unique 2-field composite combinations', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['a@test.com', 'b@test.com', 'c@test.com'] }],
            },
            {
              name: 'tenantId',
              type: 'pick',
              params: [{ name: 'array', value: ['t1', 't2', 't3'] }],
            },
          ],
          compositeUniques: [['email', 'tenantId']],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 8, seed: 321 })) {
        records.push(record);
      }

      const combinations = records.map((record) => JSON.stringify([record.email, record.tenantId]));
      expect(new Set(combinations).size).toBe(combinations.length);
    });

    it('enforces unique 3-field composite combinations', async () => {
      const program = createMockProgram([
        {
          name: 'Audit',
          fields: [
            {
              name: 'userId',
              type: 'pick',
              params: [{ name: 'array', value: ['u1', 'u2', 'u3'] }],
            },
            {
              name: 'resourceId',
              type: 'pick',
              params: [{ name: 'array', value: ['r1', 'r2', 'r3'] }],
            },
            {
              name: 'action',
              type: 'pick',
              params: [{ name: 'array', value: ['read', 'write', 'delete'] }],
            },
          ],
          compositeUniques: [['userId', 'resourceId', 'action']],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 20, seed: 654 })) {
        records.push(record);
      }

      const combinations = records.map((record) =>
        JSON.stringify([record.userId, record.resourceId, record.action]),
      );
      expect(new Set(combinations).size).toBe(combinations.length);
    });

    it('retries when a composite collision occurs and eventually succeeds', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['dup@test.com', 'dup@test.com', 'alt@test.com'] }],
            },
            {
              name: 'tenantId',
              type: 'pick',
              params: [{ name: 'array', value: ['tenant-a', 'tenant-a', 'tenant-b'] }],
            },
          ],
          compositeUniques: [['email', 'tenantId']],
        },
      ]);

      const records: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 2, seed: 987 })) {
        records.push(record);
      }

      const combinations = records.map((record) => JSON.stringify([record.email, record.tenantId]));
      expect(new Set(combinations).size).toBe(2);
    });

    it('fails with schema-qualified composite error after retry exhaustion', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['same-email@test.com'] }],
            },
            {
              name: 'tenantId',
              type: 'pick',
              params: [{ name: 'array', value: ['tenant-only'] }],
            },
          ],
          compositeUniques: [['email', 'tenantId']],
        },
      ]);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, { count: 2, seed: 77 })) {
          // consume stream
        }
      }, /Composite uniqueness constraint/);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, { count: 2, seed: 77 })) {
          // consume stream
        }
      }, /User\.email, User\.tenantId/);

      await expectAsyncError(async () => {
        for await (const _record of generate(program, { count: 2, seed: 77 })) {
          // consume stream
        }
      }, /100 attempts/);
    });

    it('resets composite uniqueness tracking between separate generate() sessions', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [
            {
              name: 'email',
              type: 'pick',
              params: [{ name: 'array', value: ['only@test.com'] }],
            },
            {
              name: 'tenantId',
              type: 'pick',
              params: [{ name: 'array', value: ['tenant-only'] }],
            },
          ],
          compositeUniques: [['email', 'tenantId']],
        },
      ]);

      const firstSession: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 1, seed: 55 })) {
        firstSession.push(record);
      }

      const secondSession: Record<string, unknown>[] = [];
      for await (const record of generate(program, { count: 1, seed: 55 })) {
        secondSession.push(record);
      }

      expect(firstSession).toEqual([{ email: 'only@test.com', tenantId: 'tenant-only' }]);
      expect(secondSession).toEqual([{ email: 'only@test.com', tenantId: 'tenant-only' }]);
    });
  });

  describe('multiple schemas', () => {
    it('should generate count records for each schema in program', async () => {
      const program = createMockProgram([
        {
          name: 'User',
          fields: [{ name: 'id', type: 'int', params: [] }],
        },
        {
          name: 'Order',
          fields: [{ name: 'orderId', type: 'int', params: [] }],
        },
      ]);

      const records = [];
      for await (const record of generate(program, { count: 5 })) {
        records.push(record);
      }

      // Should have 5 User records + 5 Order records = 10 total
      expect(records).toHaveLength(10);

      // Verify fields from both schemas
      const userRecords = records.slice(0, 5);
      const orderRecords = records.slice(5);

      for (const r of userRecords) {
        expect(r).toHaveProperty('id');
      }
      for (const r of orderRecords) {
        expect(r).toHaveProperty('orderId');
      }
    });
  });
});

