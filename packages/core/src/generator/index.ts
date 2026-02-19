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
  uuid,
  sequential,
  nanoid,
} from './generators';
export { generateRecord, type GeneratedRecord, generate, type GenerateOptions } from './generator';
export { evaluateTemplate } from './template';
export { UniquenessTracker } from './uniqueness';
