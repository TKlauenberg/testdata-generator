/**
 * Tests for semantic analyzer - type checking and validation
 */

import { describe, test, expect } from 'bun:test';
import { analyze } from './analyzer';
import type { Program, SchemaNode, FieldNode, GeneratorParameter } from '../parser/ast';
import type { SourceLocation } from '../common/diagnostic';

// Helper to create test source location
function createLocation(line = 1, column = 1, length = 10): SourceLocation {
  return { file: 'test.td', line, column, length };
}

// Helper to create test field
function createField(
  name: string,
  type: string,
  generatorName?: string,
  generatorParameters?: GeneratorParameter[],
  location?: SourceLocation,
): FieldNode {
  return {
    kind: 'field',
    name,
    type,
    generator: generatorName
      ? {
          name: generatorName,
          parameters: generatorParameters,
        }
      : undefined,
    location: location ?? createLocation(),
  };
}

// Helper to create test schema
function createSchema(name: string, fields: FieldNode[], location?: SourceLocation): SchemaNode {
  return {
    kind: 'schema',
    name,
    fields,
    location: location ?? createLocation(),
  };
}

// Helper to create test program
function createProgram(schemas: SchemaNode[]): Program {
  return {
    kind: 'program',
    declarations: schemas,
    location: createLocation(),
  };
}

