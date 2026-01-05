/**
 * Diagnostic System for Error Reporting
 *
 * Provides types and factory functions for creating diagnostics with source locations.
 * Used throughout the compilation pipeline (scanner, parser, analyzer) to report errors,
 * warnings, and informational messages to users.
 *
 * Line and column numbers are 1-indexed to match standard editor conventions.
 */

/**
 * Source location information for diagnostics.
 *
 * **IMPORTANT:** Line and column numbers are 1-indexed, not 0-indexed.
 * The first line of a file is line 1, and the first column is column 1.
 * This matches standard editor conventions and user expectations.
 *
 * @example
 * ```typescript
 * const location: SourceLocation = {
 *   file: 'schema.td',
 *   line: 1,    // First line is 1, not 0
 *   column: 5,  // Fifth character is 5, not 4
 *   length: 10  // Number of characters highlighted
 * };
 * ```
 */
export interface SourceLocation {
  /** Path to the source file (relative or absolute) */
  readonly file: string;

  /** Line number (1-indexed) - first line is 1 */
  readonly line: number;

  /** Column number (1-indexed) - first column is 1 */
  readonly column: number;

  /** Length of the source span in characters */
  readonly length: number;
}

/**
 * Severity level for diagnostics.
 *
 * - `error`: Blocks compilation, must be fixed
 * - `warning`: Shown to user but doesn't block compilation
 * - `info`: Informational message or helpful suggestion
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Diagnostic message with source location and optional suggestions.
 *
 * Diagnostics are created during compilation phases (scanner, parser, analyzer)
 * and collected in Result<T, Diagnostic[]> error types.
 *
 * Error codes follow the pattern: `phase.errorType`
 * - Scanner errors: `scanner.unterminatedString`, `scanner.invalidCharacter`
 * - Parser errors: `parser.unexpectedToken`, `parser.expectedToken`
 * - Analyzer errors: `analyzer.undefinedReference`, `analyzer.typeMismatch`
 *
 * @example
 * ```typescript
 * const diagnostic: Diagnostic = {
 *   code: 'scanner.unterminatedString',
 *   message: 'Unterminated string literal',
 *   severity: 'error',
 *   location: { file: 'test.td', line: 5, column: 10, length: 8 },
 *   suggestion: 'Add closing quote (") at the end of the string'
 * };
 * ```
 */
export interface Diagnostic {
  /** Error code following phase.errorType convention (e.g., 'scanner.unterminatedString') */
  readonly code: string;

  /** Human-readable error message */
  readonly message: string;

  /** Severity level (error, warning, or info) */
  readonly severity: DiagnosticSeverity;

  /** Source location where the error occurred (optional for global errors) */
  readonly location?: SourceLocation;

  /** Optional suggestion for fixing the error */
  readonly suggestion?: string;

  /** Related diagnostics for providing additional context */
  readonly related?: readonly Diagnostic[];
}

/**
 * Options for creating a diagnostic.
 *
 * Used as input to the createDiagnostic() factory function.
 * All fields except location, suggestion, and related are required.
 *
 * @see createDiagnostic
 */
export interface CreateDiagnosticOptions {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly location?: SourceLocation;
  readonly suggestion?: string;
  readonly related?: readonly Diagnostic[];
}

/**
 * Creates a diagnostic with the specified properties.
 *
 * This is the base factory function for creating diagnostics.
 * Use the phase-specific factory functions for common error types.
 *
 * @param options - Diagnostic properties
 * @returns Immutable diagnostic object
 *
 * @example
 * ```typescript
 * const diagnostic = createDiagnostic({
 *   code: 'custom.error',
 *   message: 'Something went wrong',
 *   severity: 'error',
 *   location: { file: 'test.td', line: 1, column: 1, length: 5 }
 * });
 * ```
 */
export function createDiagnostic(options: CreateDiagnosticOptions): Diagnostic {
  return {
    code: options.code,
    message: options.message,
    severity: options.severity,
    location: options.location,
    suggestion: options.suggestion,
    related: options.related,
  };
}

// =============================================================================
// Scanner Diagnostic Factories
// =============================================================================

/**
 * Creates a diagnostic for an unterminated string literal.
 *
 * @param location - Source location of the unterminated string
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'scanner.unterminatedString'
 *
 * @example
 * ```typescript
 * const diag = unterminatedString(
 *   { file: 'test.td', line: 3, column: 15, length: 5 },
 *   'Add closing quote (") at the end of the string'
 * );
 * ```
 */
export function unterminatedString(
  location: SourceLocation,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'scanner.unterminatedString',
    message: 'Unterminated string literal',
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for an invalid character in the input.
 *
 * @param location - Source location of the invalid character
 * @param char - The invalid character
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'scanner.invalidCharacter'
 *
 * @example
 * ```typescript
 * const diag = invalidCharacter(
 *   { file: 'test.td', line: 5, column: 10, length: 1 },
 *   '@',
 *   'Remove this character or escape it in a string'
 * );
 * ```
 */
export function invalidCharacter(
  location: SourceLocation,
  char: string,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'scanner.invalidCharacter',
    message: `Invalid character: '${char}'`,
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for unexpected end of file during scanning.
 *
 * @param location - Source location where EOF was encountered
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'scanner.unexpectedEOF'
 *
 * @example
 * ```typescript
 * const diag = unexpectedEOF(
 *   { file: 'test.td', line: 10, column: 1, length: 0 },
 *   'Expected closing brace before end of file'
 * );
 * ```
 */
export function unexpectedEOF(
  location: SourceLocation,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'scanner.unexpectedEOF',
    message: 'Unexpected end of file',
    severity: 'error',
    location,
    suggestion,
  });
}

