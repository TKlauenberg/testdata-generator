/**
 * Unit Tests for Recursive Descent Parser
 *
 * Tests cover:
 * - Valid parsing scenarios (simple to complex schemas)
 * - Error detection and reporting
 * - Error recovery and accumulation
 * - Source location tracking
 * - Helpful error messages and suggestions
 */

import { describe, test, expect } from 'bun:test';
import { parse } from './parser';
import type { Token } from '../scanner/tokens';
import type { SchemaNode } from './ast';
import type { SourceLocation } from '../common/diagnostic';

// Helper: Create a test location
function loc(line: number, column: number, length: number = 1): SourceLocation {
  return { file: 'test.td', line, column, length };
}

// Helper: Create EOF token
function eof(line: number = 1, column: number = 1): Token {
  return { kind: 'eof', location: loc(line, column, 0) };
}

// Helper: Create keyword token
function keyword(value: 'schema' | 'unique', line: number, column: number): Token {
  return { kind: 'keyword', value, location: loc(line, column, value.length) };
}

// Helper: Create identifier token
function ident(value: string, line: number, column: number): Token {
  return { kind: 'identifier', value, location: loc(line, column, value.length) };
}

// Helper: Create operator token
function op(value: ':' | '{' | '}' | '=' | '(' | ')' | ',' | '[' | ']' | '@', line: number, column: number): Token {
  return { kind: 'operator', value, location: loc(line, column, 1) };
}

// Helper: Create string token
function str(value: string, line: number, column: number): Token {
  return { kind: 'string', value, location: loc(line, column, value.length + 2) }; // +2 for quotes
}

// Helper: Create number token
function num(value: number, line: number, column: number): Token {
  return { kind: 'number', value, location: loc(line, column, value.toString().length) };
}

describe('Parser - Basic Functionality', () => {
  test('parses empty program with only EOF', () => {
    const tokens: Token[] = [eof()];
    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('program');
      expect(result.value.declarations.length).toBe(0);
    }
  });

  test('parses simple schema with one field', () => {
    // schema User { id: string }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      op('}', 1, 26),
      eof(1, 27),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const program = result.value;
      expect(program.kind).toBe('program');
      expect(program.declarations.length).toBe(1);

      const schema = program.declarations[0] as SchemaNode;
      expect(schema.kind).toBe('schema');
      expect(schema.name).toBe('User');
      expect(schema.fields.length).toBe(1);

      const field = schema.fields[0];
      expect(field.kind).toBe('field');
      expect(field.name).toBe('id');
      expect(field.type).toBe('string');
      expect(field.generator).toBeUndefined();
      expect(field.constraints).toBeUndefined();
    }
  });

  test('parses schema with multiple fields', () => {
    // schema User { id: string  email: string  age: number }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 2, 3),
      op(':', 2, 5),
      ident('string', 2, 7),
      ident('email', 3, 3),
      op(':', 3, 8),
      ident('string', 3, 10),
      ident('age', 4, 3),
      op(':', 4, 6),
      ident('number', 4, 8),
      op('}', 5, 1),
      eof(5, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.fields.length).toBe(3);

      expect(schema.fields[0].name).toBe('id');
      expect(schema.fields[0].type).toBe('string');

      expect(schema.fields[1].name).toBe('email');
      expect(schema.fields[1].type).toBe('string');

      expect(schema.fields[2].name).toBe('age');
      expect(schema.fields[2].type).toBe('number');
    }
  });

  test('parses multiple schemas in one program', () => {
    // schema User { id: string }
    // schema Product { name: string }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      op('}', 1, 26),
      keyword('schema', 2, 1),
      ident('Product', 2, 8),
      op('{', 2, 16),
      ident('name', 2, 18),
      op(':', 2, 22),
      ident('string', 2, 24),
      op('}', 2, 31),
      eof(2, 32),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.declarations.length).toBe(2);

      const schema1 = result.value.declarations[0] as SchemaNode;
      expect(schema1.name).toBe('User');

      const schema2 = result.value.declarations[1] as SchemaNode;
      expect(schema2.name).toBe('Product');
    }
  });

  test('parses schema-reference field type syntax (@schema:Name)', () => {
    // schema User { profile: @schema:Profile }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('profile', 1, 15),
      op(':', 1, 22),
      op('@', 1, 24),
      ident('schema', 1, 25),
      op(':', 1, 31),
      ident('Profile', 1, 32),
      op('}', 1, 40),
      eof(1, 41),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.fields[0]?.name).toBe('profile');
      expect(schema.fields[0]?.type).toBe('@schema:Profile');
    }
  });

  test('parses schema-level defaults declared at schema start', () => {
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      op('@', 2, 3),
      ident('defaults', 2, 4),
      op('{', 2, 13),
      ident('string', 3, 5),
      ident('generator', 3, 12),
      op('=', 3, 21),
      ident('randomString', 3, 22),
      op('(', 3, 34),
      ident('length', 3, 35),
      op('=', 3, 41),
      num(12, 3, 42),
      op(')', 3, 44),
      keyword('unique', 4, 5),
      op('=', 4, 11),
      ident('true', 4, 12),
      op('}', 5, 3),
      ident('name', 6, 3),
      op(':', 6, 7),
      ident('string', 6, 9),
      op('}', 7, 1),
      eof(7, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.defaults).toBeDefined();
      expect(schema.defaults?.generatorDefaults).toEqual([
        {
          fieldType: 'string',
          generator: {
            name: 'randomString',
            parameters: [{ name: 'length', value: 12 }],
          },
        },
      ]);
      expect(schema.defaults?.constraints?.unique).toBe(true);
      expect(schema.fields).toHaveLength(1);
    }
  });

  test('rejects misplaced schema defaults after fields have started', () => {
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('name', 2, 3),
      op(':', 2, 7),
      ident('string', 2, 9),
      op('@', 3, 3),
      ident('defaults', 3, 4),
      op('{', 3, 13),
      ident('string', 4, 5),
      ident('generator', 4, 12),
      op('=', 4, 21),
      ident('randomString', 4, 22),
      op('}', 5, 3),
      op('}', 6, 1),
      eof(6, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((error) => error.message.includes('Schema defaults block must appear only once at the start')),
      ).toBe(true);
    }
  });
});

