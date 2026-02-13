import type { RNG } from '../rng';

/**
 * Character set constants for string generation
 */
export const CHARSET_ALPHA =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CHARSET_NUMERIC = '0123456789';
export const CHARSET_ALPHANUMERIC = CHARSET_ALPHA + CHARSET_NUMERIC;

/**
 * Generator function type - all generators follow this signature pattern
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GeneratorFunction<T = unknown> = (rng: RNG, ...params: any[]) => T;

/**
 * Generator registry maps generator names to functions for dynamic lookup
 */
export type GeneratorRegistry = Map<string, GeneratorFunction>;

/**
 * Generate random integer in [min, max] inclusive range
 *
 * CRITICAL: Delegate to rng.nextIntRange - do NOT reimplement
 *
 * @param rng - RNG instance
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Integer in [min, max]
 */
export function randomInt(rng: RNG, min: number, max: number): number {
  // Validate parameters
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers');
  }
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('Range bounds must be integers');
  }

  // Delegate to RNG - it handles rejection sampling correctly
  return rng.nextIntRange(min, max);
}

/**
 * Generate random float in [min, max) range
 *
 * CRITICAL: Delegate to rng.nextFloatRange
 *
 * @param rng - RNG instance
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Float in [min, max)
 */
export function randomFloat(rng: RNG, min: number, max: number): number {
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers');
  }

  return rng.nextFloatRange(min, max);
}

/**
 * Generate random boolean with 50/50 distribution
 *
 * @param rng - RNG instance
 * @returns true or false with equal probability
 */
export function randomBoolean(rng: RNG): boolean {
  return rng.nextFloat() < 0.5;
}

/**
 * Generate random string of specified length from character set
 *
 * CRITICAL: Use rng.nextIntRange for character selection (no modulo bias)
 * EFFICIENT: Build with array and join, not repeated concatenation
 *
 * @param rng - RNG instance
 * @param length - Desired string length (must be non-negative integer)
 * @param charset - Character set to use (default: CHARSET_ALPHANUMERIC)
 * @returns Random string of specified length
 */
export function randomString(
  rng: RNG,
  length: number,
  charset: string = CHARSET_ALPHANUMERIC,
): string {
  // Validate parameters
  if (length < 0 || !Number.isInteger(length)) {
    throw new Error(
      `Invalid length: ${length} (must be a non-negative integer: 0 or greater)`,
    );
  }
  if (charset.length === 0) {
    throw new Error('Character set cannot be empty');
  }

  // Edge case: zero length
  if (length === 0) return '';

  // Build string efficiently using Array.from
  const chars = Array.from({ length }, () => {
    const index = rng.nextIntRange(0, charset.length - 1);
    return charset[index];
  });

  return chars.join('');
}
