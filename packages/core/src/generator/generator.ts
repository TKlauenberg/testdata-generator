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
import {
  WORKSPACE_GENERATOR_REFERENCE_PREFIX,
  getWorkspaceGeneratorName,
} from '../parser/ast';
import type {
  DefaultSpec,
  GeneratorParameter,
  GeneratorSpec,
  WorkspaceGeneratorDefinition,
} from '../parser/ast';
import { GENERATOR_REGISTRY } from './generators';
import { evaluateTemplate, hasTemplateReferences } from './template';
import { UniquenessTracker } from './uniqueness';
import {
  isContextReferenceExpression,
  parseContextReferenceExpression,
  resolveContextReferenceExpression,
} from '../context/contextReference';
import type { ContextCollections } from '../context/types';

const MAX_UNIQUENESS_ATTEMPTS = 100;
const MAX_ENUMERABLE_UNIQUE_CANDIDATES = 10_000;
const EMPTY_WORKSPACE_GENERATORS = new Map<string, WorkspaceGeneratorDefinition>();

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
  readonly maxRelationshipDepth?: number;
  readonly context?: ContextCollections;
  readonly defaultGenerators?: readonly DefaultSpec[];
}

interface RelationshipGenerationContext {
  readonly programSchemas: ReadonlyMap<string, ValidatedSchema>;
  readonly maxDepth: number;
  readonly currentDepth: number;
  readonly schemaPath: readonly string[];
}

interface GenerationSessionContext {
  readonly uniquenessTracker: UniquenessTracker;
  readonly contextCollections: ContextCollections;
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
  const sessionContext: GenerationSessionContext = {
    uniquenessTracker: new UniquenessTracker(),
    contextCollections: options.context ?? {},
  };
  sessionContext.uniquenessTracker.clear();

  const maxDepth = options.maxRelationshipDepth ?? 5;

  // Step 2: Iterate through each schema in the program
  // ValidatedProgram contains multiple schemas in a Map
  for (const schema of program.schemas.values()) {
    // Step 3: Generate count records for this schema
    for (let i = 0; i < options.count; i++) {
      let record: GeneratedRecord | null = null;
      let failingConstraint: readonly string[] | null = null;

      for (let attempt = 1; attempt <= MAX_UNIQUENESS_ATTEMPTS; attempt++) {
        // Step 4: Generate single record using generateRecord
        // This is where all field generation happens
        const candidate = generateRecord(schema, rng, {
          programSchemas: program.schemas,
          maxDepth,
          currentDepth: 0,
          schemaPath: [schema.node.name],
        }, sessionContext);

        let compositeAccepted = true;
        const acceptedCompositeEntries: Array<{
          readonly fields: readonly string[];
          readonly values: readonly unknown[];
        }> = [];
        for (const constraint of schema.compositeUniques) {
          const values = constraint.map((fieldName) => candidate[fieldName]);
          const accepted = sessionContext.uniquenessTracker.trackComposite(constraint, values);
          if (!accepted) {
            compositeAccepted = false;
            failingConstraint = constraint;
            break;
          }

          acceptedCompositeEntries.push({
            fields: constraint,
            values,
          });
        }

        if (!compositeAccepted) {
          for (const entry of acceptedCompositeEntries) {
            sessionContext.uniquenessTracker.untrackComposite(entry.fields, entry.values);
          }
          continue;
        }

        if (compositeAccepted) {
          record = candidate;
          break;
        }
      }

      if (record === null) {
        if (failingConstraint && failingConstraint.length > 0) {
          const constraintLabel = failingConstraint
            .map((fieldName) => `${schema.node.name}.${fieldName}`)
            .join(', ');
          throw new Error(
            `Composite uniqueness constraint (${constraintLabel}) failed after ${MAX_UNIQUENESS_ATTEMPTS} attempts. ` +
              'Increase generator variety (wider ranges/options) or relax uniqueness constraints.',
          );
        }

        throw new Error(
          `Composite uniqueness constraint failed after ${MAX_UNIQUENESS_ATTEMPTS} attempts for schema '${schema.node.name}'.`,
        );
      }

      // Step 5: Yield immediately - lazy evaluation!
      // Record is produced and consumed before next record is generated
      // This is what makes it memory-efficient
      yield record;
    }
  }
}