describe('Parser - Generator Specifications', () => {
  test('parses field with simple generator (no parameters)', () => {
    // schema User { id: string generator=uuid }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      ident('generator', 1, 26),
      op('=', 1, 35),
      ident('uuid', 1, 36),
      op('}', 1, 41),
      eof(1, 42),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator).toBeDefined();
      expect(field.generator?.name).toBe('uuid');
      expect(field.generator?.parameters).toBeUndefined();
    }
  });

  test('parses field with generator and single parameter', () => {
    // schema User { name: string generator=randomString(length=20) }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('name', 1, 15),
      op(':', 1, 19),
      ident('string', 1, 21),
      ident('generator', 1, 28),
      op('=', 1, 37),
      ident('randomString', 1, 38),
      op('(', 1, 50),
      ident('length', 1, 51),
      op('=', 1, 57),
      num(20, 1, 58),
      op(')', 1, 60),
      op('}', 1, 62),
      eof(1, 63),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator).toBeDefined();
      expect(field.generator?.name).toBe('randomString');
      expect(field.generator?.parameters).toBeDefined();
      expect(field.generator?.parameters?.length).toBe(1);
      expect(field.generator?.parameters?.[0].name).toBe('length');
      expect(field.generator?.parameters?.[0].value).toBe(20);
    }
  });

  test('parses field with generator and multiple parameters', () => {
    // schema User { age: number generator=randomInt(min=18, max=100) }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('age', 1, 15),
      op(':', 1, 18),
      ident('number', 1, 20),
      ident('generator', 1, 27),
      op('=', 1, 36),
      ident('randomInt', 1, 37),
      op('(', 1, 46),
      ident('min', 1, 47),
      op('=', 1, 50),
      num(18, 1, 51),
      op(',', 1, 53),
      ident('max', 1, 55),
      op('=', 1, 58),
      num(100, 1, 59),
      op(')', 1, 62),
      op('}', 1, 64),
      eof(1, 65),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator?.name).toBe('randomInt');
      expect(field.generator?.parameters?.length).toBe(2);
      expect(field.generator?.parameters?.[0]).toEqual({ name: 'min', value: 18 });
      expect(field.generator?.parameters?.[1]).toEqual({ name: 'max', value: 100 });
    }
  });

  test('parses field with array literal parameter', () => {
    // schema User { status: string generator=pick(array=["active", "inactive"]) }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('status', 1, 15),
      op(':', 1, 21),
      ident('string', 1, 23),
      ident('generator', 1, 30),
      op('=', 1, 39),
      ident('pick', 1, 40),
      op('(', 1, 44),
      ident('array', 1, 45),
      op('=', 1, 50),
      op('[', 1, 51),
      str('active', 1, 52),
      op(',', 1, 60),
      str('inactive', 1, 62),
      op(']', 1, 72),
      op(')', 1, 73),
      op('}', 1, 75),
      eof(1, 76),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator?.name).toBe('pick');
      expect(field.generator?.parameters?.[0].name).toBe('array');
      expect(field.generator?.parameters?.[0].value).toEqual(['active', 'inactive']);
    }
  });

  test('parses field with object array literal parameter', () => {
    // schema User { tier: string generator=weightedPick(options=[{value="free", weight=70}]) }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('tier', 1, 15),
      op(':', 1, 19),
      ident('string', 1, 21),
      ident('generator', 1, 28),
      op('=', 1, 37),
      ident('weightedPick', 1, 38),
      op('(', 1, 50),
      ident('options', 1, 51),
      op('=', 1, 58),
      op('[', 1, 59),
      op('{', 1, 60),
      ident('value', 1, 61),
      op('=', 1, 66),
      str('free', 1, 67),
      op(',', 1, 73),
      ident('weight', 1, 75),
      op('=', 1, 81),
      num(70, 1, 82),
      op('}', 1, 84),
      op(']', 1, 85),
      op(')', 1, 86),
      op('}', 1, 88),
      eof(1, 89),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator?.name).toBe('weightedPick');
      expect(field.generator?.parameters?.[0].name).toBe('options');
      expect(field.generator?.parameters?.[0].value).toEqual([
        { value: 'free', weight: 70 },
      ]);
    }
  });

  test('parses generator parameters with different literal types', () => {
    // generator=test(str="hello", num=42, bool=true)
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('Test', 1, 8),
      op('{', 1, 13),
      ident('field', 1, 15),
      op(':', 1, 20),
      ident('string', 1, 22),
      ident('generator', 1, 29),
      op('=', 1, 38),
      ident('test', 1, 39),
      op('(', 1, 43),
      ident('str', 1, 44),
      op('=', 1, 47),
      str('hello', 1, 48),
      op(',', 1, 55),
      ident('num', 1, 57),
      op('=', 1, 60),
      num(42, 1, 61),
      op(',', 1, 63),
      ident('bool', 1, 65),
      op('=', 1, 69),
      ident('true', 1, 70),
      op(')', 1, 74),
      op('}', 1, 76),
      eof(1, 77),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator?.parameters?.length).toBe(3);
      expect(field.generator?.parameters?.[0]).toEqual({ name: 'str', value: 'hello' });
      expect(field.generator?.parameters?.[1]).toEqual({ name: 'num', value: 42 });
      expect(field.generator?.parameters?.[2]).toEqual({ name: 'bool', value: true });
    }
  });
});

