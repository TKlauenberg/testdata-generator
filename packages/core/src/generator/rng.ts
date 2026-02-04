/**
 * Random Number Generator (RNG) Module
 *
 * Implements Xoshiro256** PRNG algorithm for deterministic random number generation.
 *
 * References:
 * - https://prng.di.unimi.it/xoshiro256starstar.c
 * - "Scrambled Linear Pseudorandom Number Generators" by Blackman & Vigna
 *
 * @module generator/rng
 */

// Algorithm constants
const UINT64_MAX = 0xffffffffffffffffn; // Maximum 64-bit unsigned integer value
const TWO_POW_53 = 9007199254740992; // 2^53 - IEEE 754 double precision mantissa size
const SPLITMIX64_CONSTANT = 0x9e3779b97f4a7c15n; // Golden ratio for SplitMix64
const SPLITMIX64_MIX1 = 0xbf58476d1ce4e5b9n; // SplitMix64 mixing constant 1
const SPLITMIX64_MIX2 = 0x94d049bb133111ebn; // SplitMix64 mixing constant 2

// Xoshiro256** rotation and shift constants
const XOSHIRO_ROTATION_1 = 7; // First rotation constant
const XOSHIRO_ROTATION_2 = 45; // Second rotation constant
const XOSHIRO_SHIFT = 17; // Left shift constant
const XOSHIRO_MULTIPLIER_1 = 5n; // First multiplier
const XOSHIRO_MULTIPLIER_2 = 9n; // Second multiplier

// Bit manipulation constants
const BITS_32 = 32n; // Used for extracting upper 32 bits
const BITS_11 = 11n; // Used for extracting upper 53 bits
const BITS_64 = 64n; // Total bits in UINT64

/**
 * Random Number Generator interface
 *
 * Provides deterministic pseudo-random number generation with a seeded PRNG.
 */
export interface RNG {
  /**
   * Generate a 32-bit unsigned integer
   * @returns Random integer in range [0, 2^32)
   */
  nextInt(): number;

  /**
   * Generate a floating-point number in [0, 1)
   * @returns Random float with IEEE 754 double precision
   */
  nextFloat(): number;

  /**
   * Generate an integer within specified range (inclusive)
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range [min, max]
   */
  nextIntRange(min: number, max: number): number;

  /**
   * Generate a floating-point number within specified range
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float in range [min, max)
   */
  nextFloatRange(min: number, max: number): number;
}

/**
 * Xoshiro256** PRNG Implementation
 *
 * Internal class implementing the Xoshiro256** algorithm.
 * Use createRNG() factory function instead of direct instantiation.
 */
class Xoshiro256StarStar implements RNG {
  private _state: BigUint64Array;

  /**
   * Initialize PRNG with seed using SplitMix64
   * @param seed - 64-bit seed value
   */
  constructor(seed: bigint) {
    this._state = new BigUint64Array(4);
    this._initializeState(seed);
  }

  /**
   * Initialize state using SplitMix64 algorithm
   * @param seed - Initial seed value
   */
  private _initializeState(seed: bigint): void {
    let s = seed;
    for (let i = 0; i < 4; i++) {
      s = (s + SPLITMIX64_CONSTANT) & UINT64_MAX;
      let z = s;
      z = ((z ^ (z >> 30n)) * SPLITMIX64_MIX1) & UINT64_MAX;
      z = ((z ^ (z >> 27n)) * SPLITMIX64_MIX2) & UINT64_MAX;
      this._state[i] = (z ^ (z >> 31n)) & UINT64_MAX;
    }
  }

  /**
   * Rotate left operation for 64-bit values
   * @param x - Value to rotate
   * @param k - Number of bits to rotate
   * @returns Rotated value
   */
  private _rotl(x: bigint, k: number): bigint {
    const kb = BigInt(k);
    return ((x << kb) | (x >> (BITS_64 - kb))) & UINT64_MAX;
  }

