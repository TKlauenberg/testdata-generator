/**
 * Unit tests for the Diagnostic system.
 *
 * Tests cover:
 * - SourceLocation creation with 1-indexed values
 * - Diagnostic creation with all required fields
 * - Factory functions for common error types
 * - Optional fields (suggestion, related diagnostics)
 * - Severity levels (error, warning, info)
 * - Immutability verification (compile-time check)
 */

import { describe, test, expect } from 'bun:test';
import {
  createDiagnostic,
  unterminatedString,
  invalidCharacter,
  unexpectedEOF,
  unexpectedToken,
  expectedToken,
  missingSemicolon,
  undefinedReference,
  typeMismatch,
  duplicateDefinition,
  type Diagnostic,
  type SourceLocation,
  type DiagnosticSeverity,
} from './diagnostic';

describe('SourceLocation', () => {
  test('creates location with 1-indexed line and column', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 5,
    };

    expect(location.file).toBe('test.td');
    expect(location.line).toBe(1);
    expect(location.column).toBe(1);
    expect(location.length).toBe(5);
  });

  test('supports multi-line locations', () => {
    const location: SourceLocation = {
      file: 'schema.td',
      line: 42,
      column: 15,
      length: 100,
    };

    expect(location.line).toBe(42);
    expect(location.column).toBe(15);
    expect(location.length).toBe(100);
  });

  test('accepts relative file paths', () => {
    const location: SourceLocation = {
      file: '../schemas/user.td',
      line: 10,
      column: 5,
      length: 8,
    };

    expect(location.file).toBe('../schemas/user.td');
  });

  test('accepts absolute file paths', () => {
    const location: SourceLocation = {
      file: '/home/user/project/schema.td',
      line: 1,
      column: 1,
      length: 1,
    };

    expect(location.file).toBe('/home/user/project/schema.td');
  });
});

describe('Diagnostic', () => {
  test('creates diagnostic with all required fields', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 5,
      column: 10,
      length: 8,
    };

    const diagnostic: Diagnostic = createDiagnostic({
      code: 'scanner.unterminatedString',
      message: 'Unterminated string literal',
      severity: 'error',
      location,
    });

    expect(diagnostic.code).toBe('scanner.unterminatedString');
    expect(diagnostic.message).toBe('Unterminated string literal');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.location).toEqual(location);
    expect(diagnostic.suggestion).toBeUndefined();
    expect(diagnostic.related).toBeUndefined();
  });

  test('creates diagnostic with suggestion', () => {
    const diagnostic = createDiagnostic({
      code: 'parser.missingSemicolon',
      message: 'Missing semicolon',
      severity: 'error',
      location: { file: 'test.td', line: 3, column: 20, length: 0 },
      suggestion: "Add ';' at the end of this line",
    });

    expect(diagnostic.suggestion).toBe("Add ';' at the end of this line");
  });

  test('creates diagnostic without location (global error)', () => {
    const diagnostic = createDiagnostic({
      code: 'system.outOfMemory',
      message: 'Out of memory',
      severity: 'error',
    });

    expect(diagnostic.code).toBe('system.outOfMemory');
    expect(diagnostic.location).toBeUndefined();
  });

  test('supports error severity', () => {
    const diagnostic = createDiagnostic({
      code: 'test.error',
      message: 'Test error',
      severity: 'error',
    });

    expect(diagnostic.severity).toBe('error');
  });

  test('supports warning severity', () => {
    const diagnostic = createDiagnostic({
      code: 'test.warning',
      message: 'Test warning',
      severity: 'warning',
    });

    expect(diagnostic.severity).toBe('warning');
  });

  test('supports info severity', () => {
    const diagnostic = createDiagnostic({
      code: 'test.info',
      message: 'Test info',
      severity: 'info',
    });

    expect(diagnostic.severity).toBe('info');
  });

  test('creates diagnostic with related diagnostics', () => {
    const originalLocation: SourceLocation = {
      file: 'test.td',
      line: 3,
      column: 8,
      length: 4,
    };

    const duplicateLocation: SourceLocation = {
      file: 'test.td',
      line: 15,
      column: 8,
      length: 4,
    };

    const relatedDiag = createDiagnostic({
      code: 'analyzer.duplicateDefinition.note',
      message: "Symbol 'User' was first defined here",
      severity: 'info',
      location: originalLocation,
    });

    const diagnostic = createDiagnostic({
      code: 'analyzer.duplicateDefinition',
      message: "Duplicate definition: 'User'",
      severity: 'error',
      location: duplicateLocation,
      related: [relatedDiag],
    });

    expect(diagnostic.related).toBeDefined();
    expect(diagnostic.related?.length).toBe(1);
    expect(diagnostic.related?.[0].message).toBe(
      "Symbol 'User' was first defined here",
    );
    expect(diagnostic.related?.[0].location).toEqual(originalLocation);
  });
});