describe('Parser - Constraints', () => {
  test('parses field with unique constraint', () => {
    // schema User { email: string unique }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 1, 15),
      op(':', 1, 20),
      ident('string', 1, 22),
      keyword('unique', 1, 29),
      op('}', 1, 36),
      eof(1, 37),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.constraints).toBeDefined();
      expect(field.constraints?.unique).toBe(true);
    }
  });

  test('parses field with generator and unique constraint', () => {
    // schema User { email: string generator=email unique }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 1, 15),
      op(':', 1, 20),
      ident('string', 1, 22),
      ident('generator', 1, 29),
      op('=', 1, 38),
      ident('email', 1, 39),
      keyword('unique', 1, 45),
      op('}', 1, 52),
      eof(1, 53),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.generator?.name).toBe('email');
      expect(field.constraints?.unique).toBe(true);
    }
  });

  test('parses schema-level composite unique directive', () => {
    // schema User { email: string tenantId: string unique(email, tenantId) }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 2, 3),
      op(':', 2, 8),
      ident('string', 2, 10),
      ident('tenantId', 3, 3),
      op(':', 3, 11),
      ident('string', 3, 13),
      keyword('unique', 4, 3),
      op('(', 4, 9),
      ident('email', 4, 10),
      op(',', 4, 15),
      ident('tenantId', 4, 17),
      op(')', 4, 25),
      op('}', 5, 1),
      eof(5, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.compositeUniques).toEqual([['email', 'tenantId']]);
    }
  });

  test('parses multiple schema-level composite unique directives', () => {
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 2, 3),
      op(':', 2, 8),
      ident('string', 2, 10),
      ident('tenantId', 3, 3),
      op(':', 3, 11),
      ident('string', 3, 13),
      ident('region', 4, 3),
      op(':', 4, 9),
      ident('string', 4, 11),
      keyword('unique', 5, 3),
      op('(', 5, 9),
      ident('email', 5, 10),
      op(',', 5, 15),
      ident('tenantId', 5, 17),
      op(')', 5, 25),
      keyword('unique', 6, 3),
      op('(', 6, 9),
      ident('tenantId', 6, 10),
      op(',', 6, 18),
      ident('region', 6, 20),
      op(')', 6, 26),
      op('}', 7, 1),
      eof(7, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.compositeUniques).toEqual([
        ['email', 'tenantId'],
        ['tenantId', 'region'],
      ]);
    }
  });

  test('reports parse error when composite unique directive has fewer than 2 fields', () => {
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 2, 3),
      op(':', 2, 8),
      ident('string', 2, 10),
      keyword('unique', 3, 3),
      op('(', 3, 9),
      ident('email', 3, 10),
      op(')', 3, 15),
      op('}', 4, 1),
      eof(4, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((error) =>
          error.message.toLowerCase().includes('at least two fields'),
        ),
      ).toBe(true);
    }
  });
});