  /**
   * Generate next 64-bit value using Xoshiro256** algorithm
   * @returns 64-bit unsigned integer as bigint
   */
  private _next(): bigint {
    const result = (this._rotl(this._state[1] * XOSHIRO_MULTIPLIER_1, XOSHIRO_ROTATION_1) * XOSHIRO_MULTIPLIER_2) & UINT64_MAX;
    const t = (this._state[1] << BigInt(XOSHIRO_SHIFT)) & UINT64_MAX;

    this._state[2] ^= this._state[0];
    this._state[3] ^= this._state[1];
    this._state[1] ^= this._state[2];
    this._state[0] ^= this._state[3];

    this._state[2] ^= t;
    this._state[3] = this._rotl(this._state[3], XOSHIRO_ROTATION_2);

    return result;
  }

  /**
   * Generate a 32-bit unsigned integer
   * @returns Random integer in range [0, 2^32)
   */
  nextInt(): number {
    const value = this._next();
    return Number(value >> BITS_32);
  }

  /**
   * Generate a floating-point number in [0, 1)
   *
   * Uses upper 53 bits for IEEE 754 double precision.
   * @returns Random float in range [0, 1)
   */
  nextFloat(): number {
    const value = this._next();
    const upper53 = Number(value >> BITS_11);
    return upper53 * (1.0 / TWO_POW_53);
  }

  /**
   * Generate an integer within specified range (inclusive)
   *
   * Uses rejection sampling to avoid modulo bias.
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range [min, max]
   * @throws {Error} If min > max, bounds are not finite, bounds are not integers, or range exceeds safe limits
   */
  nextIntRange(min: number, max: number): number {
    if (min > max) {
      throw new Error(`Invalid range: min (${min}) > max (${max})`);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error('Range bounds must be finite numbers');
    }
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('Range bounds must be integers');
    }

    if (min === max) {
      return min;
    }

    // Convert to BigInt before subtraction to avoid precision loss for large ranges
    const minBig = BigInt(min);
    const maxBig = BigInt(max);
    const range = maxBig - minBig + 1n;

    // Validate range is within safe limits (avoid infinite rejection sampling)
    if (range > UINT64_MAX) {
      throw new Error(
        `Range too large: max - min + 1 = ${range.toString()} exceeds maximum supported range (2^64)`,
      );
    }

    const limit = UINT64_MAX - (UINT64_MAX % range);

    let value: bigint;
    do {
      value = this._next();
    } while (value >= limit);

    return Number(minBig + (value % range));
  }

  /**
   * Generate a floating-point number within specified range
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float in range [min, max)
   * @throws {Error} If min > max or bounds are not finite
   */
  nextFloatRange(min: number, max: number): number {
    if (min > max) {
      throw new Error(`Invalid range: min (${min}) > max (${max})`);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error('Range bounds must be finite numbers');
    }

    const value = this.nextFloat();
    return min + value * (max - min);
  }
}

/**
 * Generate a default seed from current timestamp
 * @returns BigInt seed value
 */
function generateDefaultSeed(): bigint {
  return BigInt(Date.now());
}

/**
 * Create a seeded random number generator
 *
 * @param seed - Optional seed value. If omitted, uses current timestamp.
 * @returns RNG instance for deterministic random number generation
 * @throws {Error} If seed is NaN, Infinity, or not an integer
 *
 * @example
 * ```typescript
 * // Create RNG with explicit seed for reproducibility
 * const rng = createRNG(12345);
 * console.log(rng.nextFloat()); // Always the same for seed 12345
 *
 * // Create RNG with default seed (timestamp-based)
 * const rng2 = createRNG();
 * console.log(rng2.nextInt());
 * ```
 */
export function createRNG(seed?: number): RNG {
  let seedBigInt: bigint;

  if (seed === undefined) {
    seedBigInt = generateDefaultSeed();
  } else {
    // Validate seed before conversion to BigInt
    if (!Number.isFinite(seed)) {
      throw new Error(
        `Invalid seed: must be a finite number (received ${seed})`,
      );
    }
    if (!Number.isInteger(seed)) {
      throw new Error(
        `Invalid seed: must be an integer (received ${seed})`,
      );
    }
    seedBigInt = BigInt(seed);
  }

  return new Xoshiro256StarStar(seedBigInt);
}