/**
 * Sort fields in dependency order using Kahn's algorithm (BFS topological sort).
 *
 * Fields with no dependencies sort first; fields that reference other fields
 * sort after their dependencies. Declaration order is preserved for independent
 * fields (stable sort).
 *
 * This ensures `generateRecord()` always resolves template references correctly
 * regardless of the order fields are declared in the DSL source.
 *
 * @param fields - Fields to sort (from ValidatedField.templateReferences)
 * @returns Fields sorted so every dependency comes before its dependent
 *
 * @throws {Error} If a circular dependency is detected at runtime
 *   (defensive guard — the analyzer enforces no cycles at validation time)
 */
export function sortFieldsByDependency(
  fields: readonly ValidatedField[]
): readonly ValidatedField[] {
  // Build name → ValidatedField lookup
  const byName = new Map(fields.map((f) => [f.node.name, f]));

  // Build in-degree count and adjacency list (dependency → its dependents)
  const inDegree = new Map(fields.map((f) => [f.node.name, 0]));
  const dependents = new Map<string, string[]>(fields.map((f) => [f.node.name, []]));

  for (const field of fields) {
    for (const dep of field.templateReferences) {
      if (!byName.has(dep)) {
        throw new Error(
          `Invalid field dependency: field '${field.node.name}' references missing field '${dep}'`
        );
      }

      inDegree.set(field.node.name, (inDegree.get(field.node.name) ?? 0) + 1);
      dependents.get(dep)?.push(field.node.name);
    }
  }

  // BFS: start with all zero-in-degree fields (declaration order for stability)
  const queue: string[] = fields
    .filter((f) => inDegree.get(f.node.name) === 0)
    .map((f) => f.node.name);
  const sorted: ValidatedField[] = [];

  while (queue.length > 0) {
    const name = queue.shift();
    if (name === undefined) {
      break;
    }

    const field = byName.get(name);
    if (field === undefined) {
      throw new Error(`Invalid field lookup during dependency sorting for '${name}'`);
    }

    sorted.push(field);
    for (const dep of (dependents.get(name) ?? [])) {
      const newDegree = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDegree);
      if (newDegree === 0) queue.push(dep);
    }
  }

  // Cycle guard – should never trigger when the analyzer has validated the schema
  if (sorted.length !== fields.length) {
    const remaining = fields
      .filter((f) => !sorted.includes(f))
      .map((f) => f.node.name);
    throw new Error(
      `Circular field dependency detected among fields: ${remaining.join(', ')}`
    );
  }

  return sorted;
}