describe('Parser - Error Detection', () => {
  test('error: missing colon after field name', () => {
    // schema User { email string }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 1, 15),
      ident('string', 1, 21), // Missing colon before this
      op('}', 1, 28),
      eof(1, 29),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors[0];
      // The parser produces a generic error message first, then adds the contextual one
      expect(error.message).toContain("Expected ':'");
      if (error.location) {
        expect(error.location.line).toBe(1);
      }
    }
  });

  test('error: missing type after colon', () => {
    // schema User { email: }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 1, 15),
      op(':', 1, 20),
      op('}', 1, 22), // Missing type before closing brace
      eof(1, 23),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors.find((e) => e.message.includes("Expected type after ':'"));
      expect(error).toBeDefined();
    }
  });

  test('error: unclosed schema brace', () => {
    // schema User { email: string
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 1, 15),
      op(':', 1, 20),
      ident('string', 1, 22),
      eof(1, 29), // Missing closing brace
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors.find((e) => e.message.includes("Expected '}'"));
      expect(error).toBeDefined();
      if (error) {
        // The error message correctly identifies missing closing brace
        expect(error.message).toContain("Expected '}'");
      }
    }
  });

  test('error: missing equals after generator keyword', () => {
    // schema User { id: string generator uuid }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      ident('generator', 1, 26),
      ident('uuid', 1, 36), // Missing '=' before this
      op('}', 1, 41),
      eof(1, 42),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors.find((e) => e.message.includes("Expected '=' after 'generator'"));
      expect(error).toBeDefined();
    }
  });

  test('error: unclosed parameter list', () => {
    // schema User { age: number generator=randomInt(min=1, max=100 }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('age', 1, 15),
      op(':', 1, 18),
      ident('number', 1, 20),
      ident('generator', 1, 27),
      op('=', 1, 36),
      ident('randomInt', 1, 37),
      op('(', 1, 46),
      ident('min', 1, 47),
      op('=', 1, 50),
      num(1, 1, 51),
      op(',', 1, 52),
      ident('max', 1, 54),
      op('=', 1, 57),
      num(100, 1, 58),
      op('}', 1, 62), // Missing ')' before this
      eof(1, 63),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors.find((e) =>
        e.message.includes("Expected ')' to close parameter list"),
      );
      expect(error).toBeDefined();
    }
  });

  test('error: unexpected token at top level', () => {
    // identifier (not a keyword)
    const tokens: Token[] = [ident('wrongPlace', 1, 1), eof(1, 11)];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors[0];
      expect(error.message).toContain('Unexpected');
      expect(error.message).toContain('at top level');
    }
  });
});

