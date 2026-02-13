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
  // Note: sequential has different signature, may need special handling
  ['sequential', sequential as GeneratorFunction],
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