/**
 * Generate a single record from a validated schema.
 *
 * CRITICAL: Pure function - same inputs always produce same output.
 * CRITICAL: Use provided RNG instance - do NOT create new RNG.
 * CRITICAL: Fields are sorted by dependency order before generation so that
 *   template references always resolve against already-generated fields.
 *
 * @param schema - Validated schema with field definitions
 * @param rng - RNG instance for deterministic generation
 * @param relationshipContext - Optional context for nested schema generation
 * @param sessionContext - Optional session context carrying the UniquenessTracker.
 *   **WARNING:** When omitted, fields marked `isUnique` receive NO uniqueness enforcement
 *   and will silently produce duplicates. Composite uniqueness checks also require
 *   this context and are only enforced in the `generate()` pipeline.
 *   Always pass a sessionContext when generating
 *   multiple records from schemas that contain unique fields. The `generate()` async
 *   generator always supplies this context automatically.
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
  rng: RNG,
  relationshipContext?: RelationshipGenerationContext,
  sessionContext?: GenerationSessionContext,
): GeneratedRecord {
  const record: GeneratedRecord = {};

  // Sort fields so dependencies are generated before the fields that reference them.
  // This ensures template placeholders (e.g. {{firstName}}) always resolve correctly
  // regardless of declaration order in the DSL source (Story 6.2).
  const orderedFields = sortFieldsByDependency(schema.fields);

  // Process each field in dependency order
  for (const field of orderedFields) {
    const fieldName = field.node.name;

    try {
      // Generate value for this field
      const value = field.isUnique && sessionContext
        ? generateUniqueFieldValue(
          schema,
          field,
          rng,
          record,
          relationshipContext,
          sessionContext,
          `${schema.node.name}.${field.node.name}`,
        )
        : generateFieldValue(schema, field, rng, record, relationshipContext, sessionContext);

      // Assign to record
      record[fieldName] = value;
    } catch (error) {
      // Wrap any generation errors with field context
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate value for field '${fieldName}' ` +
          `using generator '${field.resolvedGenerator ?? field.resolvedType}': ${message}`
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
  schema: ValidatedSchema,
  field: ValidatedField,
  rng: RNG,
  context: GeneratedRecord,
  relationshipContext?: RelationshipGenerationContext,
  sessionContext?: GenerationSessionContext,
): unknown {
  if (field.referencedSchema) {
    return generateRelatedRecord(field, rng, relationshipContext, sessionContext);
  }

  const generatorSpec = field.effective?.generator ?? field.node.generator;
  const workspaceGeneratorName = resolveWorkspaceGeneratorName(generatorSpec);
  if (workspaceGeneratorName !== undefined) {
    return generateWorkspaceGeneratorValue(
      schema.workspaceGenerators ?? EMPTY_WORKSPACE_GENERATORS,
      workspaceGeneratorName,
      rng,
      context,
      sessionContext,
    );
  }

  const generatorType = field.resolvedGenerator ?? field.resolvedType;

  // Lookup generator by type
  const generator = GENERATOR_REGISTRY.get(generatorType);

  if (!generator) {
    throw new Error(
      `Unknown generator type '${generatorType}' for field '${field.node.name}'`
    );
  }

  // Extract parameters and invoke
  const paramsWithContext = extractParameters(
    generatorSpec,
    generatorType,
    context,
    rng,
    sessionContext?.contextCollections ?? {},
  );
  return generator(rng, ...paramsWithContext);
}

function generateUniqueFieldValue(
  schema: ValidatedSchema,
  field: ValidatedField,
  rng: RNG,
  context: GeneratedRecord,
  relationshipContext: RelationshipGenerationContext | undefined,
  sessionContext: GenerationSessionContext,
  uniquenessScope: string,
): unknown {
  const finiteCandidates = enumerateFiniteUniqueCandidates(field);
  if (finiteCandidates !== undefined) {
    const remainingCandidates = finiteCandidates.filter(
      (candidate) => !sessionContext.uniquenessTracker.has(uniquenessScope, candidate),
    );

    if (remainingCandidates.length === 0) {
      throw new Error(
        `Uniqueness constraint failed for field '${uniquenessScope}' after ${MAX_UNIQUENESS_ATTEMPTS} attempts. ` +
          `Increase generator variety (wider ranges/options) or relax uniqueness constraints.`,
      );
    }

    const candidateIndex = rng.nextIntRange(0, remainingCandidates.length - 1);
    const candidate = remainingCandidates[candidateIndex];

    const accepted = sessionContext.uniquenessTracker.track(uniquenessScope, candidate);
    if (accepted) {
      return candidate;
    }
  }

  for (let attempt = 1; attempt <= MAX_UNIQUENESS_ATTEMPTS; attempt++) {
    const candidate = generateFieldValue(schema, field, rng, context, relationshipContext, sessionContext);
    const accepted = sessionContext.uniquenessTracker.track(uniquenessScope, candidate);
    if (accepted) {
      return candidate;
    }
  }

  throw new Error(
    `Uniqueness constraint failed for field '${uniquenessScope}' after ${MAX_UNIQUENESS_ATTEMPTS} attempts. ` +
      `Increase generator variety (wider ranges/options) or relax uniqueness constraints.`,
  );
}

function enumerateFiniteUniqueCandidates(field: ValidatedField): readonly unknown[] | undefined {
  if (field.templateReferences.length > 0) {
    return undefined;
  }

  const generatorType = field.resolvedGenerator ?? field.resolvedType;
  const params = field.effective?.generator?.parameters ?? field.node.generator?.parameters ?? [];

  switch (generatorType) {
    case 'int':
    case 'integer':
    case 'randomInt':
      return enumerateIntegerCandidates(params);
    case 'pick':
      return enumeratePickCandidates(params);
    default:
      return undefined;
  }
}

function enumerateIntegerCandidates(params: readonly GeneratorParameter[]): readonly number[] | undefined {
  const minValue = findParam(params, 'min')?.value ?? 0;
  const maxValue = findParam(params, 'max')?.value ?? 100;

  if (
    typeof minValue !== 'number'
    || typeof maxValue !== 'number'
    || !Number.isInteger(minValue)
    || !Number.isInteger(maxValue)
    || minValue > maxValue
  ) {
    return undefined;
  }

  const min: number = minValue;
  const max: number = maxValue;

  const candidateCount = max - min + 1;
  if (candidateCount > MAX_ENUMERABLE_UNIQUE_CANDIDATES) {
    return undefined;
  }

  return Array.from({ length: candidateCount }, (_unused, index) => min + index);
}

function enumeratePickCandidates(params: readonly GeneratorParameter[]): readonly unknown[] | undefined {
  const arrayValue = findParam(params, 'array')?.value ?? findParam(params, 'values')?.value;
  if (!Array.isArray(arrayValue)) {
    return undefined;
  }

  const uniqueCandidates: unknown[] = [];
  for (const candidate of arrayValue) {
    if (!uniqueCandidates.some((existingCandidate) => Object.is(existingCandidate, candidate))) {
      uniqueCandidates.push(candidate);
    }
  }

  return uniqueCandidates;
}

function generateRelatedRecord(
  field: ValidatedField,
  rng: RNG,
  relationshipContext?: RelationshipGenerationContext,
  sessionContext?: GenerationSessionContext,
): GeneratedRecord {
  const referencedSchemaName = field.referencedSchema;
  if (!referencedSchemaName) {
    throw new Error(`Missing schema reference metadata for field '${field.node.name}'`);
  }

  if (!relationshipContext) {
    throw new Error(
      `Cannot generate related schema '${referencedSchemaName}' for field '${field.node.name}' without program context`
    );
  }

  const nextDepth = relationshipContext.currentDepth + 1;
  const nextPath = [...relationshipContext.schemaPath, referencedSchemaName];
  if (nextDepth > relationshipContext.maxDepth) {
    throw new Error(
      `Relationship generation depth exceeded max depth ${relationshipContext.maxDepth} at path ${nextPath.join(' -> ')}`
    );
  }

  const referencedSchema = relationshipContext.programSchemas.get(referencedSchemaName);
  if (!referencedSchema) {
    throw new Error(
      `Referenced schema '${referencedSchemaName}' not found for field '${field.node.name}' at path ${nextPath.join(' -> ')}`
    );
  }

  return generateRecord(referencedSchema, rng, {
    ...relationshipContext,
    currentDepth: nextDepth,
    schemaPath: nextPath,
  }, sessionContext);
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
  generatorSpec: Pick<GeneratorSpec, 'parameters'> | undefined,
  generatorType: string,
  context: GeneratedRecord,
  rng: RNG,
  contextCollections: ContextCollections,
): unknown[] {
  const params = generatorSpec?.parameters ?? [];

  const resolvedParams = params.map((parameter) => ({
    ...parameter,
    value: resolveTemplateValue(parameter.value, context, rng, contextCollections),
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

function resolveWorkspaceGeneratorName(generator: GeneratorSpec | undefined): string | undefined {
  if (generator === undefined) {
    return undefined;
  }

  if (generator.source === 'workspace') {
    return generator.name;
  }

  return getWorkspaceGeneratorName(generator.name);
}

function generateWorkspaceGeneratorValue(
  workspaceGenerators: ReadonlyMap<string, WorkspaceGeneratorDefinition>,
  generatorName: string,
  rng: RNG,
  context: GeneratedRecord,
  sessionContext?: GenerationSessionContext,
  resolutionStack: readonly string[] = [],
): unknown {
  const definition = workspaceGenerators.get(generatorName);
  if (definition === undefined) {
    throw new Error(
      `Workspace generator '${WORKSPACE_GENERATOR_REFERENCE_PREFIX}${generatorName}' is not defined`,
    );
  }

  if (resolutionStack.includes(generatorName)) {
    throw new Error(
      `Circular workspace generator reference detected: ${[...resolutionStack, generatorName].join(' -> ')}`,
    );
  }

  const nextStack = [...resolutionStack, generatorName];
  if (definition.type === 'template') {
    const templateContext: Record<string, unknown> = { ...context };

    for (const [slotName, generator] of Object.entries(definition.generators)) {
      templateContext[slotName] = generateWorkspaceGeneratorPartValue(
        workspaceGenerators,
        generator,
        rng,
        context,
        sessionContext,
        nextStack,
      );
    }

    return evaluateTemplate(definition.template, templateContext);
  }

  return definition.compose
    .map((part) => {
      if (part.type === 'literal') {
        return part.value;
      }

      return stringifyWorkspaceGeneratorValue(
        generateWorkspaceGeneratorPartValue(
          workspaceGenerators,
          part.generator,
          rng,
          context,
          sessionContext,
          nextStack,
        ),
      );
    })
    .join('');
}

function generateWorkspaceGeneratorPartValue(
  workspaceGenerators: ReadonlyMap<string, WorkspaceGeneratorDefinition>,
  generator: GeneratorSpec,
  rng: RNG,
  context: GeneratedRecord,
  sessionContext: GenerationSessionContext | undefined,
  resolutionStack: readonly string[],
): unknown {
  const workspaceGeneratorName = resolveWorkspaceGeneratorName(generator);
  if (workspaceGeneratorName !== undefined) {
    return generateWorkspaceGeneratorValue(
      workspaceGenerators,
      workspaceGeneratorName,
      rng,
      context,
      sessionContext,
      resolutionStack,
    );
  }

  const generatorFunction = GENERATOR_REGISTRY.get(generator.name);
  if (generatorFunction === undefined) {
    throw new Error(`Unknown generator type '${generator.name}' in workspace generator definition`);
  }

  const params = extractParameters(
    generator,
    generator.name,
    context,
    rng,
    sessionContext?.contextCollections ?? {},
  );
  return generatorFunction(rng, ...params);
}

function stringifyWorkspaceGeneratorValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function resolveTemplateValue(
  value: unknown,
  context: GeneratedRecord,
  rng: RNG,
  contextCollections: ContextCollections,
): unknown {
  if (typeof value === 'string') {
    const templateResolvedValue = hasTemplateReferences(value)
      ? evaluateTemplate(value, context)
      : value;

    if (isContextReferenceExpression(templateResolvedValue)) {
      const parsed = parseContextReferenceExpression(templateResolvedValue);
      if (!parsed.ok) {
        throw new Error(parsed.errors[0] ?? `Invalid context reference '${templateResolvedValue}'`);
      }

      return resolveContextReferenceExpression(parsed.value, contextCollections, rng);
    }

    return templateResolvedValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context, rng, contextCollections));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      resolveTemplateValue(entryValue, context, rng, contextCollections),
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