describe('Scanner Diagnostic Factories', () => {
  describe('unterminatedString', () => {
    test('creates scanner.unterminatedString diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 3,
        column: 15,
        length: 5,
      };

      const diagnostic = unterminatedString(location);

      expect(diagnostic.code).toBe('scanner.unterminatedString');
      expect(diagnostic.message).toBe('Unterminated string literal');
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates unterminatedString diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 10,
        length: 8,
      };

      const diagnostic = unterminatedString(
        location,
        'Add closing quote (") at the end of the string',
      );

      expect(diagnostic.suggestion).toBe(
        'Add closing quote (") at the end of the string',
      );
    });
  });

  describe('invalidCharacter', () => {
    test('creates scanner.invalidCharacter diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 10,
        length: 1,
      };

      const diagnostic = invalidCharacter(location, '@');

      expect(diagnostic.code).toBe('scanner.invalidCharacter');
      expect(diagnostic.message).toBe("Invalid character: '@'");
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates invalidCharacter diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 2,
        column: 8,
        length: 1,
      };

      const diagnostic = invalidCharacter(
        location,
        '$',
        'Remove this character or escape it in a string',
      );

      expect(diagnostic.message).toBe("Invalid character: '$'");
      expect(diagnostic.suggestion).toBe(
        'Remove this character or escape it in a string',
      );
    });
  });

  describe('unexpectedEOF', () => {
    test('creates scanner.unexpectedEOF diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 10,
        column: 1,
        length: 0,
      };

      const diagnostic = unexpectedEOF(location);

      expect(diagnostic.code).toBe('scanner.unexpectedEOF');
      expect(diagnostic.message).toBe('Unexpected end of file');
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates unexpectedEOF diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 20,
        column: 1,
        length: 0,
      };

      const diagnostic = unexpectedEOF(
        location,
        'Expected closing brace before end of file',
      );

      expect(diagnostic.suggestion).toBe(
        'Expected closing brace before end of file',
      );
    });
  });
});

describe('Parser Diagnostic Factories', () => {
  describe('unexpectedToken', () => {
    test('creates parser.unexpectedToken diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 20,
        length: 1,
      };

      const diagnostic = unexpectedToken(location, '}');

      expect(diagnostic.code).toBe('parser.unexpectedToken');
      expect(diagnostic.message).toBe("Unexpected token: '}'");
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates unexpectedToken diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 8,
        column: 15,
        length: 2,
      };

      const diagnostic = unexpectedToken(
        location,
        '==',
        'Use single = for assignment',
      );

      expect(diagnostic.message).toBe("Unexpected token: '=='");
      expect(diagnostic.suggestion).toBe('Use single = for assignment');
    });
  });

  describe('expectedToken', () => {
    test('creates parser.expectedToken diagnostic without found token', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 20,
        length: 0,
      };

      const diagnostic = expectedToken(location, ';');

      expect(diagnostic.code).toBe('parser.expectedToken');
      expect(diagnostic.message).toBe("Expected ';'");
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates parser.expectedToken diagnostic with found token', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 20,
        length: 1,
      };

      const diagnostic = expectedToken(location, '{', '}');

      expect(diagnostic.message).toBe("Expected '{' but found '}'");
    });

    test('creates expectedToken diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 3,
        column: 15,
        length: 0,
      };

      const diagnostic = expectedToken(
        location,
        ';',
        undefined,
        "Add ';' at the end of this line",
      );

      expect(diagnostic.suggestion).toBe("Add ';' at the end of this line");
    });
  });

  describe('missingSemicolon', () => {
    test('creates parser.missingSemicolon diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 20,
        length: 0,
      };

      const diagnostic = missingSemicolon(location);

      expect(diagnostic.code).toBe('parser.missingSemicolon');
      expect(diagnostic.message).toBe('Missing semicolon');
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
      expect(diagnostic.suggestion).toBe("Add ';' at the end of this line");
    });

    test('creates missingSemicolon diagnostic with custom suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 8,
        column: 30,
        length: 0,
      };

      const diagnostic = missingSemicolon(
        location,
        'Terminate statement with semicolon',
      );

      expect(diagnostic.suggestion).toBe('Terminate statement with semicolon');
    });
  });
});

