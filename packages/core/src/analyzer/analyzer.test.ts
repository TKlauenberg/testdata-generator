/**
 * Tests for semantic analyzer - type checking and validation
 */

import { describe, test, expect } from 'bun:test';
import { analyze } from './analyzer';
import {
  createWorkspaceGeneratorReference,
  type Program,
  type SchemaDefaults,
  type SchemaNode,
  type FieldNode,
  type GeneratorParameter,
  type WorkspaceGeneratorSpec,
} from '../parser/ast';
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
      ? generatorName.startsWith('@workspace.generators.')
        ? createWorkspaceGeneratorReference(generatorName.replace('@workspace.generators.', ''))
        : {
            name: generatorName,
            parameters: generatorParameters,
          }
      : undefined,
    location: location ?? createLocation(),
  };
}

function createWorkspaceGenerators(): WorkspaceGeneratorSpec[] {
  return [
    {
      name: 'sharedEmail',
      definition: {
        type: 'template',
        template: '{{localPart}}@example.com',
        generators: {
          localPart: {
            name: 'pick',
            parameters: [{ name: 'array', value: ['qa.team'] }],
          },
        },
      },
    },
  ];
}

// Helper to create test schema
function createSchema(
  name: string,
  fields: FieldNode[],
  location?: SourceLocation,
  compositeUniques?: readonly (readonly string[])[],
  defaults?: SchemaDefaults,
): SchemaNode {
  return {
    kind: 'schema',
    name,
    defaults,
    fields,
    compositeUniques,
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

    test('accepts defined workspace generator references', () => {
      const program = createProgram([
        createSchema('User', [createField('email', 'string', '@workspace.generators.sharedEmail')]),
      ]);

      const result = analyze(program, {
        workspaceGenerators: createWorkspaceGenerators(),
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema?.fields[0]?.resolvedGenerator).toBe('@workspace.generators.sharedEmail');
        expect(userSchema?.workspaceGenerators?.has('sharedEmail')).toBe(true);
      }
    });

    test('reports undefined workspace generator references with a suggestion', () => {
      const program = createProgram([
        createSchema('User', [createField('email', 'string', '@workspace.generators.sharedEmai')]),
      ]);

      const result = analyze(program, {
        workspaceGenerators: createWorkspaceGenerators(),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const generatorError = result.errors.find(
          (error) => error.code === 'analyzer.undefinedWorkspaceGenerator',
        );
        expect(generatorError).toBeDefined();
        expect(generatorError?.message).toContain('@workspace.generators.sharedEmai');
        expect(generatorError?.suggestion).toContain('@workspace.generators.sharedEmail');
      }
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

  describe('context reference validation', () => {
    test('accepts tagged context reference syntax when collection exists', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users@staging AND @region-us.random.email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
      });

      expect(result.ok).toBe(true);
    });

    test('accepts valid random context reference when collection exists', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users.random.email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
      });

      expect(result.ok).toBe(true);
    });

    test('accepts valid index context reference when collection exists', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users[0].email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
      });

      expect(result.ok).toBe(true);
    });

    test('emits diagnostic for malformed context reference syntax', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users.where(role=admin)'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.invalidContextReference');
        expect(error).toBeDefined();
        expect(error?.message).toContain('@context.users.where');
      }
    });

    test('emits diagnostic for missing context collection', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users.random.email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['orders'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.undefinedContextCollection');
        expect(error).toBeDefined();
        expect(error?.message).toContain('users');
      }
    });

    test('rejects unsupported OR tag syntax with a diagnostic', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.users@staging OR @region-us.random.email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.invalidContextReference');
        expect(error).toBeDefined();
        expect(error?.message).toContain('AND');
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
    test('accepts @schema:<name> references and exposes metadata for generation', () => {
      const program = createProgram([
        createSchema('Profile', [createField('bio', 'string')]),
        createSchema('User', [createField('profile', '@schema:Profile')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.dependencies.has('Profile')).toBe(true);
        expect(userSchema?.fields[0]?.referencedSchema).toBe('Profile');
      }
    });

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

    test('detects undefined @schema:<name> references', () => {
      const program = createProgram([
        createSchema('User', [createField('profile', '@schema:MissingProfile')]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const schemaError = result.errors.find((error) => error.code === 'analyzer.undefinedSchema');
        expect(schemaError).toBeDefined();
        expect(schemaError?.message).toContain('MissingProfile');
      }
    });
  });

  describe('single-field uniqueness metadata', () => {
    test('propagates unique constraint metadata to validated fields', () => {
      const uniqueField = createField('email', 'string', 'email');
      const normalField = createField('name', 'string');

      const program = createProgram([
        createSchema('User', [
          {
            ...uniqueField,
            constraints: { unique: true },
          },
          normalField,
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.fields[0]?.isUnique).toBe(true);
        expect(userSchema?.fields[1]?.isUnique).toBe(false);
      }
    });

    test('emits analyzer diagnostic for invalid unique constraint payload', () => {
      const malformedField: FieldNode = {
        ...createField('email', 'string', 'email'),
        constraints: { unique: false as unknown as true },
      };

      const program = createProgram([createSchema('User', [malformedField])]);
      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const uniqueError = result.errors.find(
          (error) => error.code === 'analyzer.invalidUniqueConstraint',
        );
        expect(uniqueError).toBeDefined();
        expect(uniqueError?.message).toContain('email');
      }
    });

    test.each([
      ['null', null],
      ['zero', 0],
      ['string', 'yes'],
    ])('emits analyzer diagnostic for unique constraint with value %s', (_label, invalidValue) => {
      const malformedField: FieldNode = {
        ...createField('score', 'string', 'randomString'),
        constraints: { unique: invalidValue as unknown as true },
      };

      const program = createProgram([createSchema('User', [malformedField])]);
      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const uniqueError = result.errors.find(
          (error) => error.code === 'analyzer.invalidUniqueConstraint',
        );
        expect(uniqueError).toBeDefined();
        expect(uniqueError?.message).toContain('score');
      }
    });

    test('applies schema defaults and configured generator defaults with explicit precedence', () => {
      const program = createProgram([
        createSchema(
          'User',
          [
            createField('name', 'string'),
            createField('email', 'string', 'email'),
          ],
          undefined,
          undefined,
          {
            generatorDefaults: [
              {
                fieldType: 'string',
                generator: {
                  name: 'randomString',
                  parameters: [{ name: 'length', value: 12 }],
                },
              },
            ],
            constraints: { unique: true },
            location: createLocation(),
          },
        ),
      ]);

      const result = analyze(program, {
        defaultGenerators: [
          {
            fieldType: 'string',
            generator: {
              name: 'pick',
              parameters: [{ name: 'array', value: ['workspace-default'] }],
            },
          },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema?.resolvedDefaults?.generatorDefaults.get('string')?.source).toBe('schema');
        expect(userSchema?.fields[0]?.resolvedGenerator).toBe('randomString');
        expect(userSchema?.fields[0]?.effective?.generatorSource).toBe('schema');
        expect(userSchema?.fields[0]?.isUnique).toBe(true);
        expect(userSchema?.fields[0]?.effective?.uniqueSource).toBe('schema');
        expect(userSchema?.fields[1]?.resolvedGenerator).toBe('email');
        expect(userSchema?.fields[1]?.effective?.generatorSource).toBe('field');
      }
    });
  });

  describe('composite uniqueness validation', () => {
    test('accepts valid 2-field and 3-field composite constraints and propagates metadata', () => {
      const program = createProgram([
        createSchema(
          'Membership',
          [
            createField('email', 'string'),
            createField('tenantId', 'string'),
            createField('resourceId', 'string'),
          ],
          undefined,
          [
            ['email', 'tenantId'],
            ['email', 'tenantId', 'resourceId'],
          ],
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const schema = result.value.schemas.get('Membership');
        expect(schema?.compositeUniques).toEqual([
          ['email', 'tenantId'],
          ['email', 'tenantId', 'resourceId'],
        ]);
      }
    });

    test('emits analyzer.compositeUniqueFieldNotFound for unknown composite field', () => {
      const program = createProgram([
        createSchema(
          'User',
          [createField('email', 'string'), createField('tenantId', 'string')],
          undefined,
          [['email', 'missingField']],
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find(
          (item) => item.code === 'analyzer.compositeUniqueFieldNotFound',
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('missingField');
      }
    });

    test('emits analyzer.compositeUniqueArity for more than 5 fields', () => {
      const program = createProgram([
        createSchema(
          'User',
          [
            createField('a', 'string'),
            createField('b', 'string'),
            createField('c', 'string'),
            createField('d', 'string'),
            createField('e', 'string'),
            createField('f', 'string'),
          ],
          undefined,
          [['a', 'b', 'c', 'd', 'e', 'f']],
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.compositeUniqueArity');
        expect(error).toBeDefined();
      }
    });

    test('emits analyzer.compositeUniqueArity for fewer than 2 fields', () => {
      const program = createProgram([
        createSchema(
          'User',
          [createField('email', 'string')],
          undefined,
          [['email']],
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.compositeUniqueArity');
        expect(error).toBeDefined();
      }
    });

    test('emits analyzer.compositeUniqueDuplicateField when composite directive repeats same field', () => {
      const program = createProgram([
        createSchema(
          'User',
          [createField('email', 'string'), createField('tenantId', 'string')],
          undefined,
          [['email', 'email']],
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find(
          (item) => item.code === 'analyzer.compositeUniqueDuplicateField',
        );
        expect(error).toBeDefined();
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