// =============================================================================
// Parser Diagnostic Factories
// =============================================================================

/**
 * Creates a diagnostic for an unexpected token during parsing.
 *
 * @param location - Source location of the unexpected token
 * @param found - The token that was found
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'parser.unexpectedToken'
 *
 * @example
 * ```typescript
 * const diag = unexpectedToken(
 *   { file: 'test.td', line: 5, column: 20, length: 1 },
 *   '}',
 *   'Remove this token or add statement before it'
 * );
 * ```
 */
export function unexpectedToken(
  location: SourceLocation,
  found: string,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'parser.unexpectedToken',
    message: `Unexpected token: '${found}'`,
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for a missing expected token during parsing.
 *
 * @param location - Source location where token was expected
 * @param expected - The token that was expected
 * @param found - The token that was actually found (optional)
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'parser.expectedToken'
 *
 * @example
 * ```typescript
 * const diag = expectedToken(
 *   { file: 'test.td', line: 5, column: 20, length: 1 },
 *   ';',
 *   undefined,
 *   "Add ';' at the end of this line"
 * );
 * ```
 */
export function expectedToken(
  location: SourceLocation,
  expected: string,
  found?: string,
  suggestion?: string,
): Diagnostic {
  const message = found
    ? `Expected '${expected}' but found '${found}'`
    : `Expected '${expected}'`;

  return createDiagnostic({
    code: 'parser.expectedToken',
    message,
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for a missing semicolon.
 *
 * @param location - Source location where semicolon should be
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'parser.missingSemicolon'
 *
 * @example
 * ```typescript
 * const diag = missingSemicolon(
 *   { file: 'test.td', line: 5, column: 20, length: 0 },
 *   "Add ';' at the end of this line"
 * );
 * ```
 */
export function missingSemicolon(
  location: SourceLocation,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'parser.missingSemicolon',
    message: 'Missing semicolon',
    severity: 'error',
    location,
    suggestion: suggestion ?? "Add ';' at the end of this line",
  });
}

// =============================================================================
// Analyzer Diagnostic Factories
// =============================================================================

/**
 * Creates a diagnostic for an undefined reference.
 *
 * @param location - Source location of the undefined reference
 * @param name - The name that was not found
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'analyzer.undefinedReference'
 *
 * @example
 * ```typescript
 * const diag = undefinedReference(
 *   { file: 'test.td', line: 10, column: 25, length: 8 },
 *   'fistName',
 *   "Did you mean 'firstName'?"
 * );
 * ```
 */
export function undefinedReference(
  location: SourceLocation,
  name: string,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'analyzer.undefinedReference',
    message: `Undefined reference: '${name}'`,
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for a type mismatch.
 *
 * @param location - Source location of the type mismatch
 * @param expected - The expected type
 * @param found - The actual type found
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'analyzer.typeMismatch'
 *
 * @example
 * ```typescript
 * const diag = typeMismatch(
 *   { file: 'test.td', line: 8, column: 12, length: 6 },
 *   'number',
 *   'string',
 *   'Convert this value to a number'
 * );
 * ```
 */
export function typeMismatch(
  location: SourceLocation,
  expected: string,
  found: string,
  suggestion?: string,
): Diagnostic {
  return createDiagnostic({
    code: 'analyzer.typeMismatch',
    message: `Type mismatch: expected '${expected}' but found '${found}'`,
    severity: 'error',
    location,
    suggestion,
  });
}

/**
 * Creates a diagnostic for a duplicate definition.
 *
 * @param location - Source location of the duplicate definition
 * @param name - The name that was duplicated
 * @param originalLocation - Location where it was first defined (for related diagnostic)
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Diagnostic with code 'analyzer.duplicateDefinition'
 *
 * @example
 * ```typescript
 * const diag = duplicateDefinition(
 *   { file: 'test.td', line: 15, column: 8, length: 4 },
 *   'User',
 *   { file: 'test.td', line: 3, column: 8, length: 4 },
 *   'Rename this schema or remove the duplicate'
 * );
 * ```
 */
export function duplicateDefinition(
  location: SourceLocation,
  name: string,
  originalLocation?: SourceLocation,
  suggestion?: string,
): Diagnostic {
  const related = originalLocation
    ? [
        createDiagnostic({
          code: 'analyzer.duplicateDefinition.note',
          message: `'${name}' was first defined here`,
          severity: 'info',
          location: originalLocation,
        }),
      ]
    : undefined;

  return createDiagnostic({
    code: 'analyzer.duplicateDefinition',
    message: `Duplicate definition: '${name}'`,
    severity: 'error',
    location,
    suggestion,
    related,
  });
}
