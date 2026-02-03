/**
 * End-to-end validation module
 *
 * Provides the public API for validating DSL schema files.
 * Chains scanner → parser → analyzer pipeline and returns
 * either a ValidatedProgram or accumulated errors.
 *
 * @module validate
 */

import { Scanner } from './scanner/scanner';
import { Parser } from './parser/parser';
import { analyze } from './analyzer/analyzer';
import type { Result } from './common/result';
import type { Diagnostic } from './common/diagnostic';
import type { ValidatedProgram } from './analyzer/types';

/**
 * Validates a DSL schema source file.
 *
 * Executes the complete validation pipeline:
 * 1. Scanner: Lexical analysis (source → tokens)
 * 2. Parser: Syntax analysis (tokens → AST)
 * 3. Analyzer: Semantic analysis (AST → ValidatedProgram)
 *
 * Errors from all phases are collected and sorted by location.
 *
 * @param source - The DSL source code to validate
 * @param filename - The filename for error reporting (e.g., "schema.td")
 * @returns Result containing ValidatedProgram on success, or sorted errors on failure
 *
 * @example
 * ```typescript
 * const source = `schema User { id: uuid, name: string }`;
 * const result = validateSchema(source, 'user-schema.td');
 *
 * if (result.ok) {
 *   // Success: Access validated program
 *   const schemaCount = result.value.schemas.size;
 * } else {
 *   // Failure: Handle errors
 *   result.errors.forEach(err => console.error(err.message));
 * }
 * ```
 */
export function validateSchema(
  source: string,
  filename: string
): Result<ValidatedProgram, Diagnostic[]> {
  // Phase 1: Lexical Analysis
  const scanner = new Scanner(source, filename);
  const scanResult = scanner.scan();

  if (!scanResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(scanResult.errors),
    };
  }

  // Phase 2: Syntax Analysis
  const parser = new Parser(scanResult.value);
  const parseResult = parser.parse();

  if (!parseResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(parseResult.errors),
    };
  }

  // Phase 3: Semantic Analysis
  const analysisResult = analyze(parseResult.value);

  if (!analysisResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(analysisResult.errors),
    };
  }

  // Success: Return validated program
  return {
    ok: true,
    value: analysisResult.value,
  };
}

/**
 * Sorts diagnostics by file location (line, then column).
 *
 * Ensures errors are presented in source order for better UX.
 * Diagnostics without location are placed at the end.
 *
 * @param diagnostics - Unsorted diagnostic array
 * @returns New array with diagnostics sorted by location
 */
function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    // Handle missing locations
    if (!a.location) return 1;
    if (!b.location) return -1;

    // Sort by file (for future multi-file support)
    if (a.location.file !== b.location.file) {
      return a.location.file.localeCompare(b.location.file);
    }

    // Sort by line number
    if (a.location.line !== b.location.line) {
      return a.location.line - b.location.line;
    }

    // Sort by column number
    if (a.location.column !== b.location.column) {
      return a.location.column - b.location.column;
    }

    // Stable sort for same location
    return 0;
  });
}
