import { describe, test, expect } from 'bun:test';
import type { SourceLocation } from '../common/diagnostic';
import {
  type Program,
  type SchemaNode,
  type FieldNode,
  type ProfileNode,
  type ContextNode,
  type GeneratorSpec,
  type GeneratorParameter,
  type FieldConstraints,
  type DefaultSpec,
  isSchemaNode,
  isFieldNode,
  isProfileNode,
  isContextNode,
  isProgramNode,
} from './ast';

// Helper to create test location
function createLocation(): SourceLocation {
  return {
    file: 'test.td',
    line: 1,
    column: 1,
    length: 10,
  };
}

describe('AST Node Construction', () => {
  test('construct valid Program AST', () => {
    const program: Program = {
      kind: 'program',
      declarations: [],
      location: createLocation(),
    };

    expect(program.kind).toBe('program');
    expect(program.declarations.length).toBe(0);
    expect(program.location.file).toBe('test.td');
  });

  test('construct valid SchemaNode', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    expect(schema.kind).toBe('schema');
    expect(schema.name).toBe('User');
    expect(schema.fields.length).toBe(0);
  });

  test('construct valid FieldNode with generator', () => {
    const generator: GeneratorSpec = {
      name: 'uuid',
      parameters: [],
    };

    const field: FieldNode = {
      kind: 'field',
      name: 'id',
      type: 'string',
      generator,
      location: createLocation(),
    };

    expect(field.kind).toBe('field');
    expect(field.name).toBe('id');
    expect(field.type).toBe('string');
    expect(field.generator?.name).toBe('uuid');
  });

  test('construct FieldNode with constraints', () => {
    const constraints: FieldConstraints = {
      unique: true,
    };

    const field: FieldNode = {
      kind: 'field',
      name: 'email',
      type: 'string',
      constraints,
      location: createLocation(),
    };

    expect(field.constraints?.unique).toBe(true);
  });

  test('construct FieldNode with generator parameters', () => {
    const parameters: readonly GeneratorParameter[] = [
      { name: 'min', value: 1 },
      { name: 'max', value: 100 },
    ];

    const generator: GeneratorSpec = {
      name: 'randomInt',
      parameters,
    };

    const field: FieldNode = {
      kind: 'field',
      name: 'age',
      type: 'number',
      generator,
      location: createLocation(),
    };

    expect(field.generator?.parameters?.length).toBe(2);
    expect(field.generator?.parameters?.[0].name).toBe('min');
    expect(field.generator?.parameters?.[0].value).toBe(1);
  });

  test('construct ProfileNode with defaults', () => {
    const defaults: readonly DefaultSpec[] = [
      {
        fieldType: 'string',
        generator: { name: 'randomString', parameters: [{ name: 'length', value: 20 }] },
      },
    ];

    const profile: ProfileNode = {
      kind: 'profile',
      name: 'Standard',
      defaults,
      location: createLocation(),
    };

    expect(profile.kind).toBe('profile');
    expect(profile.name).toBe('Standard');
    expect(profile.defaults.length).toBe(1);
    expect(profile.defaults[0].fieldType).toBe('string');
  });

  test('construct ContextNode', () => {
    const context: ContextNode = {
      kind: 'context',
      name: 'TestContext',
      location: createLocation(),
    };

    expect(context.kind).toBe('context');
    expect(context.name).toBe('TestContext');
  });

  test('construct complete Program with schema and fields', () => {
    const idField: FieldNode = {
      kind: 'field',
      name: 'id',
      type: 'string',
      generator: { name: 'uuid', parameters: [] },
      location: createLocation(),
    };

    const emailField: FieldNode = {
      kind: 'field',
      name: 'email',
      type: 'string',
      generator: { name: 'email', parameters: [] },
      constraints: { unique: true },
      location: createLocation(),
    };

    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [idField, emailField],
      location: createLocation(),
    };

    const program: Program = {
      kind: 'program',
      declarations: [schema],
      location: createLocation(),
    };

    expect(program.declarations.length).toBe(1);
    expect(program.declarations[0].kind).toBe('schema');

    const userSchema = program.declarations[0] as SchemaNode;
    expect(userSchema.fields.length).toBe(2);
    expect(userSchema.fields[0].name).toBe('id');
    expect(userSchema.fields[1].constraints?.unique).toBe(true);
  });
});

describe('Type Guards', () => {
  test('isSchemaNode correctly identifies SchemaNode', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    expect(isSchemaNode(schema)).toBe(true);
  });

  test('isSchemaNode returns false for non-schema nodes', () => {
    const profile: ProfileNode = {
      kind: 'profile',
      name: 'Standard',
      defaults: [],
      location: createLocation(),
    };

    expect(isSchemaNode(profile)).toBe(false);
  });

  test('isFieldNode correctly identifies FieldNode', () => {
    const field: FieldNode = {
      kind: 'field',
      name: 'id',
      type: 'string',
      location: createLocation(),
    };

    expect(isFieldNode(field)).toBe(true);
  });

  test('isProfileNode correctly identifies ProfileNode', () => {
    const profile: ProfileNode = {
      kind: 'profile',
      name: 'Standard',
      defaults: [],
      location: createLocation(),
    };

    expect(isProfileNode(profile)).toBe(true);
  });

  test('isContextNode correctly identifies ContextNode', () => {
    const context: ContextNode = {
      kind: 'context',
      name: 'TestContext',
      location: createLocation(),
    };

    expect(isContextNode(context)).toBe(true);
  });

  test('isProgramNode correctly identifies Program', () => {
    const program: Program = {
      kind: 'program',
      declarations: [],
      location: createLocation(),
    };

    expect(isProgramNode(program)).toBe(true);
  });

  test('type guards enable type narrowing', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    const profile: ProfileNode = {
      kind: 'profile',
      name: 'Standard',
      defaults: [],
      location: createLocation(),
    };

    const declarations = [schema, profile];

    for (const decl of declarations) {
      if (isSchemaNode(decl)) {
        // TypeScript knows this is SchemaNode
        expect(decl.name).toBeDefined();
        expect(decl.fields).toBeDefined();
      } else if (isProfileNode(decl)) {
        // TypeScript knows this is ProfileNode
        expect(decl.name).toBeDefined();
        expect(decl.defaults).toBeDefined();
      }
    }
  });
});

