/**
 * Generator Engine - Record Creation
 *
 * This module implements the core record generation engine that converts
 * validated schemas into actual test data records. It connects the validated
 * schema structure from the analyzer with primitive generators to produce
 * complete records with all fields populated.
 *
 * Also provides streaming generation capabilities through async generators
 * for memory-efficient creation of large datasets.
 */

import type { RNG } from './rng';
import { createRNG } from './rng';
import type { ValidatedSchema, ValidatedField, ValidatedProgram } from '../analyzer/types';
import type { GeneratorParameter } from '../parser/ast';
import { GENERATOR_REGISTRY } from './generators';
import { evaluateTemplate, hasTemplateReferences } from './template';

/**
 * Generated record is a plain JavaScript object with field names as keys.
 * Values are generated according to their field types and parameters.
 */
export type GeneratedRecord = Record<string, unknown>;

/**
 * Options for data generation.
 *
 * @property count - Number of records to generate per schema
 * @property seed - Optional seed for deterministic generation.
 *                  If omitted, generation is non-deterministic.
 */
export interface GenerateOptions {
  readonly count: number;
  readonly seed?: number;
}

/**
 * Generate test data records from validated program using streaming.
 *
 * This is an async generator function that yields records one at a time.
 * Records are generated lazily, so memory usage remains constant regardless
 * of count value.
 *
 * CRITICAL: This is an ASYNC GENERATOR - use for-await-of to consume
 * CRITICAL: Do NOT buffer results in array - defeats streaming purpose
 * CRITICAL: Use same RNG instance throughout - do NOT create new RNG per record
 *
 * NOTE: Marked async for future extensibility (e.g., database lookups, API calls)
 * even though current implementation is synchronous. This maintains consistent
 * API for consumers and allows future enhancements without breaking changes.
 *
 * @param program - Validated program with one or more schemas
 * @param options - Generation options (count, seed)
 * @returns AsyncIterable that yields records one at a time
 *
 * @example
 * ```typescript
 * // Generate 1000 records
 * for await (const record of generate(program, { count: 1000 })) {
 *   console.log(record);  // Process each record as it's generated
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Deterministic generation
 * const records1 = [];
 * for await (const record of generate(program, { count: 10, seed: 99 })) {
 *   records1.push(record);
 * }
 * const records2 = [];
 * for await (const record of generate(program, { count: 10, seed: 99 })) {
 *   records2.push(record);
 * }
 * // records1 === records2 (identical data)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function* generate(
  program: ValidatedProgram,
  options: GenerateOptions
): AsyncIterable<GeneratedRecord> {
  // Step 1: Create RNG ONCE for entire generation session
  // CRITICAL: Same RNG instance used for all records ensures determinism
  const rng = createRNG(options.seed);

  // Step 2: Iterate through each schema in the program
  // ValidatedProgram contains multiple schemas in a Map
  for (const schema of program.schemas.values()) {
    // Step 3: Generate count records for this schema
    for (let i = 0; i < options.count; i++) {
      // Step 4: Generate single record using generateRecord
      // This is where all field generation happens
      const record = generateRecord(schema, rng);

      // Step 5: Yield immediately - lazy evaluation!
      // Record is produced and consumed before next record is generated
      // This is what makes it memory-efficient
      yield record;
    }
  }
}

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
      const value = generateFieldValue(field, rng, record);

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
function generateFieldValue(
  field: ValidatedField,
  rng: RNG,
  context: GeneratedRecord,
): unknown {
  const generatorType = field.resolvedGenerator ?? field.resolvedType;

  // Lookup generator by type
  const generator = GENERATOR_REGISTRY.get(generatorType);

  if (!generator) {
    throw new Error(
      `Unknown generator type '${generatorType}' for field '${field.node.name}'`
    );
  }

  // Extract parameters and invoke
  const params = extractParameters(field, generatorType, context);
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
function extractParameters(
  field: ValidatedField,
  generatorType: string,
  context: GeneratedRecord,
): unknown[] {
  const params = field.node.generator?.parameters ?? [];

  const resolvedParams = params.map((parameter) => ({
    ...parameter,
    value: resolveTemplateValue(parameter.value, context),
  }));

  switch (generatorType) {
    case 'int':
    case 'integer': {
      // randomInt(rng, min, max)
      const min = findParam(resolvedParams, 'min')?.value ?? 0;
      const max = findParam(resolvedParams, 'max')?.value ?? 100;
      return [min, max];
    }

    case 'randomInt': {
      const min = findParam(resolvedParams, 'min')?.value ?? 0;
      const max = findParam(resolvedParams, 'max')?.value ?? 100;
      return [min, max];
    }

    case 'float':
    case 'double':
    case 'number': {
      // randomFloat(rng, min, max)
      const min = findParam(resolvedParams, 'min')?.value ?? 0.0;
      const max = findParam(resolvedParams, 'max')?.value ?? 1.0;
      return [min, max];
    }

    case 'randomFloat': {
      const min = findParam(resolvedParams, 'min')?.value ?? 0.0;
      const max = findParam(resolvedParams, 'max')?.value ?? 1.0;
      return [min, max];
    }

    case 'string':
    case 'text': {
      // randomString(rng, length, charset?)
      const length = findParam(resolvedParams, 'length')?.value ?? 10;
      const charset = findParam(resolvedParams, 'charset')?.value;
      return charset ? [length, charset] : [length];
    }

    case 'randomString': {
      const length = findParam(resolvedParams, 'length')?.value ?? 10;
      const charset = findParam(resolvedParams, 'charset')?.value;
      return charset ? [length, charset] : [length];
    }

    case 'bool':
    case 'boolean': {
      // randomBoolean(rng) - no parameters
      return [];
    }

    case 'pick': {
      const arrayParam =
        findParam(resolvedParams, 'array')?.value ?? findParam(resolvedParams, 'values')?.value;
      if (!Array.isArray(arrayParam)) {
        throw new Error(`Generator 'pick' requires parameter 'array' as an array`);
      }
      return [arrayParam];
    }

    case 'weightedPick': {
      const optionsParam = findParam(resolvedParams, 'options')?.value;
      if (!Array.isArray(optionsParam)) {
        throw new Error(`Generator 'weightedPick' requires parameter 'options' as an array`);
      }
      return [optionsParam];
    }

    default:
      return resolvedParams.map((parameter) => parameter.value);
  }
}

function resolveTemplateValue(value: unknown, context: GeneratedRecord): unknown {
  if (typeof value === 'string') {
    if (hasTemplateReferences(value)) {
      return evaluateTemplate(value, context);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      resolveTemplateValue(entryValue, context),
    ]);

    return Object.fromEntries(entries);
  }

  return value;
}

/**
 * Find a parameter by name in the parameter array.
 *
 * @param params - Array of generator parameters
 * @param name - Parameter name to search for
 * @returns Parameter if found, undefined otherwise
 */
function findParam(
  params: ReadonlyArray<{ name: string; value: unknown }>,
  name: string
): { name: string; value: unknown } | undefined {
  return params.find((p) => p.name === name);
}