describe('Parser - Error Recovery', () => {
  test('collects multiple syntax errors without stopping', () => {
    // schema User {
    //   email
    //   age: number generator
    // }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('email', 2, 3),
      // Missing colon and type
      ident('age', 3, 3),
      op(':', 3, 6),
      ident('number', 3, 8),
      ident('generator', 3, 15),
      // Missing '=' after generator
      op('}', 4, 1),
      eof(4, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should have at least 2 errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      // First error: missing colon after 'email'
      const error1 = result.errors.find((e) =>
        e.message.includes("Expected ':' after field name 'email'"),
      );
      expect(error1).toBeDefined();

      // Second error: missing '=' after 'generator'
      const error2 = result.errors.find((e) =>
        e.message.includes("Expected '=' after 'generator'"),
      );
      expect(error2).toBeDefined();
    }
  });
});

describe('Parser - Source Location Tracking', () => {
  test('tracks accurate source locations for schema node', () => {
    // schema User { id: string }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      op('}', 1, 26),
      eof(1, 27),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const schema = result.value.declarations[0] as SchemaNode;
      expect(schema.location.file).toBe('test.td');
      expect(schema.location.line).toBe(1);
      expect(schema.location.column).toBe(1);
    }
  });

  test('tracks accurate source locations for field nodes', () => {
    // schema User { id: string }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 1, 15),
      op(':', 1, 17),
      ident('string', 1, 19),
      op('}', 1, 26),
      eof(1, 27),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const field = (result.value.declarations[0] as SchemaNode).fields[0];
      expect(field.location.file).toBe('test.td');
      expect(field.location.line).toBe(1);
      expect(field.location.column).toBe(15);
    }
  });
});

describe('Parser - AST Structure Verification', () => {
  test('verifies AST structure matches expected nodes', () => {
    // schema User {
    //   id: string generator=uuid
    //   email: string generator=email unique
    // }
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('User', 1, 8),
      op('{', 1, 13),
      ident('id', 2, 3),
      op(':', 2, 5),
      ident('string', 2, 7),
      ident('generator', 2, 14),
      op('=', 2, 23),
      ident('uuid', 2, 24),
      ident('email', 3, 3),
      op(':', 3, 8),
      ident('string', 3, 10),
      ident('generator', 3, 17),
      op('=', 3, 26),
      ident('email', 3, 27),
      keyword('unique', 3, 33),
      op('}', 4, 1),
      eof(4, 2),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const program = result.value;

      // Verify program structure
      expect(program.kind).toBe('program');
      expect(program.declarations.length).toBe(1);

      // Verify schema structure
      const schema = program.declarations[0] as SchemaNode;
      expect(schema.kind).toBe('schema');
      expect(schema.name).toBe('User');
      expect(schema.fields.length).toBe(2);

      // Verify first field structure
      const field1 = schema.fields[0];
      expect(field1.kind).toBe('field');
      expect(field1.name).toBe('id');
      expect(field1.type).toBe('string');
      expect(field1.generator?.name).toBe('uuid');
      expect(field1.generator?.parameters).toBeUndefined();
      expect(field1.constraints).toBeUndefined();

      // Verify second field structure
      const field2 = schema.fields[1];
      expect(field2.kind).toBe('field');
      expect(field2.name).toBe('email');
      expect(field2.type).toBe('string');
      expect(field2.generator?.name).toBe('email');
      expect(field2.constraints?.unique).toBe(true);
    }
  });
});

describe('Parser - Convenience Function', () => {
  test('parse() convenience function works correctly', () => {
    const tokens: Token[] = [
      keyword('schema', 1, 1),
      ident('Test', 1, 8),
      op('{', 1, 13),
      ident('field', 1, 15),
      op(':', 1, 20),
      ident('string', 1, 22),
      op('}', 1, 29),
      eof(1, 30),
    ];

    const result = parse(tokens);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('program');
      expect(result.value.declarations.length).toBe(1);
    }
  });
});