describe('Analyzer Diagnostic Factories', () => {
  describe('undefinedReference', () => {
    test('creates analyzer.undefinedReference diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 10,
        column: 25,
        length: 8,
      };

      const diagnostic = undefinedReference(location, 'fistName');

      expect(diagnostic.code).toBe('analyzer.undefinedReference');
      expect(diagnostic.message).toBe("Undefined reference: 'fistName'");
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates undefinedReference diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 12,
        column: 20,
        length: 10,
      };

      const diagnostic = undefinedReference(
        location,
        'usrName',
        "Did you mean 'userName'?",
      );

      expect(diagnostic.suggestion).toBe("Did you mean 'userName'?");
    });
  });

  describe('typeMismatch', () => {
    test('creates analyzer.typeMismatch diagnostic', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 8,
        column: 12,
        length: 6,
      };

      const diagnostic = typeMismatch(location, 'number', 'string');

      expect(diagnostic.code).toBe('analyzer.typeMismatch');
      expect(diagnostic.message).toBe(
        "Type mismatch: expected 'number' but found 'string'",
      );
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
    });

    test('creates typeMismatch diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 5,
        column: 15,
        length: 4,
      };

      const diagnostic = typeMismatch(
        location,
        'boolean',
        'number',
        'Convert this value to a boolean',
      );

      expect(diagnostic.suggestion).toBe('Convert this value to a boolean');
    });
  });

  describe('duplicateDefinition', () => {
    test('creates analyzer.duplicateDefinition diagnostic without original location', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 15,
        column: 8,
        length: 4,
      };

      const diagnostic = duplicateDefinition(location, 'User');

      expect(diagnostic.code).toBe('analyzer.duplicateDefinition');
      expect(diagnostic.message).toBe("Duplicate definition: 'User'");
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.location).toEqual(location);
      expect(diagnostic.related).toBeUndefined();
    });

    test('creates duplicateDefinition diagnostic with original location', () => {
      const originalLocation: SourceLocation = {
        file: 'test.td',
        line: 3,
        column: 8,
        length: 4,
      };

      const duplicateLocation: SourceLocation = {
        file: 'test.td',
        line: 15,
        column: 8,
        length: 4,
      };

      const diagnostic = duplicateDefinition(
        duplicateLocation,
        'User',
        originalLocation,
      );

      expect(diagnostic.related).toBeDefined();
      expect(diagnostic.related?.length).toBe(1);
      expect(diagnostic.related?.[0].code).toBe(
        'analyzer.duplicateDefinition.note',
      );
      expect(diagnostic.related?.[0].message).toBe(
        "'User' was first defined here",
      );
      expect(diagnostic.related?.[0].severity).toBe('info');
      expect(diagnostic.related?.[0].location).toEqual(originalLocation);
    });

    test('creates duplicateDefinition diagnostic with suggestion', () => {
      const location: SourceLocation = {
        file: 'test.td',
        line: 20,
        column: 10,
        length: 6,
      };

      const diagnostic = duplicateDefinition(
        location,
        'Schema',
        undefined,
        'Rename this schema or remove the duplicate',
      );

      expect(diagnostic.suggestion).toBe(
        'Rename this schema or remove the duplicate',
      );
    });
  });
});

