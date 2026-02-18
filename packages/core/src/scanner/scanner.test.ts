/**
 * Unit Tests for Scanner
 *
 * Tests lexical analysis of DSL source code.
 * Tests token types, error handling, and source location tracking.
 */

import { describe, test, expect } from 'bun:test';
import { scan, Scanner } from './scanner';
import type { Token } from './tokens';

type TokenWithValue = Exclude<Token, { kind: 'eof' }>;

function tokenWithValueAt(tokens: Token[], index: number): TokenWithValue {
  const token = tokens[index];
  expect(token).toBeDefined();
  expect(token.kind).not.toBe('eof');
  return token as TokenWithValue;
}

describe('Scanner', () => {
  describe('empty and whitespace input', () => {
    test('scans empty string returns only EOF token', () => {
      const result = scan('', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].kind).toBe('eof');
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
      }
    });

    test('scans whitespace-only returns EOF token', () => {
      const result = scan('   \n\t  \n  ', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].kind).toBe('eof');
      }
    });
  });

  describe('keyword tokenization', () => {
    test('scans schema keyword', () => {
      const result = scan('schema', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // keyword + eof
        expect(result.value[0].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 0).value).toBe('schema');
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
        expect(result.value[0].location.length).toBe(6);
      }
    });

    test('scans all keywords', () => {
      const source = 'schema profile context unique template';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(6); // 5 keywords + eof
        expect(result.value[0].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 0).value).toBe('schema');
        expect(result.value[1].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 1).value).toBe('profile');
        expect(result.value[2].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 2).value).toBe('context');
        expect(result.value[3].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 3).value).toBe('unique');
        expect(result.value[4].kind).toBe('keyword');
        expect(tokenWithValueAt(result.value, 4).value).toBe('template');
      }
    });

    test('keywords are case-sensitive', () => {
      const result = scan('Schema SCHEMA', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3); // 2 identifiers + eof
        expect(result.value[0].kind).toBe('identifier');
        expect(tokenWithValueAt(result.value, 0).value).toBe('Schema');
        expect(result.value[1].kind).toBe('identifier');
        expect(tokenWithValueAt(result.value, 1).value).toBe('SCHEMA');
      }
    });
  });

  describe('identifier tokenization', () => {
    test('scans simple identifier', () => {
      const result = scan('myField', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // identifier + eof
        expect(result.value[0].kind).toBe('identifier');
        expect(tokenWithValueAt(result.value, 0).value).toBe('myField');
        expect(result.value[0].location.length).toBe(7);
      }
    });

    test('scans identifier with underscores', () => {
      const result = scan('_private_field', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('identifier');
        expect(tokenWithValueAt(result.value, 0).value).toBe('_private_field');
      }
    });

    test('scans identifier with numbers', () => {
      const result = scan('field123', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('identifier');
        expect(tokenWithValueAt(result.value, 0).value).toBe('field123');
      }
    });
  });

  describe('string literal tokenization', () => {
    test('scans simple string with double quotes', () => {
      const result = scan('"hello world"', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // string + eof
        expect(result.value[0].kind).toBe('string');
        expect(tokenWithValueAt(result.value, 0).value).toBe('hello world');
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
      }
    });

    test('scans simple string with single quotes', () => {
      const result = scan("'hello world'", 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('string');
        expect(tokenWithValueAt(result.value, 0).value).toBe('hello world');
      }
    });

    test('scans string with escape sequences', () => {
      const result = scan('"line1\\nline2\\ttab\\\\backslash"', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('string');
        expect(tokenWithValueAt(result.value, 0).value).toBe('line1\nline2\ttab\\backslash');
      }
    });

    test('scans string with escaped quotes', () => {
      const result = scan('"She said \\"hello\\""', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('string');
        expect(tokenWithValueAt(result.value, 0).value).toBe('She said "hello"');
      }
    });

    test('handles unterminated string', () => {
      const result = scan('"unterminated', 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('scanner.unterminatedString');
        expect(result.errors[0].message).toContain('Unterminated string');
        expect(result.errors[0].location?.line).toBe(1);
        expect(result.errors[0].location?.column).toBe(1);
      }
    });
  });

  describe('numeric literal tokenization', () => {
    test('scans integer', () => {
      const result = scan('42', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // number + eof
        expect(result.value[0].kind).toBe('number');
        expect(tokenWithValueAt(result.value, 0).value).toBe(42);
        expect(result.value[0].location.length).toBe(2);
      }
    });

    test('scans float with decimal point', () => {
      const result = scan('123.45', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('number');
        expect(tokenWithValueAt(result.value, 0).value).toBe(123.45);
        expect(result.value[0].location.length).toBe(6);
      }
    });

    test('scans zero', () => {
      const result = scan('0', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('number');
        expect(tokenWithValueAt(result.value, 0).value).toBe(0);
      }
    });

    test('scans float starting with zero', () => {
      const result = scan('0.5', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('number');
        expect(tokenWithValueAt(result.value, 0).value).toBe(0.5);
      }
    });
  });

  describe('operator tokenization', () => {
    test('scans single-character operators', () => {
      const result = scan(': , { } [ ] ( ) = @', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(11); // 10 operators + eof
        expect(result.value[0].kind).toBe('operator');
        expect(tokenWithValueAt(result.value, 0).value).toBe(':');
        expect(result.value[1].kind).toBe('operator');
        expect(tokenWithValueAt(result.value, 1).value).toBe(',');
        expect(result.value[2].kind).toBe('operator');
        expect(tokenWithValueAt(result.value, 2).value).toBe('{');
        expect(result.value[9].kind).toBe('operator');
        expect(tokenWithValueAt(result.value, 9).value).toBe('@');
      }
    });

    test('scans arrow operator', () => {
      const result = scan('->', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // operator + eof
        expect(result.value[0].kind).toBe('operator');
        expect(tokenWithValueAt(result.value, 0).value).toBe('->');
        expect(result.value[0].location.length).toBe(2);
      }
    });
  });

  describe('mixed token types', () => {
    test('scans schema definition', () => {
      const source = 'schema User { name: string }';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('keyword'); // schema
        expect(tokenWithValueAt(result.value, 0).value).toBe('schema');
        expect(result.value[1].kind).toBe('identifier'); // User
        expect(tokenWithValueAt(result.value, 1).value).toBe('User');
        expect(result.value[2].kind).toBe('operator'); // {
        expect(tokenWithValueAt(result.value, 2).value).toBe('{');
        expect(result.value[3].kind).toBe('identifier'); // name
        expect(result.value[4].kind).toBe('operator'); // :
        expect(result.value[5].kind).toBe('identifier'); // string
        expect(result.value[6].kind).toBe('operator'); // }
      }
    });
  });

  describe('line and column tracking', () => {
    test('tracks 1-indexed line and column', () => {
      const result = scan('x', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
      }
    });

    test('tracks column across tokens', () => {
      const result = scan('abc def', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
        expect(result.value[1].location.line).toBe(1);
        expect(result.value[1].location.column).toBe(5); // After "abc "
      }
    });

    test('tracks line numbers on multiline input', () => {
      const source = 'line1\nline2\nline3';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[0].location.column).toBe(1);
        expect(result.value[1].location.line).toBe(2);
        expect(result.value[1].location.column).toBe(1);
        expect(result.value[2].location.line).toBe(3);
        expect(result.value[2].location.column).toBe(1);
      }
    });

    test('handles Windows line endings', () => {
      const source = 'line1\r\nline2';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[1].location.line).toBe(2);
      }
    });

    test('handles old Mac line endings', () => {
      const source = 'line1\rline2';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.line).toBe(1);
        expect(result.value[1].location.line).toBe(2);
      }
    });
  });

  describe('error handling', () => {
    test('reports invalid character', () => {
      const result = scan('#invalid', 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('scanner.invalidCharacter');
        expect(result.errors[0].message).toContain('#');
      }
    });

    test('collects multiple errors', () => {
      const source = '"unterminated\n#invalid';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should have errors for unterminated string and invalid character
        expect(result.errors.length).toBeGreaterThanOrEqual(2);

        // Check for unterminated string error
        const unterminatedError = result.errors.find(
          (e) => e.code === 'scanner.unterminatedString',
        );
        expect(unterminatedError).toBeDefined();

        const invalidCharacterError = result.errors.find(
          (e) => e.code === 'scanner.invalidCharacter',
        );
        expect(invalidCharacterError).toBeDefined();
      }
    });

    test('continues scanning after errors', () => {
      const source = '#bad identifier';
      const result = scan(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should have reported error but no tokens since it failed
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('scanner.invalidCharacter');
      }
    });

    test('reports invalid operator start', () => {
      const result = scan('-', 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('scanner.invalidCharacter');
      }
    });
  });

  describe('source location accuracy', () => {
    test('calculates token length correctly', () => {
      const result = scan('schema', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.length).toBe(6);
      }
    });

    test('includes quote characters in string length', () => {
      const result = scan('"test"', 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.length).toBe(6); // Including quotes
      }
    });

    test('records correct filename', () => {
      const result = scan('x', 'myfile.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.file).toBe('myfile.td');
      }
    });
  });

  describe('Scanner class API', () => {
    test('can be instantiated and scanned', () => {
      const scanner = new Scanner('schema', 'test.td');
      const result = scanner.scan();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('keyword');
      }
    });

    test('scan function uses default filename', () => {
      const result = scan('x');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].location.file).toBe('<anonymous>');
      }
    });
  });
});
