/**
 * Public API for generating test data from DSL schemas.
 *
 * This module provides the main entry point for QA testers and developers
 * to generate test data. It combines validation and generation into a single
 * simple API call.
 *
 * @module generateData
 */

import { validateSchema } from './validate';
import { generate, type GenerateOptions } from './generator';
import type { Diagnostic } from './common/diagnostic';

/**
 * ValidationError is thrown when schema validation fails.
 *
 * Contains detailed diagnostic information about what went wrong,
 * including error locations in the source code.
 */
export class ValidationError extends Error {
  public readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

    super(
      `Schema validation failed: ${errorCount} error(s), ${warningCount} warning(s)`
    );

    this.name = 'ValidationError';
    this.diagnostics = diagnostics;

    // Maintain proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Generate test data from DSL schema source code.
 *
 * This is the main public API for data generation. It validates the schema
 * first and throws ValidationError if invalid. If valid, it returns an
 * AsyncIterable that yields generated records one at a time.
 *
 * **Usage Pattern:**
 * ```typescript
 * try {
 *   for await (const record of generateData(source, { count: 1000, seed: 42 })) {
 *     console.log(record);
 *   }
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     // Handle validation errors
 *     error.diagnostics.forEach(d => console.error(d.message));
 *   }
 * }
 * ```
 *
 * **Key Features:**
 * - Validates schema before generation (fail fast)
 * - Streams records lazily (memory efficient)
 * - Deterministic with seed parameter
 * - Clear error messages for validation failures
 *
 * **Performance:**
 * - 1000 records: < 60 seconds on standard hardware
 * - 100k+ records: Constant memory usage (streaming)
 *
 * @param source - DSL schema source code (string)
 * @param options - Generation options (count, seed)
 * @returns AsyncIterable yielding generated records
 * @throws {ValidationError} if schema is invalid (syntax or semantic errors)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const schema = `
 *   schema User {
 *     id: int @generate(randomInt, min: 1, max: 1000)
 *     name: string @generate(randomString, length: 10)
 *   }
 * `;
 *
 * for await (const record of generateData(schema, { count: 10 })) {
 *   console.log(record);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Deterministic generation
 * for await (const record of generateData(schema, { count: 10, seed: 42 })) {
 *   // Same seed always produces same data
 *   console.log(record);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   for await (const record of generateData(invalidSchema, { count: 10 })) {
 *     console.log(record);
 *   }
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:');
 *     error.diagnostics.forEach(d => {
 *       console.error(`  ${d.kind}: ${d.message} at ${d.location.line}:${d.location.column}`);
 *     });
 *   }
 * }
 * ```
 */
export async function* generateData(
  source: string,
  options: GenerateOptions
): AsyncIterable<Record<string, unknown>> {
  // Step 1: Validate schema FIRST (fail fast on invalid input)
  // This ensures we never start generating invalid data
  const validationResult = validateSchema(source, 'inline-schema.td');

  if (!validationResult.ok) {
    // Validation failed - throw immediately before any generation
    throw new ValidationError(validationResult.errors);
  }

  // Step 2: Schema is valid - pass to generate() for streaming
  // The ValidatedProgram ensures all types and generators are correct
  // The seed parameter flows through options to generate() -> createRNG()
  yield* generate(validationResult.value, options);
}
