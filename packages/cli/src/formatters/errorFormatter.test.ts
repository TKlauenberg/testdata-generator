import { describe, test, expect } from 'bun:test';
import { formatError, formatErrors } from './errorFormatter';
import type { Diagnostic } from '@testdata-ai/core';

describe('errorFormatter', () => {
  describe('formatError()', () => {
    test('formats error with location and pointer', () => {
      const diagnostic: Diagnostic = {
        code: 'scanner.unterminatedString',
        message: 'unterminated string literal',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 2,
          column: 18,
          length: 13,
        },
        suggestion: 'add closing quote to complete string literal',
      };

      const source = 'schema User {\n  name: string = "unterminated\n}';
      const output = formatError(diagnostic, source);

      expect(output).toContain('Error: scanner.unterminatedString');
      expect(output).toContain('--> test.td:2:18');
      expect(output).toContain('name: string = "unterminated');
      expect(output).toContain('^^^^^^^^^^^^^'); // Visual pointer
      expect(output).toContain('unterminated string literal');
      expect(output).toContain('help: add closing quote');
    });

    test('formats error without location', () => {
      const diagnostic: Diagnostic = {
        code: 'generator.invalidConfig',
        message: 'invalid configuration',
        severity: 'error',
      };

      const output = formatError(diagnostic, '');

      expect(output).toContain('Error: generator.invalidConfig');
      expect(output).toContain('invalid configuration');
      expect(output).not.toContain('-->');
    });

    test('formats warning with different label', () => {
      const diagnostic: Diagnostic = {
        code: 'analyzer.unusedField',
        message: 'field is defined but never used',
        severity: 'warning',
        location: {
          file: 'test.td',
          line: 3,
          column: 3,
          length: 6,
        },
      };

      const source = 'schema User {\n  id: uuid\n  unused: string\n}';
      const output = formatError(diagnostic, source);

      expect(output).toContain('Warning: analyzer.unusedField');
      expect(output).toContain('unused: string');
      expect(output).toContain('^^^^^^'); // 6 characters
    });

    test('formats error with suggestion', () => {
      const diagnostic: Diagnostic = {
        code: 'analyzer.undefinedReference',
        message: "unknown type 'uuuid'",
        severity: 'error',
        location: {
          file: 'test.td',
          line: 2,
          column: 7,
          length: 5,
        },
        suggestion: "Did you mean 'uuid'?",
      };

      const source = 'schema User {\n  id: uuuid\n}';
      const output = formatError(diagnostic, source);

      expect(output).toContain('Error: analyzer.undefinedReference');
      expect(output).toContain("help: Did you mean 'uuid'?");
    });

    test('handles error at column 1', () => {
      const diagnostic: Diagnostic = {
        code: 'parser.unexpectedToken',
        message: 'unexpected token',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 1,
          column: 1,
          length: 6,
        },
      };

      const source = 'schema User {';
      const output = formatError(diagnostic, source);

      expect(output).toContain('^^^^^^'); // No leading spaces
    });

    test('handles error with length 0 (defaults to 1)', () => {
      const diagnostic: Diagnostic = {
        code: 'scanner.unexpectedChar',
        message: 'unexpected character',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 1,
          column: 5,
          length: 0,
        },
      };

      const source = 'test@';
      const output = formatError(diagnostic, source);

      expect(output).toContain('^'); // At least one caret
    });

    test('formats info severity diagnostic', () => {
      const diagnostic: Diagnostic = {
        code: 'info.suggestion',
        message: 'consider using a more specific type',
        severity: 'info',
        location: {
          file: 'test.td',
          line: 1,
          column: 5,
          length: 3,
        },
      };

      const source = 'id: any';
      const output = formatError(diagnostic, source);

      expect(output).toContain('Info: info.suggestion');
    });

    test('handles missing line in source', () => {
      const diagnostic: Diagnostic = {
        code: 'test.error',
        message: 'test error',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 100,
          column: 1,
          length: 1,
        },
      };

      const source = 'line 1\nline 2';
      const output = formatError(diagnostic, source);

      expect(output).toContain('Error: test.error');
      // Should not crash, might show empty line or skip line display
    });
  });

  describe('formatErrors()', () => {
    test('formats multiple errors sorted by line number', () => {
      const diagnostics: Diagnostic[] = [
        {
          code: 'error.second',
          message: 'second error',
          severity: 'error',
          location: {
            file: 'test.td',
            line: 5,
            column: 1,
            length: 4,
          },
        },
        {
          code: 'error.first',
          message: 'first error',
          severity: 'error',
          location: {
            file: 'test.td',
            line: 2,
            column: 1,
            length: 4,
          },
        },
      ];

      const source = 'line1\nline2\nline3\nline4\nline5';
      const output = formatErrors(diagnostics, source);

      // First error should appear before second (sorted by line)
      const firstPos = output.indexOf('first error');
      const secondPos = output.indexOf('second error');
      expect(firstPos).toBeGreaterThan(-1);
      expect(secondPos).toBeGreaterThan(-1);
      expect(firstPos).toBeLessThan(secondPos);
    });

    test('sorts errors by column when on same line', () => {
      const diagnostics: Diagnostic[] = [
        {
          code: 'error.b',
          message: 'error at column 10',
          severity: 'error',
          location: {
            file: 'test.td',
            line: 1,
            column: 10,
            length: 1,
          },
        },
        {
          code: 'error.a',
          message: 'error at column 5',
          severity: 'error',
          location: {
            file: 'test.td',
            line: 1,
            column: 5,
            length: 1,
          },
        },
      ];

      const source = 'test line with errors';
      const output = formatErrors(diagnostics, source);

      const posA = output.indexOf('error at column 5');
      const posB = output.indexOf('error at column 10');
      expect(posA).toBeLessThan(posB);
    });

    test('groups errors by file', () => {
      const diagnostics: Diagnostic[] = [
        {
          code: 'error.fileB',
          message: 'error in file B',
          severity: 'error',
          location: {
            file: 'fileB.td',
            line: 1,
            column: 1,
            length: 1,
          },
        },
        {
          code: 'error.fileA',
          message: 'error in file A',
          severity: 'error',
          location: {
            file: 'fileA.td',
            line: 1,
            column: 1,
            length: 1,
          },
        },
      ];

      const source = 'test';
      const output = formatErrors(diagnostics, source);

      expect(output).toContain('fileA.td');
      expect(output).toContain('fileB.td');
      expect(output).toContain('error in file A');
      expect(output).toContain('error in file B');
    });

    test('handles empty diagnostics array', () => {
      const output = formatErrors([], 'test source');
      expect(output).toBe('');
    });

    test('handles diagnostics without locations', () => {
      const diagnostics: Diagnostic[] = [
        {
          code: 'error.noLocation',
          message: 'error without location',
          severity: 'error',
        },
      ];

      const output = formatErrors(diagnostics, '');
      expect(output).toContain('Error: error.noLocation');
      expect(output).toContain('error without location');
    });

    test('formats mix of errors and warnings', () => {
      const diagnostics: Diagnostic[] = [
        {
          code: 'error.critical',
          message: 'critical error',
          severity: 'error',
          location: {
            file: 'test.td',
            line: 1,
            column: 1,
            length: 4,
          },
        },
        {
          code: 'warning.minor',
          message: 'minor warning',
          severity: 'warning',
          location: {
            file: 'test.td',
            line: 2,
            column: 1,
            length: 4,
          },
        },
      ];

      const source = 'line1\nline2';
      const output = formatErrors(diagnostics, source);

      expect(output).toContain('Error: error.critical');
      expect(output).toContain('Warning: warning.minor');
    });
  });

  describe('helper functions', () => {
    test('getSourceLine extracts correct line', () => {
      // This will be a private function, but we test through formatError
      const diagnostic: Diagnostic = {
        code: 'test',
        message: 'test',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 2,
          column: 1,
          length: 6,
        },
      };

      const source = 'first line\nsecond line\nthird line';
      const output = formatError(diagnostic, source);

      expect(output).toContain('second line');
      expect(output).not.toContain('first line');
      expect(output).not.toContain('third line');
    });

    test('generatePointer creates correct alignment', () => {
      // Test through formatError with various column positions
      const makeDiagnostic = (column: number, length: number): Diagnostic => ({
        code: 'test',
        message: 'test',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 1,
          column,
          length,
        },
      });

      const source = '0123456789';

      // Column 1, length 3 - should start immediately after "| "
      const output1 = formatError(makeDiagnostic(1, 3), source);
      expect(output1).toContain('^^^');
      expect(output1).toMatch(/\|\s+\^\^\^/); // At least 1 space before ^^^

      // Column 5, length 2 - should have 4 spaces after "| " then ^^
      const output5 = formatError(makeDiagnostic(5, 2), source);
      expect(output5).toContain('^^');
      expect(output5).toMatch(/\|\s{5}\^\^/); // 1 space (format) + 4 spaces (alignment) = 5
    });
  });

  describe('terminal width handling', () => {
    test('handles long lines gracefully', () => {
      const diagnostic: Diagnostic = {
        code: 'test.longline',
        message: 'error in long line',
        severity: 'error',
        location: {
          file: 'test.td',
          line: 1,
          column: 1,
          length: 5,
        },
      };

      // Very long line (150+ characters)
      const longLine = 'a'.repeat(150);
      const output = formatError(diagnostic, longLine);

      expect(output).toContain('Error: test.longline');
      // Should either wrap, truncate, or display the line
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
