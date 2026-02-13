import type { RNG } from '../rng';

/**
 * NanoID character set (URL-safe, 64 characters)
 * Uses Base64 URL-safe alphabet: A-Z, a-z, 0-9, _, -
 */
const NANOID_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * Default NanoID length (21 characters)
 * Provides ~126 bits of entropy (21 × 6 bits per character)
 * Collision probability: ~1% after generating 1 billion IDs
 */
const NANOID_DEFAULT_LENGTH = 21;

/**
 * Generate RFC4122 v4 compliant UUID
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - Version nibble (4): Always `4`
 * - Variant nibble (y): Always `8`, `9`, `a`, or `b` (binary `10xx`)
 *
 * Uses 122 random bits with 4 version bits and 2 variant bits (total 128 bits).
 *
 * @param rng - RNG instance
 * @returns UUID string in RFC4122 v4 format
 *
 * @example
 * const rng = createRNG(42n);
 * const id = uuid(rng);
 * // => "a3bb189e-8bf9-4558-9962-e1b68e16f5b1"
 */
export function uuid(rng: RNG): string {
  // Generate 16 random bytes (128 bits)
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = rng.nextInt() & 0xff; // Get low 8 bits
  }

  // Set version bits (4 bits at byte 6, high nibble = 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4

  // Set variant bits (2 bits at byte 8, high 2 bits = 10)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx

  // Format as 8-4-4-4-12 hexadecimal string
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );

  return [
    hex.slice(0, 8), // First 8 chars
    hex.slice(8, 12), // Next 4 chars
    hex.slice(12, 16), // Next 4 chars
    hex.slice(16, 20), // Next 4 chars
    hex.slice(20, 32), // Final 12 chars
  ].join('-');
}

/**
 * Generate sequential incrementing integers starting from a specified value
 *
 * Returns a stateful function that maintains an internal counter.
 * Each call to the returned function increments and returns the current value.
 *
 * CRITICAL: This generator is unique - it returns a FUNCTION, not a value.
 * It also does NOT use RNG, making it deterministic without seeding.
 *
 * @param start - Starting value (default: 1)
 * @returns Function that generates incrementing integers
 *
 * @example
 * const idGen = sequential(1000);
 * idGen(); // => 1000
 * idGen(); // => 1001
 * idGen(); // => 1002
 *
 * @example
 * // Independent instances maintain separate state
 * const gen1 = sequential(10);
 * const gen2 = sequential(100);
 * gen1(); // => 10
 * gen2(); // => 100
 * gen1(); // => 11
 */
export function sequential(start: number = 1): () => number {
  // Validate start value
  if (!Number.isInteger(start)) {
    throw new Error('Sequential start must be an integer');
  }
  if (!Number.isSafeInteger(start)) {
    throw new Error('Sequential start must be a safe integer');
  }

  let current = start - 1; // Pre-decrement so first call returns start

  return (): number => {
    current++;

    // Safety check for integer overflow
    if (!Number.isSafeInteger(current)) {
      throw new Error('Sequential generator exceeded safe integer range');
    }

    return current;
  };
}

/**
 * Generate NanoID - short unique identifier with URL-safe characters
 *
 * Uses URL-safe Base64 alphabet (A-Za-z0-9_-) for 64-character set.
 * Default length of 21 characters provides ~126 bits of entropy.
 *
 * CRITICAL: Use rng.nextIntRange for unbiased character selection.
 *
 * @param rng - RNG instance
 * @param length - Desired string length (default: 21)
 * @returns NanoID string of specified length
 *
 * @example
 * const rng = createRNG(42n);
 * const id = nanoid(rng);
 * // => "V1StGXR8_Z5jdHi6B-myT" (21 chars)
 *
 * @example
 * const shortId = nanoid(rng, 10);
 * // => "V1StGXR8_Z" (10 chars)
 */
export function nanoid(rng: RNG, length: number = NANOID_DEFAULT_LENGTH): string {
  // Validate length
  if (length < 1 || !Number.isInteger(length)) {
    throw new Error('NanoID length must be a positive integer');
  }

  // Build string efficiently using Array.from pattern
  const chars = Array.from({ length }, () => {
    const index = rng.nextIntRange(0, NANOID_CHARSET.length - 1);
    return NANOID_CHARSET[index];
  });

  return chars.join('');
}
