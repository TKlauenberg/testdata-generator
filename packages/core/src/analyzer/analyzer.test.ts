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
  extendsSchema?: string,
  extendsSchemaLocation?: SourceLocation,
): SchemaNode {
  return {
    kind: 'schema',
    name,
    extendsSchema,
    extendsSchemaLocation,
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

    test('flattens inherited fields, preserves override order, and allows templates to reference inherited fields', () => {
      const program = createProgram([
        createSchema('User', [
          createField('id', 'string', 'pick', [{ name: 'array', value: ['base-id'] }], createLocation(1, 1, 4)),
          createField('email', 'string', 'email', undefined, createLocation(2, 1, 5)),
        ]),
        createSchema(
          'ExtendedUser',
          [
            createField('email', 'string', 'pick', [{ name: 'array', value: ['extended@example.com'] }], createLocation(4, 1, 5)),
            createField('slug', 'string', 'pick', [{ name: 'array', value: ['{{id}}-qa'] }], createLocation(5, 1, 4)),
          ],
          createLocation(3, 1, 12),
          undefined,
          undefined,
          'User',
          createLocation(3, 21, 12),
        ),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const extended = result.value.schemas.get('ExtendedUser');
        expect(extended?.baseSchema).toBe('User');
        expect(extended?.fields.map((field) => field.node.name)).toEqual(['id', 'email', 'slug']);
        expect(extended?.fields[1]?.resolvedGenerator).toBe('pick');
        expect(extended?.fields[2]?.templateReferences).toEqual(['id']);
      }
    });

    test('does not mutate the base schema when derived schemas override inherited fields', () => {
      const baseSchema = createSchema('User', [
        createField('email', 'string', 'email', undefined, createLocation(1, 1, 5)),
      ]);
      const derivedSchema = createSchema(
        'ExtendedUser',
        [createField('email', 'string', 'pick', [{ name: 'array', value: ['override@example.com'] }], createLocation(2, 1, 5))],
        createLocation(2, 1, 12),
        undefined,
        undefined,
        'User',
        createLocation(2, 21, 12),
      );

      const result = analyze(createProgram([baseSchema, derivedSchema]));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(baseSchema.fields[0]?.generator?.name).toBe('email');
        expect(result.value.schemas.get('User')?.fields[0]?.resolvedGenerator).toBe('email');
        expect(result.value.schemas.get('ExtendedUser')?.fields[0]?.resolvedGenerator).toBe('pick');
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

    test('does not emit a misleading workspace generator suggestion when no close match exists', () => {
      const program = createProgram([
        createSchema('User', [createField('email', 'string', '@workspace.generators.entirelyDifferentGenerator')]),
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
        expect(generatorError?.suggestion).toBeUndefined();
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

    test('suggests similar template field names and preserves the field location', () => {
      const location = createLocation(4, 3, 8);
      const program = createProgram([
        createSchema('User', [
          createField('firstName', 'string', undefined, undefined, createLocation(2, 3, 9)),
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['{{fristName}}@example.com'] },
          ], location),
        ]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const templateError = result.errors.find(
          (error) => error.code === 'analyzer.undefinedTemplateField',
        );
        expect(templateError).toBeDefined();
        expect(templateError?.suggestion).toContain('firstName');
        expect(templateError?.location).toEqual(location);
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

    test('uses fuzzy matching suggestions for missing context collections', () => {
      const location = createLocation(3, 5, 5);
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.usres.random.email'] },
          ], location),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users', 'orders'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.undefinedContextCollection');
        expect(error).toBeDefined();
        expect(error?.suggestion).toContain('users');
        expect(error?.location).toEqual(location);
      }
    });

    test('avoids misleading context suggestions when nothing is close', () => {
      const program = createProgram([
        createSchema('User', [
          createField('email', 'string', 'pick', [
            { name: 'array', value: ['@context.customers.random.email'] },
          ]),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users', 'orders'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((item) => item.code === 'analyzer.undefinedContextCollection');
        expect(error).toBeDefined();
        expect(error?.suggestion).toBeUndefined();
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
    
      test('detects circular inheritance and reports the extends clause location', () => {
        const program = createProgram([
          createSchema(
            'User',
            [createField('id', 'string')],
            createLocation(1, 1, 4),
            undefined,
            undefined,
            'Admin',
            createLocation(1, 13, 13),
          ),
          createSchema(
            'Admin',
            [createField('role', 'string')],
            createLocation(2, 1, 5),
            undefined,
            undefined,
            'User',
            createLocation(2, 14, 12),
          ),
        ]);

        const result = analyze(program);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          const circularError = result.errors.find((error) => error.code === 'analyzer.circularDependency');
          expect(circularError).toBeDefined();
          expect(circularError?.location?.line).toBe(2);
          expect(circularError?.location?.column).toBe(14);
        }
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

    test('suggests close schema names for misspelled schema references', () => {
      const location = createLocation(6, 7, 7);
      const program = createProgram([
        createSchema('Profile', [createField('id', 'uuid')]),
        createSchema('User', [createField('profile', 'Profiel', undefined, undefined, location)]),
      ]);

      const result = analyze(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const schemaError = result.errors.find((error) => error.code === 'analyzer.undefinedSchema');
        expect(schemaError).toBeDefined();
        expect(schemaError?.suggestion).toContain('Profile');
        expect(schemaError?.location).toEqual(location);
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
    
      test('detects undefined base schemas at the extends clause location', () => {
        const program = createProgram([
          createSchema(
            'ExtendedUser',
            [createField('id', 'string')],
            createLocation(1, 1, 12),
            undefined,
            undefined,
            'Usr',
            createLocation(1, 21, 11),
          ),
        ]);

        const result = analyze(program);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          const undefinedSchemaError = result.errors.find((error) => error.code === 'analyzer.undefinedSchema');
          expect(undefinedSchemaError).toBeDefined();
          expect(undefinedSchemaError?.message).toContain('Usr');
          expect(undefinedSchemaError?.location?.line).toBe(1);
          expect(undefinedSchemaError?.location?.column).toBe(21);
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

  describe('reference validation accumulation', () => {
    test('accumulates broken schema, template, context, and workspace generator references in one pass', () => {
      const program = createProgram([
        createSchema('Profile', [createField('id', 'uuid')]),
        createSchema('User', [
          createField('profile', 'Profiel', undefined, undefined, createLocation(2, 3, 7)),
          createField('email', 'string', '@workspace.generators.sharedEmai', undefined, createLocation(3, 3, 5)),
          createField('handle', 'string', 'pick', [
            { name: 'array', value: ['{{fristName}}'] },
          ], createLocation(4, 3, 6)),
          createField('sourceEmail', 'string', 'pick', [
            { name: 'array', value: ['@context.usres.random.email'] },
          ], createLocation(5, 3, 11)),
        ]),
      ]);

      const result = analyze(program, {
        availableContextCollections: ['users'],
        workspaceGenerators: createWorkspaceGenerators(),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.code === 'analyzer.undefinedSchema')).toBe(true);
        expect(result.errors.some((error) => error.code === 'analyzer.undefinedWorkspaceGenerator')).toBe(true);
        expect(result.errors.some((error) => error.code === 'analyzer.undefinedTemplateField')).toBe(true);
        expect(result.errors.some((error) => error.code === 'analyzer.undefinedContextCollection')).toBe(true);
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
