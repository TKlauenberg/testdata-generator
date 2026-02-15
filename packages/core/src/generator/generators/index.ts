import {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  type GeneratorFunction,
  type GeneratorRegistry,
} from './primitives';

import { uuid, sequential, nanoid } from './identity';
import { firstName, lastName, fullName, email, phoneNumber } from './personal';
import { date, timestamp, dateRange, time, datetime } from './temporal';
import { word, words, sentence, paragraph } from './text';
import type { RNG } from '../rng';

/**
 * Wrapper for sequential generator to make it compatible with GeneratorFunction signature.
 *
 * WARNING: This creates a new generator instance on each call, which means state
 * is NOT preserved across calls. This is a temporary solution until the generator
 * engine adds special handling for stateful generators.
 *
 * For proper stateful behavior, use sequential() directly in programmatic API,
 * not through the registry/DSL.
 *
 * @param _rng - Unused, sequential doesn't use RNG
 * @param start - Starting value for the sequence (defaults to 1)
 * @returns The next value in the sequence
 */
function sequentialWrapper(_rng: RNG, start: number = 1): number {
  // WARNING: This creates a new generator each time, losing state.
  // This is incompatible with how sequential is meant to work.
  const gen = sequential(start);
  return gen();
}

/**
 * Generator registry with name mappings and aliases
 *
 * Maps generator names (and their aliases) to generator functions for dynamic lookup.
 * Used by the generator engine to resolve generator names from DSL schemas.
 *
 * Note: Sequential generator has a different signature - it returns a stateful function
 * rather than a value directly. Special handling may be needed when using it from DSL.
 */
export const GENERATOR_REGISTRY: GeneratorRegistry = new Map<
  string,
  GeneratorFunction
>([
  // Primitive generators
  ['int', randomInt as GeneratorFunction],
  ['integer', randomInt as GeneratorFunction],
  ['float', randomFloat as GeneratorFunction],
  ['double', randomFloat as GeneratorFunction],
  ['number', randomFloat as GeneratorFunction],
  ['string', randomString as GeneratorFunction],
  ['text', randomString as GeneratorFunction],
  ['bool', randomBoolean as GeneratorFunction],
  ['boolean', randomBoolean as GeneratorFunction],
  // Identity generators
  ['uuid', uuid as GeneratorFunction],
  ['nanoid', nanoid as GeneratorFunction],
  // Note: sequential uses wrapper due to stateful nature (see warning above)
  ['sequential', sequentialWrapper as GeneratorFunction],
  // Personal data generators
  ['firstName', firstName as GeneratorFunction],
  ['first', firstName as GeneratorFunction],
  ['lastName', lastName as GeneratorFunction],
  ['last', lastName as GeneratorFunction],
  ['fullName', fullName as GeneratorFunction],
  ['name', fullName as GeneratorFunction],
  ['email', email as GeneratorFunction],
  ['phoneNumber', phoneNumber as GeneratorFunction],
  ['phone', phoneNumber as GeneratorFunction],
  // Temporal generators
  ['date', date as GeneratorFunction],
  ['timestamp', timestamp as GeneratorFunction],
  ['dateRange', dateRange as GeneratorFunction],
  ['time', time as GeneratorFunction],
  ['datetime', datetime as GeneratorFunction],
  // Text generators
  ['word', word as GeneratorFunction],
  ['words', words as GeneratorFunction],
  ['sentence', sentence as GeneratorFunction],
  ['paragraph', paragraph as GeneratorFunction],
]);

// Export primitive generators
export {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  type GeneratorFunction,
  type GeneratorRegistry,
};

// Export identity generators
export { uuid, sequential, nanoid };

// Export personal generators
export { firstName, lastName, fullName, email, phoneNumber };

// Export temporal generators
export { date, timestamp, dateRange, time, datetime };

// Export text generators
export { word, words, sentence, paragraph };