describe('Error Code Conventions', () => {
  test('scanner errors follow phase.errorType pattern', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 1,
    };

    expect(unterminatedString(location).code).toBe(
      'scanner.unterminatedString',
    );
    expect(invalidCharacter(location, '@').code).toBe(
      'scanner.invalidCharacter',
    );
    expect(unexpectedEOF(location).code).toBe('scanner.unexpectedEOF');
  });

  test('parser errors follow phase.errorType pattern', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 1,
    };

    expect(unexpectedToken(location, '}').code).toBe('parser.unexpectedToken');
    expect(expectedToken(location, ';').code).toBe('parser.expectedToken');
    expect(missingSemicolon(location).code).toBe('parser.missingSemicolon');
  });

  test('analyzer errors follow phase.errorType pattern', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 1,
    };

    expect(undefinedReference(location, 'x').code).toBe(
      'analyzer.undefinedReference',
    );
    expect(typeMismatch(location, 'number', 'string').code).toBe(
      'analyzer.typeMismatch',
    );
    expect(duplicateDefinition(location, 'User').code).toBe(
      'analyzer.duplicateDefinition',
    );
  });
});

describe('Immutability', () => {
  test('diagnostic objects are readonly (compile-time check)', () => {
    const diagnostic = createDiagnostic({
      code: 'test.immutable',
      message: 'Test message',
      severity: 'error',
    });

    // TypeScript should prevent these assignments (compile-time check)
    // Uncomment these lines to verify TypeScript catches the errors:
    // diagnostic.code = 'changed';         // Should be a compile error
    // diagnostic.message = 'changed';      // Should be a compile error
    // diagnostic.severity = 'warning';     // Should be a compile error

    // Runtime verification that the object structure is as expected
    expect(diagnostic.code).toBe('test.immutable');
    expect(diagnostic.message).toBe('Test message');
    expect(diagnostic.severity).toBe('error');
  });

  test('source location is readonly (compile-time check)', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 5,
    };

    // TypeScript should prevent these assignments (compile-time check)
    // Uncomment these lines to verify TypeScript catches the errors:
    // location.file = 'changed';    // Should be a compile error
    // location.line = 999;          // Should be a compile error
    // location.column = 999;        // Should be a compile error
    // location.length = 999;        // Should be a compile error

    // Runtime verification that the object structure is as expected
    expect(location.file).toBe('test.td');
    expect(location.line).toBe(1);
  });

  test('related diagnostics array is readonly (compile-time check)', () => {
    const relatedDiag = createDiagnostic({
      code: 'test.related',
      message: 'Related message',
      severity: 'info',
    });

    const diagnostic = createDiagnostic({
      code: 'test.parent',
      message: 'Parent message',
      severity: 'error',
      related: [relatedDiag],
    });

    // TypeScript should prevent array mutations (compile-time check)
    // Uncomment these lines to verify TypeScript catches the errors:
    // diagnostic.related?.push(relatedDiag);  // Should be a compile error
    // diagnostic.related?.[0] = relatedDiag;  // Should be a compile error

    // Runtime verification that the array exists and has correct length
    expect(diagnostic.related?.length).toBe(1);
  });
});

describe('Integration with Result Type', () => {
  test('diagnostics can be collected in array for Result errors', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 5,
      column: 10,
      length: 8,
    };

    const diagnostics: Diagnostic[] = [
      unterminatedString(location),
      invalidCharacter({ file: 'test.td', line: 8, column: 5, length: 1 }, '@'),
      unexpectedEOF({ file: 'test.td', line: 10, column: 1, length: 0 }),
    ];

    expect(diagnostics.length).toBe(3);
    expect(diagnostics[0].code).toBe('scanner.unterminatedString');
    expect(diagnostics[1].code).toBe('scanner.invalidCharacter');
    expect(diagnostics[2].code).toBe('scanner.unexpectedEOF');
  });

  test('diagnostics work with Result<T, Diagnostic[]> pattern', () => {
    type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };

    function parseExample(input: string): Result<string, Diagnostic[]> {
      if (input.length === 0) {
        return {
          ok: false,
          errors: [
            createDiagnostic({
              code: 'parser.emptyInput',
              message: 'Input cannot be empty',
              severity: 'error',
            }),
          ],
        };
      }

      return { ok: true, value: input };
    }

    const errorResult = parseExample('');
    expect(errorResult.ok).toBe(false);
    if (!errorResult.ok) {
      expect(errorResult.errors.length).toBe(1);
      expect(errorResult.errors[0].code).toBe('parser.emptyInput');
    }

    const successResult = parseExample('valid');
    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.value).toBe('valid');
    }
  });
});