describe('Discriminated Union Type Safety', () => {
  test('exhaustive switch on Declaration type', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    const profile: ProfileNode = {
      kind: 'profile',
      name: 'Standard',
      defaults: [],
      location: createLocation(),
    };

    const context: ContextNode = {
      kind: 'context',
      name: 'TestContext',
      location: createLocation(),
    };

    function getDeclarationName(decl: SchemaNode | ProfileNode | ContextNode): string {
      switch (decl.kind) {
        case 'schema':
          return decl.name;
        case 'profile':
          return decl.name;
        case 'context':
          return decl.name;
        // TypeScript would error if we missed a case
      }
    }

    expect(getDeclarationName(schema)).toBe('User');
    expect(getDeclarationName(profile)).toBe('Standard');
    expect(getDeclarationName(context)).toBe('TestContext');
  });
});

describe('Immutability', () => {
  test('readonly arrays prevent mutation methods', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    // TypeScript compile error if we try to mutate - this is EXPECTED behavior
    // @ts-expect-error - should not allow push on readonly array
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    schema.fields.push({
      kind: 'field',
      name: 'newField',
      type: 'string',
      location: createLocation(),
    });
  });

  test('readonly properties prevent assignment', () => {
    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [],
      location: createLocation(),
    };

    // TypeScript compile error if we try to mutate
    // @ts-expect-error - should not allow property mutation
    schema.name = 'Modified';
  });

  test('immutable operations work correctly', () => {
    const field1: FieldNode = {
      kind: 'field',
      name: 'id',
      type: 'string',
      location: createLocation(),
    };

    const field2: FieldNode = {
      kind: 'field',
      name: 'email',
      type: 'string',
      location: createLocation(),
    };

    const schema: SchemaNode = {
      kind: 'schema',
      name: 'User',
      fields: [field1],
      location: createLocation(),
    };

    // Immutable operations like map, filter work fine
    const fieldNames = schema.fields.map((f) => f.name);
    expect(fieldNames).toEqual(['id']);

    // Creating new schema with additional field (pure function pattern)
    const updatedSchema: SchemaNode = {
      ...schema,
      fields: [...schema.fields, field2],
    };

    expect(schema.fields.length).toBe(1); // Original unchanged
    expect(updatedSchema.fields.length).toBe(2); // New schema has both
  });
});

describe('LiteralValue Type', () => {
  test('accepts string values', () => {
    const param: GeneratorParameter = {
      name: 'format',
      value: 'yyyy-MM-dd',
    };

    expect(typeof param.value).toBe('string');
  });

  test('accepts number values', () => {
    const param: GeneratorParameter = {
      name: 'max',
      value: 100,
    };

    expect(typeof param.value).toBe('number');
  });

  test('accepts boolean values', () => {
    const param: GeneratorParameter = {
      name: 'unique',
      value: true,
    };

    expect(typeof param.value).toBe('boolean');
  });
});

describe('AST Structure Examples', () => {
  test('example: simple schema with one field', () => {
    const program: Program = {
      kind: 'program',
      declarations: [
        {
          kind: 'schema',
          name: 'Product',
          fields: [
            {
              kind: 'field',
              name: 'id',
              type: 'string',
              generator: { name: 'uuid' },
              location: { file: 'product.td', line: 2, column: 3, length: 20 },
            },
          ],
          location: { file: 'product.td', line: 1, column: 1, length: 50 },
        },
      ],
      location: { file: 'product.td', line: 1, column: 1, length: 50 },
    };

    expect(program.declarations[0]).toMatchObject({
      kind: 'schema',
      name: 'Product',
    });
  });

  test('example: schema with multiple fields and constraints', () => {
    const program: Program = {
      kind: 'program',
      declarations: [
        {
          kind: 'schema',
          name: 'User',
          fields: [
            {
              kind: 'field',
              name: 'id',
              type: 'string',
              generator: { name: 'uuid' },
              location: createLocation(),
            },
            {
              kind: 'field',
              name: 'email',
              type: 'string',
              generator: { name: 'email' },
              constraints: { unique: true },
              location: createLocation(),
            },
            {
              kind: 'field',
              name: 'age',
              type: 'number',
              generator: {
                name: 'randomInt',
                parameters: [
                  { name: 'min', value: 18 },
                  { name: 'max', value: 99 },
                ],
              },
              location: createLocation(),
            },
          ],
          location: createLocation(),
        },
      ],
      location: createLocation(),
    };

    const userSchema = program.declarations[0] as SchemaNode;
    expect(userSchema.fields.length).toBe(3);
    expect(userSchema.fields[1].constraints?.unique).toBe(true);
    expect(userSchema.fields[2].generator?.parameters?.length).toBe(2);
  });
});
