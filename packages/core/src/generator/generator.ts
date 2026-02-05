/**
 * Generator Engine - Record Creation
 *
 * This module implements the core record generation engine that converts
 * validated schemas into actual test data records. It connects the validated
 * schema structure from the analyzer with primitive generators to produce
 * complete records with all fields populated.
 */

import type { RNG } from './rng';
import type { ValidatedSchema, ValidatedField } from '../analyzer/types';
import type { GeneratorParameter } from '../parser/ast';
import { GENERATOR_REGISTRY } from './generators';

/**
 * Generated record is a plain JavaScript object with field names as keys.
 * Values are generated according to their field types and parameters.
 */
export type GeneratedRecord = Record<string, unknown>;

/**
 * Generate a single record from a validated schema.
 *
 * CRITICAL: Pure function - same inputs always produce same output.
 * CRITICAL: Use provided RNG instance - do NOT create new RNG.
 * CRITICAL: Iterate fields in schema order for consistent output.
 *
 * @param schema - Validated schema with field definitions
 * @param rng - RNG instance for deterministic generation
 * @returns Plain JavaScript object with all fields populated
 *
 * @throws {Error} If unknown generator type encountered
 * @throws {Error} If generator invocation fails
 *
 * @example
 * ```typescript
 * const schema = analyzer.validate(program).schemas.get('User');
 * const rng = createRNG(12345);
 * const record = generateRecord(schema, rng);
 * // => { id: 42, name: "abc123def4", active: true }
 * ```
 */
export function generateRecord(
  schema: ValidatedSchema,
  rng: RNG
): GeneratedRecord {
  const record: GeneratedRecord = {};

  // Process each field in order (maintains consistent field ordering)
  for (const field of schema.fields) {
    const fieldName = field.node.name;

    try {
      // Generate value for this field
      const value = generateFieldValue(field, rng);

      // Assign to record
      record[fieldName] = value;
    } catch (error) {
      // Wrap any generation errors with field context
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate value for field '${fieldName}' ` +
          `using generator '${field.resolvedType}': ${message}`
      );
    }
  }

  return record;
}

/**
 * Generate a single field value using the appropriate generator.
 *
 * @param field - Validated field with type and parameter information
 * @param rng - RNG instance for generation
 * @returns Generated value for this field
 *
 * @throws {Error} If generator type is unknown
 */
function generateFieldValue(field: ValidatedField, rng: RNG): unknown {
  const generatorType = field.resolvedType;

  // Lookup generator by type
  const generator = GENERATOR_REGISTRY.get(generatorType);

  if (!generator) {
    throw new Error(
      `Unknown generator type '${generatorType}' for field '${field.node.name}'`
    );
  }

  // Extract parameters and invoke
  const params = extractParameters(field);
  return generator(rng, ...params);
}

/**
 * Extract generator parameters from field definition and convert to positional arguments.
 *
 * Different generators expect different parameter patterns:
 * - int/integer: (min, max)
 * - float/double/number: (min, max)
 * - string/text: (length, charset?)
 * - bool/boolean: no parameters
 *
 * @param field - Validated field with parameter information
 * @returns Array of positional parameters for generator function
 */
function extractParameters(field: ValidatedField): unknown[] {
  const params = field.node.generator?.parameters ?? [];

  switch (field.resolvedType) {
    case 'int':
    case 'integer': {
      // randomInt(rng, min, max)
      const min = findParam(params, 'min')?.value ?? 0;
      const max = findParam(params, 'max')?.value ?? 100;
      return [min, max];
    }

    case 'float':
    case 'double':
    case 'number': {
      // randomFloat(rng, min, max)
      const min = findParam(params, 'min')?.value ?? 0.0;
      const max = findParam(params, 'max')?.value ?? 1.0;
      return [min, max];
    }

    case 'string':
    case 'text': {
      // randomString(rng, length, charset?)
      const length = findParam(params, 'length')?.value ?? 10;
      const charset = findParam(params, 'charset')?.value;
      return charset ? [length, charset] : [length];
    }

    case 'bool':
    case 'boolean': {
      // randomBoolean(rng) - no parameters
      return [];
    }

    default:
      throw new Error(`Unsupported generator type: ${field.resolvedType}`);
  }
}

/**
 * Find a parameter by name in the parameter array.
 *
 * @param params - Array of generator parameters
 * @param name - Parameter name to search for
 * @returns Parameter if found, undefined otherwise
 */
function findParam(
  params: readonly GeneratorParameter[],
  name: string
): GeneratorParameter | undefined {
  return params.find((p) => p.name === name);
}