describe('analyze()', () => {
  describe('successful validation', () => {
    test('validates simple schema with supported types', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'uuid', 'uuid'),
          createField('name', 'string'),
          createField('age', 'number'),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(1);
        expect(result.value.schemas.has('User')).toBe(true);
        expect(result.value.metadata.schemaCount).toBe(1);
        expect(result.value.metadata.totalFields).toBe(3);
      }
    });

    test('validates multiple schemas', () => {
      const program = createProgram([
        createSchema('User', [createField('id', 'uuid', 'uuid')]),
        createSchema('Product', [createField('sku', 'string')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(2);
        expect(result.value.schemas.has('User')).toBe(true);
        expect(result.value.schemas.has('Product')).toBe(true);
      }
    });

    test('returns ValidatedProgram with all required fields', () => {
      const program = createProgram([createSchema('User', [createField('id', 'uuid', 'uuid')])]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.ast).toBe(program);
        expect(result.value.symbolTable).toBeDefined();
        expect(result.value.schemas).toBeInstanceOf(Map);
        expect(result.value.metadata.analyzedAt).toBeInstanceOf(Date);
        expect(result.value.metadata.schemaCount).toBe(1);
        expect(result.value.metadata.totalFields).toBe(1);
      }
    });
  });

  describe('type validation', () => {
    test('detects unsupported type with suggestion', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'uuuid', 'uuid'), // typo: should be 'uuid'
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('analyzer.unsupportedType');
        expect(result.errors[0].message).toContain('uuuid');
        expect(result.errors[0].suggestion).toContain('uuid');
      }
    });

    test('detects multiple unsupported types', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'uuuid', 'uuid'),
          createField('created', 'timestampp'), // typo: should be 'timestamp'
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
        const unsupportedErrors = result.errors.filter(
          (e) => e.code === 'analyzer.unsupportedType',
        );
        expect(unsupportedErrors.length).toBe(2);
      }
    });
  });

  describe('generator validation', () => {
    test('detects unrecognized generator with suggestion', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'string', 'uuidd'), // typo: should be 'uuid'
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const genError = result.errors.find((e) => e.code === 'analyzer.unrecognizedGenerator');
        expect(genError).toBeDefined();
        expect(genError?.message).toContain('uuidd');
        expect(genError?.suggestion).toContain('uuid');
      }
    });

    test('allows fields without generators', () => {
      const program = createProgram([createSchema('User', [createField('id', 'string')])]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
    });
  });

  describe('template reference validation', () => {
    test('detects undefined template field reference in direct string parameter', () => {
      const program = createProgram([
        createSchema('User', [
          createField('firstName', 'string'),
          createField('fullName', 'string', 'randomString', [
            { name: 'template', value: '{{missingField}}' },
          ]),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const templateError = result.errors.find(
          (error) => error.code === 'analyzer.undefinedTemplateField',
        );
        expect(templateError).toBeDefined();
        expect(templateError?.message).toContain('missingField');
      }
    });

    test('detects undefined template field reference inside a pick array parameter (AC4)', () => {
      // pick(array=["{{missingField}}"]) — template reference is inside an array value,
      // not a top-level string parameter. Previously this was silently skipped.
      const program = createProgram([
        createSchema('User', [
          createField('firstName', 'string'),
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['{{firstName}}.{{missingField}}@test.com'] },
          ]),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const templateError = result.errors.find(
          (error) => error.code === 'analyzer.undefinedTemplateField',
        );
        expect(templateError).toBeDefined();
        expect(templateError?.message).toContain('missingField');
      }
    });

    test('accepts valid template references inside a pick array parameter', () => {
      const program = createProgram([
        createSchema('User', [
          createField('firstName', 'string'),
          createField('lastName', 'string'),
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['{{firstName}}.{{lastName}}@test.com'] },
          ]),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
    });

    test('detects undefined template reference nested inside a weightedPick options object', () => {
      const program = createProgram([
        createSchema('User', [
          createField('firstName', 'string'),
          createField('handle', 'string', 'weightedPick', [
            {
              name: 'options',
              value: [
                { value: '{{firstName}}_{{missingField}}', weight: 100 },
              ],
            },
          ]),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const templateError = result.errors.find(
          (error) => error.code === 'analyzer.undefinedTemplateField',
        );
        expect(templateError).toBeDefined();
        expect(templateError?.message).toContain('missingField');
      }
    });
  });

  describe('circular dependency detection', () => {
    test('detects circular dependency between two schemas', () => {
      const program = createProgram([
        createSchema('User', [createField('profile', 'Profile')]),
        createSchema('Profile', [createField('user', 'User')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const circularError = result.errors.find((e) => e.code === 'analyzer.circularDependency');
        expect(circularError).toBeDefined();
        expect(circularError?.message).toMatch(/User.*Profile.*User/);
      }
    });

    test('detects circular dependency among three schemas', () => {
      const program = createProgram([
        createSchema('A', [createField('b', 'B')]),
        createSchema('B', [createField('c', 'C')]),
        createSchema('C', [createField('a', 'A')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const circularError = result.errors.find((e) => e.code === 'analyzer.circularDependency');
        expect(circularError).toBeDefined();
        expect(circularError?.message).toMatch(/A.*B.*C.*A/);
      }
    });

    test('allows valid schema dependencies without cycles', () => {
      const program = createProgram([
        createSchema('Country', [createField('name', 'string')]),
        createSchema('City', [createField('country', 'Country')]),
        createSchema('User', [createField('city', 'City')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
    });
  });

  describe('schema reference validation', () => {
    test('detects undefined schema types', () => {
      const program = createProgram([
        createSchema('User', [createField('profile', 'Profile')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const schemaError = result.errors.find((error) => error.code === 'analyzer.undefinedSchema');
        expect(schemaError).toBeDefined();
        expect(schemaError?.message).toContain('Profile');
      }
    });
  });

  describe('error accumulation', () => {
    test('accumulates multiple different error types', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'uuuid', 'uuidd'), // Both type and generator errors
          createField('profile', 'Profile'),
        ]),
        createSchema('Profile', [createField('user', 'User')]), // Circular dependency
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
        const errorCodes = result.errors.map((e) => e.code);
        expect(errorCodes).toContain('analyzer.unsupportedType');
        expect(errorCodes).toContain('analyzer.unrecognizedGenerator');
        expect(errorCodes).toContain('analyzer.circularDependency');
      }
    });
  });

  describe('symbol table building', () => {
    test('builds symbol table with all schemas', () => {
      const program = createProgram([
        createSchema('User', [createField('id', 'string')]),
        createSchema('Product', [createField('sku', 'string')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const symbolTable = result.value.symbolTable;
        expect(symbolTable.lookupSchema('User')).toBeDefined();
        expect(symbolTable.lookupSchema('Product')).toBeDefined();
      }
    });

    test('detects duplicate schema definitions', () => {
      const program = createProgram([
        createSchema('User', [createField('id', 'string')], createLocation(1, 1, 10)),
        createSchema('User', [createField('email', 'string')], createLocation(5, 1, 10)),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const duplicateError = result.errors.find((e) => e.code === 'analyzer.duplicateSchema');
        expect(duplicateError).toBeDefined();
      }
    });
  });
});
