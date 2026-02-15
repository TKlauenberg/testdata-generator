import type { RNG } from '../rng';

/**
 * Selection Generators
 *
 * Provides functions for selecting values from arrays with various strategies:
 * - pick: Uniform random selection from an array
 * - weightedPick: Weighted random selection based on probability weights
 */

/**
 * Option for weighted selection
 */
export interface WeightedOption<T = unknown> {
  value: T;
  weight: number;
}

/**
 * Randomly selects an element from an array with uniform distribution.
 *
 * @param rng - Random number generator for deterministic selection
 * @param array - Array of elements to select from
 * @returns Randomly selected element from the array
 * @throws Error if array is empty
 *
 * @example
 * const rng = createRNG(42);
 * const status = pick(rng, ['active', 'inactive', 'pending']);
 * // Returns one of the status values with equal probability
 */
export function pick<T>(rng: RNG, array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from an empty array');
  }

  const index = rng.nextIntRange(0, array.length - 1);
  return array[index];
}

/**
 * Randomly selects a value from weighted options based on probability weights.
 * Higher weights increase the probability of selection.
 *
 * @param rng - Random number generator for deterministic selection
 * @param options - Array of weighted options
 * @returns Selected value based on weight probability
 * @throws Error if options array is empty
 * @throws Error if any weight is not a positive number
 *
 * @example
 * const rng = createRNG(42);
 * const status = weightedPick(rng, [
 *   { value: 'active', weight: 70 },
 *   { value: 'inactive', weight: 20 },
 *   { value: 'suspended', weight: 10 }
 * ]);
 * // Returns 'active' 70% of the time, 'inactive' 20%, 'suspended' 10%
 */
export function weightedPick<T>(rng: RNG, options: WeightedOption<T>[]): T {
  if (options.length === 0) {
    throw new Error('Cannot pick from an empty options array');
  }

  // Validate all weights are positive numbers
  for (const option of options) {
    if (typeof option.weight !== 'number' || option.weight <= 0 || !Number.isFinite(option.weight)) {
      throw new Error('All weights must be positive numbers');
    }
  }

  // Calculate total weight
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);

  // Generate random value in [0, totalWeight)
  const random = rng.nextFloat() * totalWeight;

  // Find the corresponding value using cumulative distribution
  let cumulativeWeight = 0;
  for (const option of options) {
    cumulativeWeight += option.weight;
    if (random < cumulativeWeight) {
      return option.value;
    }
  }

  // Fallback for floating-point edge cases (should never reach here)
  return options[options.length - 1].value;
}
