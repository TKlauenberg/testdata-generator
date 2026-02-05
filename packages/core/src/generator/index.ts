/**
 * Generator Module
 *
 * Provides deterministic data generation capabilities.
 *
 * @module generator
 */

export { createRNG, type RNG } from './rng';
export {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  GENERATOR_REGISTRY,
  type GeneratorFunction,
  type GeneratorRegistry,
} from './generators';
export { generateRecord, type GeneratedRecord } from './generator';
