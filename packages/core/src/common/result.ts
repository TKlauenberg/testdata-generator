/**
 * Result<T, E> Type Pattern for Error Handling
 *
 * Provides a discriminated union type for handling expected errors explicitly
 * without throwing exceptions. Follows Rust's Result pattern with TypeScript
 * type narrowing support.
 *
 * @example
 * ```typescript
 * // Creating results
 * const success = ok(42);
 * const failure = err(['Parse error at line 5']);
 *
 * // Pattern matching with exhaustive checking
 * if (success.ok) {
 *   console.log(success.value); // TypeScript knows: value is number
 * } else {
 *   console.error(success.errors); // Never reached
 * }
 *
 * // Functional transformation
 * const doubled = map(success, (x) => x * 2);
 * ```
 */

/**
 * Discriminated union representing either a successful result with a value,
 * or an error result with error information.
 *
 * The `ok` property serves as the discriminator for TypeScript's type narrowing.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: E };

/**
 * Creates a successful Result with the given value.
 *
 * @param value - The success value
 * @returns A Result with ok=true containing the value
 *
 * @example
 * ```typescript
 * const result = ok(42);
 * // { ok: true, value: 42 }
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates an error Result with the given error information.
 *
 * @param errors - The error information (typically Diagnostic[] or string[])
 * @returns A Result with ok=false containing the errors
 *
 * @example
 * ```typescript
 * const result = err(['Invalid syntax']);
 * // { ok: false, errors: ['Invalid syntax'] }
 * ```
 */
export function err<E>(errors: E): Result<never, E> {
  return { ok: false, errors };
}

/**
 * Type guard that narrows a Result to its success variant.
 *
 * @param result - The Result to check
 * @returns true if the Result is successful
 *
 * @example
 * ```typescript
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows this is valid
 * }
 * ```
 */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/**
 * Type guard that narrows a Result to its error variant.
 *
 * @param result - The Result to check
 * @returns true if the Result is an error
 *
 * @example
 * ```typescript
 * if (isErr(result)) {
 *   console.error(result.errors); // TypeScript knows this is valid
 * }
 * ```
 */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly errors: E } {
  return !result.ok;
}

/**
 * Extracts the value from a successful Result, or throws if the Result is an error.
 *
 * ⚠️ Use with caution - prefer pattern matching or unwrapOr() for safer handling.
 *
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws Error if the Result is an error
 *
 * @example
 * ```typescript
 * const result = ok(42);
 * const value = unwrap(result); // 42
 *
 * const errorResult = err(['failed']);
 * unwrap(errorResult); // throws Error
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw new Error(`Called unwrap on error Result: ${JSON.stringify(result.errors)}`);
}

/**
 * Extracts the value from a successful Result, or returns a default value if error.
 *
 * This is the safe alternative to unwrap() that never throws.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The value to return if Result is an error
 * @returns The success value or default value
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * unwrapOr(success, 0); // 42
 *
 * const failure = err(['error']);
 * unwrapOr(failure, 0); // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Maps a Result<T, E> to Result<U, E> by applying a function to the success value.
 *
 * If the Result is an error, the function is not called and the error is passed through.
 *
 * @param result - The Result to transform
 * @param fn - The transformation function
 * @returns A new Result with the transformed value or original error
 *
 * @example
 * ```typescript
 * const result = ok(10);
 * const doubled = map(result, (x) => x * 2);
 * // { ok: true, value: 20 }
 *
 * const errorResult = err(['failed']);
 * const mapped = map(errorResult, (x) => x * 2);
 * // { ok: false, errors: ['failed'] }
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Maps a Result<T, E> to Result<T, F> by applying a function to the error value.
 *
 * If the Result is successful, the function is not called and the value is passed through.
 *
 * @param result - The Result to transform
 * @param fn - The error transformation function
 * @returns A new Result with the original value or transformed error
 *
 * @example
 * ```typescript
 * const errorResult = err('simple error');
 * const mapped = mapErr(errorResult, (e) => [e]);
 * // { ok: false, errors: ['simple error'] }
 *
 * const success = ok(42);
 * const unchanged = mapErr(success, (e) => [e]);
 * // { ok: true, value: 42 }
 * ```
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (errors: E) => F): Result<T, F> {
  return result.ok ? result : err(fn(result.errors));
}
