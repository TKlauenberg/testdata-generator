/**
 * Common Utilities Module
 *
 * Shared utilities used across the testdata-ai project.
 * Currently exports the Result type pattern for error handling.
 */

export type { Result } from './result';
export { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr } from './result';
