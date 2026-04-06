/**
 * Semantic Analyzer - Type Checking and Validation
 *
 * Validates DSL programs by checking:
 * - Field types are supported
 * - Generator names are recognized
 * - Template references exist
 * - No circular dependencies between schemas
 * - Symbol table is complete and accurate
 */

import type { Result } from '../common/result';
import type { Diagnostic } from '../common/diagnostic';
import type { GenerationMetadataContextReference } from '../common';
import {
  WORKSPACE_GENERATOR_REFERENCE_PREFIX,
  getWorkspaceGeneratorName,
} from '../parser/ast';
import type {
  DefaultSpec,
  FieldNode,
  GeneratorSpec,
  LiteralValue,
  Program,
  SchemaNode,
  WorkspaceGeneratorDefinition,
  WorkspaceGeneratorSpec,
} from '../parser/ast';
import { GENERATOR_REGISTRY } from '../generator/generators';
import { SymbolTable } from './symbolTable';
import type {
  EffectiveFieldMetadata,
  GeneratorResolutionSource,
  ResolvedGeneratorDefault,
  ResolvedSchemaDefaults,
  UniqueResolutionSource,
  ValidatedProgram,
  ValidatedSchema,
  ValidatedField,
} from './types';
import {
  isContextReferenceExpression,
  parseContextReferenceExpression,
} from '../context/contextReference';
import { findSimilar as sharedFindSimilar } from '../common/suggestions';

// Supported primitive types in the DSL
const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean', 'uuid', 'date', 'timestamp']);

const RECOGNIZED_GENERATORS = new Set(GENERATOR_REGISTRY.keys());

type TemplateReference = {
  readonly raw: string;
  readonly schema?: string;
  readonly field: string;
};

type EffectiveFieldContext = {
  readonly field: FieldNode;
  readonly effective: EffectiveFieldMetadata;
  readonly templateReferences: readonly TemplateReference[];
  readonly referencedSchema?: string;
};

type LocalSchemaContext = {
  readonly schema: SchemaNode;
  readonly resolvedDefaults: ResolvedSchemaDefaults;
  readonly fields: readonly EffectiveFieldContext[];
};

type EffectiveSchemaContext = {
  readonly schema: SchemaNode;
  readonly resolvedDefaults: ResolvedSchemaDefaults;
  readonly fields: readonly EffectiveFieldContext[];
  readonly compositeUniques: readonly (readonly string[])[];
  readonly baseSchema?: string;
};

type DependencyKind = 'inheritance' | 'schema-reference' | 'template-reference';
type DependencyGraph = Map<string, Map<string, DependencyKind>>;

const findSimilarImpl = sharedFindSimilar as (
  target: string,
  candidates: readonly string[],
) => string[];

function findSimilar(target: string, candidates: readonly string[]): string[] {
  return findSimilarImpl(target, candidates);
}

export interface AnalyzeOptions {
  readonly availableContextCollections?: readonly string[];
  readonly defaultGenerators?: readonly DefaultSpec[];
  readonly workspaceGenerators?: readonly WorkspaceGeneratorSpec[];
}

function getWorkspaceReference(generator: GeneratorSpec): { readonly name: string; readonly reference: string } | undefined {
  if (generator.source === 'workspace') {
    return {
      name: generator.name,
      reference: generator.reference ?? `${WORKSPACE_GENERATOR_REFERENCE_PREFIX}${generator.name}`,
    };
  }

  const inferredName = getWorkspaceGeneratorName(generator.name);
  if (inferredName === undefined) {
    return undefined;
  }

  return {
    name: inferredName,
    reference: generator.name,
  };
}

function parseSchemaReference(type: string): string | undefined {
  if (type.startsWith('@schema:')) {
    const schemaName = type.slice('@schema:'.length).trim();
    return schemaName.length > 0 ? schemaName : undefined;
  }

  if (/^[A-Z]/.test(type)) {
    return type;
  }

  return undefined;
}

/**
 * Main semantic analysis function.
 * Validates a parsed AST and returns a ValidatedProgram or errors.
 *
 * @param ast - The parsed Program AST from the parser
 * @returns Result containing ValidatedProgram on success or diagnostics on failure
 */
export function analyze(
  ast: Program,
  options: AnalyzeOptions = {},
): Result<ValidatedProgram, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const availableContextCollections = new Set(options.availableContextCollections ?? []);
  const configuredGeneratorDefaults = options.defaultGenerators ?? [];
  const workspaceGeneratorDefinitions = new Map<string, WorkspaceGeneratorDefinition>(
    (options.workspaceGenerators ?? []).map((generator) => [generator.name, generator.definition]),
  );

  // Step 1: Build symbol table
  const symbolTableResult = buildSymbolTable(ast);
  if (!symbolTableResult.ok) {
    errors.push(...symbolTableResult.errors);
    return { ok: false, errors };
  }

  const symbolTable = symbolTableResult.value;
  const schemas: SchemaNode[] = [];

  // Extract all schemas from declarations
  for (const declaration of ast.declarations) {
    if (declaration.kind === 'schema') {
      schemas.push(declaration);
    }
  }

  const schemaMap = new Map(schemas.map((schema) => [schema.name, schema]));
  const localSchemaContexts = new Map<string, LocalSchemaContext>();

  for (const schema of schemas) {
    localSchemaContexts.set(schema.name, resolveEffectiveSchema(schema, configuredGeneratorDefaults));
  }

  const inheritanceResult = validateBaseSchemas(schemas, schemaMap);
  if (!inheritanceResult.ok) {
    errors.push(...inheritanceResult.errors);
  }

  const dependencyGraph = buildDependencyGraph(schemas, localSchemaContexts);
  const circularResult = detectCircularDependencies(dependencyGraph, schemas);
  if (!circularResult.ok) {
    errors.push(...circularResult.errors);
  }

  const effectiveSchemas = buildEffectiveSchemaContexts(schemas, schemaMap, localSchemaContexts);

  // Step 2: Validate each schema's fields
  for (const schema of schemas) {
    const effectiveSchema = effectiveSchemas.get(schema.name);
    if (!effectiveSchema) {
      continue;
    }

    // Validate field types
    const typeResult = validateFieldTypes(schema, effectiveSchema.fields, symbolTable, schemas);
    if (!typeResult.ok) {
      errors.push(...typeResult.errors);
    }

    // Validate generator names
    const genResult = validateGenerators(effectiveSchema.fields, workspaceGeneratorDefinitions);
    if (!genResult.ok) {
      errors.push(...genResult.errors);
    }

    // Validate template references
    const templateResult = validateTemplateReferences(schema, effectiveSchema, effectiveSchemas);
    if (!templateResult.ok) {
      errors.push(...templateResult.errors);
    }

    // Validate uniqueness constraints
    const uniqueResult = validateUniqueConstraints(effectiveSchema.fields);
    if (!uniqueResult.ok) {
      errors.push(...uniqueResult.errors);
    }

    // Validate context references
    const contextRefResult = validateContextReferences(
      schema,
      effectiveSchema.fields,
      availableContextCollections,
    );
    if (!contextRefResult.ok) {
      errors.push(...contextRefResult.errors);
    }

    // Validate composite uniqueness constraints
    const fieldNames = new Set(effectiveSchema.fields.map((field) => field.field.name));
    const compositeUniqueResult = validateCompositeUniqueConstraints(
      schema,
      effectiveSchema.compositeUniques,
      fieldNames,
      effectiveSchema.fields,
    );
    if (!compositeUniqueResult.ok) {
      errors.push(...compositeUniqueResult.errors);
    }
  }

  // If any errors occurred, return them all
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Step 4: Build ValidatedProgram
  const sortOrder = computeSortOrder(dependencyGraph);
  const validatedSchemas = new Map<string, ValidatedSchema>();
  const contextReferences = collectContextReferenceMetadata(effectiveSchemas);
  let totalFields = 0;

  for (const schema of schemas) {
    const effectiveSchema = effectiveSchemas.get(schema.name);
    if (!effectiveSchema) {
      continue;
    }

    const dependencies = new Set(dependencyGraph.get(schema.name)?.keys() ?? []);
    const validatedFields: ValidatedField[] = effectiveSchema.fields.map((field) => ({
      node: field.field,
      effective: field.effective,
      resolvedType: field.field.type,
      resolvedGenerator: field.effective.generator?.reference ?? field.effective.generator?.name,
      isUnique: field.effective.unique,
      templateReferences: field.templateReferences.map((ref) => ref.raw),
      referencedSchema: field.referencedSchema,
    }));

    validatedSchemas.set(schema.name, {
      node: schema,
      baseSchema: effectiveSchema.baseSchema,
      workspaceGenerators:
        workspaceGeneratorDefinitions.size > 0 ? workspaceGeneratorDefinitions : undefined,
      resolvedDefaults: effectiveSchema.resolvedDefaults,
      fields: validatedFields,
      dependencies,
      compositeUniques: effectiveSchema.compositeUniques,
      sortOrder: sortOrder.get(schema.name) ?? 0,
    });

    totalFields += validatedFields.length;
  }

  return {
    ok: true,
    value: {
      ast,
      symbolTable,
      schemas: validatedSchemas,
      metadata: {
        analyzedAt: new Date(),
        schemaCount: schemas.length,
        totalFields,
        contextReferences,
      },
    },
  };
}

function collectContextReferenceMetadata(
  effectiveSchemas: ReadonlyMap<string, EffectiveSchemaContext>,
): readonly GenerationMetadataContextReference[] | undefined {
  const references = new Map<string, GenerationMetadataContextReference>();

  for (const effectiveSchema of effectiveSchemas.values()) {
    for (const effectiveField of effectiveSchema.fields) {
      const parameters = effectiveField.effective.generator?.parameters ?? [];
      for (const parameter of parameters) {
        const expressions = extractContextReferenceExpressionsFromValue(parameter.value);
        for (const expression of expressions) {
          const parseResult = parseContextReferenceExpression(expression);
          if (!parseResult.ok) {
            continue;
          }

          references.set(parseResult.value.raw, {
            raw: parseResult.value.raw,
            collection: parseResult.value.collection,
            tags: [...parseResult.value.tags],
            selector: parseResult.value.selector.kind === 'random'
              ? { kind: 'random' }
              : { kind: 'index', index: parseResult.value.selector.index },
            fieldPath: parseResult.value.fieldPath.length > 0
              ? [...parseResult.value.fieldPath]
              : undefined,
          });
        }
      }
    }
  }

  if (references.size === 0) {
    return undefined;
  }

  return [...references.values()].sort((left, right) => left.raw.localeCompare(right.raw));
}

/**
 * Builds symbol table from AST and detects duplicate definitions.
 */
function buildSymbolTable(ast: Program): Result<SymbolTable, Diagnostic[]> {
  const symbolTable = new SymbolTable();
  const errors: Diagnostic[] = [];

  for (const declaration of ast.declarations) {
    if (declaration.kind === 'schema') {
      const schemaResult = symbolTable.defineSchema(declaration.name, declaration);
      if (!schemaResult.ok) {
        errors.push(...schemaResult.errors);
      }

      for (const field of declaration.fields) {
        const fieldResult = symbolTable.defineField(declaration.name, field.name, field);
        if (!fieldResult.ok) {
          errors.push(...fieldResult.errors);
        }
      }
      continue;
    }

    if (declaration.kind === 'profile') {
      const profileResult = symbolTable.defineProfile(declaration.name, declaration);
      if (!profileResult.ok) {
        errors.push(...profileResult.errors);
      }
      continue;
    }

    if (declaration.kind === 'context') {
      const contextResult = symbolTable.defineContext(declaration.name, declaration);
      if (!contextResult.ok) {
        errors.push(...contextResult.errors);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: symbolTable };
}

/**
 * Validates all field types in a schema are supported.
 */
function validateFieldTypes(
  schema: SchemaNode,
  effectiveFields: readonly EffectiveFieldContext[],
  symbolTable: SymbolTable,
  schemas: SchemaNode[],
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaNames = schemas.map((item) => item.name);

  for (const effectiveField of effectiveFields) {
    const field = effectiveField.field;
    const schemaReference = parseSchemaReference(field.type);

    if (schemaReference) {
      const referencedSchema = symbolTable.lookupSchema(schemaReference);
      if (!referencedSchema) {
        const suggestions = findSimilar(schemaReference, schemaNames);
        errors.push({
          code: 'analyzer.undefinedSchema',
          message: `Schema '${schemaReference}' is not defined`,
          severity: 'error',
          location: field.location,
          suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
        });
      }
      continue;
    }

    if (!SUPPORTED_TYPES.has(field.type)) {
      const suggestions = findSimilar(field.type, Array.from(SUPPORTED_TYPES));

      errors.push({
        code: 'analyzer.unsupportedType',
        message: `Type '${field.type}' is not supported`,
        severity: 'error',
        location: field.location,
        suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

/**
 * Validates all generator names in a schema are recognized.
 */
function validateGenerators(
  effectiveFields: readonly EffectiveFieldContext[],
  workspaceGenerators: ReadonlyMap<string, WorkspaceGeneratorDefinition>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const workspaceGeneratorNames = Array.from(workspaceGenerators.keys());

  for (const effectiveField of effectiveFields) {
    const generator = effectiveField.effective.generator;
    if (!generator) {
      continue;
    }

    const workspaceReference = getWorkspaceReference(generator);
    if (workspaceReference !== undefined) {
      if (!workspaceGenerators.has(workspaceReference.name)) {
        const suggestions = findSimilar(workspaceReference.name, workspaceGeneratorNames);

        errors.push({
          code: 'analyzer.undefinedWorkspaceGenerator',
          message: `Workspace generator '${workspaceReference.reference}' is not defined`,
          severity: 'error',
          location: effectiveField.field.location,
          suggestion:
            suggestions.length > 0
              ? `Did you mean '${WORKSPACE_GENERATOR_REFERENCE_PREFIX}${suggestions[0]}'?`
              : undefined,
        });
      }

      continue;
    }

    if (!RECOGNIZED_GENERATORS.has(generator.name)) {
      const suggestions = findSimilar(generator.name, Array.from(RECOGNIZED_GENERATORS));

      errors.push({
        code: 'analyzer.unrecognizedGenerator',
        message: `Generator '${generator.name}' is not recognized`,
        severity: 'error',
        location: effectiveField.field.location,
        suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

/**
 * Validates all template references in generator parameters.
 */
function validateTemplateReferences(
  schema: SchemaNode,
  effectiveSchema: EffectiveSchemaContext,
  effectiveSchemas: ReadonlyMap<string, EffectiveSchemaContext>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaFieldNames = effectiveSchema.fields.map((field) => field.field.name);

  for (const effectiveField of effectiveSchema.fields) {
    for (const reference of effectiveField.templateReferences) {
      const targetSchemaName = reference.schema ?? schema.name;
      const targetSchema = effectiveSchemas.get(targetSchemaName);

      if (!targetSchema) {
        const schemaSuggestions = findSimilar(targetSchemaName, Array.from(effectiveSchemas.keys()));
        errors.push({
          code: 'analyzer.undefinedSchema',
          message: `Schema '${targetSchemaName}' is not defined`,
          severity: 'error',
          location: effectiveField.field.location,
          suggestion:
            schemaSuggestions.length > 0 ? `Did you mean '${schemaSuggestions[0]}'?` : undefined,
        });
        continue;
      }

      const targetFieldNames = targetSchema.fields.map((field) => field.field.name);
      if (!targetFieldNames.includes(reference.field)) {
        const suggestions = findSimilar(
          reference.field,
          targetSchemaName === schema.name ? schemaFieldNames : targetFieldNames,
        );

        errors.push({
          code: 'analyzer.undefinedTemplateField',
          message:
            targetSchemaName === schema.name
              ? `Undefined field '${reference.field}' in template`
              : `Undefined field '${reference.field}' in template for schema '${targetSchemaName}'`,
          severity: 'error',
          location: effectiveField.field.location,
          suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

/**
 * Validates uniqueness constraint payloads.
 *
 * Parser grammar only emits `unique` as boolean true. This check defends
 * against malformed AST payloads from direct programmatic construction.
 */
function validateUniqueConstraints(
  effectiveFields: readonly EffectiveFieldContext[],
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  for (const effectiveField of effectiveFields) {
    const field = effectiveField.field;
    if (field.constraints?.unique === undefined) {
      continue;
    }

    if (field.constraints.unique !== true) {
      errors.push({
        code: 'analyzer.invalidUniqueConstraint',
        message: `Invalid unique constraint for field '${field.name}': expected keyword 'unique'`,
        severity: 'error',
        location: field.location,
        suggestion: `Use '${field.name}: ${field.type} unique' without assigning true/false`,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

function validateCompositeUniqueConstraints(
  schema: SchemaNode,
  compositeUniques: readonly (readonly string[])[],
  fieldNames: ReadonlySet<string>,
  effectiveFields: readonly EffectiveFieldContext[],
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const fieldByName = new Map(effectiveFields.map((field) => [field.field.name, field.field]));

  for (const compositeConstraint of compositeUniques) {
    if (compositeConstraint.length < 2 || compositeConstraint.length > 5) {
      errors.push({
        code: 'analyzer.compositeUniqueArity',
        message: `Composite unique constraint in schema '${schema.name}' must reference 2 to 5 fields, but found ${compositeConstraint.length}`,
        severity: 'error',
        location: schema.location,
        suggestion: 'Use unique(field1, field2[, field3, field4, field5])',
      });
      continue;
    }

    const seenFields = new Set<string>();
    for (const fieldName of compositeConstraint) {
      if (seenFields.has(fieldName)) {
        errors.push({
          code: 'analyzer.compositeUniqueDuplicateField',
          message: `Composite unique constraint in schema '${schema.name}' contains duplicate field '${fieldName}'`,
          severity: 'error',
          location: fieldByName.get(fieldName)?.location ?? schema.location,
          suggestion: 'Remove duplicate fields from the same unique(...) directive',
        });
        continue;
      }

      seenFields.add(fieldName);

      if (!fieldNames.has(fieldName)) {
        const suggestions = findSimilar(fieldName, Array.from(fieldNames));
        errors.push({
          code: 'analyzer.compositeUniqueFieldNotFound',
          message: `Composite unique constraint in schema '${schema.name}' references unknown field '${fieldName}'`,
          severity: 'error',
          location: schema.location,
          suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

function validateBaseSchemas(
  schemas: readonly SchemaNode[],
  schemaMap: ReadonlyMap<string, SchemaNode>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaNames = Array.from(schemaMap.keys());

  for (const schema of schemas) {
    if (!schema.extendsSchema) {
      continue;
    }

    if (schemaMap.has(schema.extendsSchema)) {
      continue;
    }

    const suggestions = findSimilar(schema.extendsSchema, schemaNames);
    errors.push({
      code: 'analyzer.undefinedSchema',
      message: `Schema '${schema.extendsSchema}' is not defined`,
      severity: 'error',
      location: schema.extendsSchemaLocation ?? schema.location,
      suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

function buildEffectiveSchemaContexts(
  schemas: readonly SchemaNode[],
  schemaMap: ReadonlyMap<string, SchemaNode>,
  localSchemaContexts: ReadonlyMap<string, LocalSchemaContext>,
): Map<string, EffectiveSchemaContext> {
  const effectiveSchemas = new Map<string, EffectiveSchemaContext>();
  const resolving = new Set<string>();

  const resolve = (schemaName: string): EffectiveSchemaContext => {
    const cached = effectiveSchemas.get(schemaName);
    if (cached) {
      return cached;
    }

    const localContext = localSchemaContexts.get(schemaName);
    const schema = schemaMap.get(schemaName);
    if (!localContext || !schema) {
      throw new Error(`Missing schema context for '${schemaName}' during inheritance resolution`);
    }

    if (resolving.has(schemaName)) {
      return {
        schema,
        resolvedDefaults: localContext.resolvedDefaults,
        fields: localContext.fields,
        compositeUniques: schema.compositeUniques ?? [],
        baseSchema: schema.extendsSchema,
      };
    }

    resolving.add(schemaName);

    let fields = localContext.fields;
    let compositeUniques = schema.compositeUniques ?? [];

    if (schema.extendsSchema && schemaMap.has(schema.extendsSchema)) {
      const baseSchema = resolve(schema.extendsSchema);
      fields = mergeEffectiveFields(baseSchema.fields, localContext.fields);
      compositeUniques = [...baseSchema.compositeUniques, ...(schema.compositeUniques ?? [])];
    }

    const resolvedSchema: EffectiveSchemaContext = {
      schema,
      resolvedDefaults: localContext.resolvedDefaults,
      fields,
      compositeUniques,
      baseSchema: schema.extendsSchema,
    };

    effectiveSchemas.set(schemaName, resolvedSchema);
    resolving.delete(schemaName);
    return resolvedSchema;
  };

  for (const schema of schemas) {
    resolve(schema.name);
  }

  return effectiveSchemas;
}

function mergeEffectiveFields(
  baseFields: readonly EffectiveFieldContext[],
  localFields: readonly EffectiveFieldContext[],
): readonly EffectiveFieldContext[] {
  const localFieldsByName = new Map(localFields.map((field) => [field.field.name, field]));
  const baseFieldNames = new Set(baseFields.map((field) => field.field.name));

  return [
    ...baseFields.map((field) => localFieldsByName.get(field.field.name) ?? field),
    ...localFields.filter((field) => !baseFieldNames.has(field.field.name)),
  ];
}

function getTemplateReferencesForSchema(
  effectiveFields: readonly EffectiveFieldContext[],
): TemplateReference[] {
  return effectiveFields.flatMap((field) => field.templateReferences);
}

/**
 * Recursively extracts template references from any parameter value.
 *
 * Handles strings, arrays, and nested objects so that generators like
 * `pick(array=["{{field}}"])` are scanned in the same way as a top-level
 * string parameter value.
 */
function extractTemplateReferencesFromValue(value: unknown): TemplateReference[] {
  if (typeof value === 'string') {
    const references: TemplateReference[] = [];
    const matches = value.matchAll(/\{\{\s*([^}]+)\s*\}\}/g);
    for (const match of matches) {
      const raw = match[1]?.trim();
      if (!raw) {
        continue;
      }
      if (raw.includes('.')) {
        const [schema, fieldName] = raw.split('.', 2);
        if (schema && fieldName) {
          references.push({ raw, schema, field: fieldName });
          continue;
        }
      }
      references.push({ raw, field: raw });
    }
    return references;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTemplateReferencesFromValue(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      extractTemplateReferencesFromValue(entry),
    );
  }

  return [];
}

function getTemplateReferencesForGenerator(generator?: GeneratorSpec): TemplateReference[] {
  if (!generator?.parameters) {
    return [];
  }

  return generator.parameters.flatMap((parameter) =>
    extractTemplateReferencesFromValue(parameter.value),
  );
}

function extractContextReferenceExpressionsFromValue(value: unknown): string[] {
  if (typeof value === 'string') {
    return isContextReferenceExpression(value) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractContextReferenceExpressionsFromValue(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      extractContextReferenceExpressionsFromValue(entry),
    );
  }

  return [];
}

function validateContextReferences(
  schema: SchemaNode,
  effectiveFields: readonly EffectiveFieldContext[],
  availableContextCollections: ReadonlySet<string>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  for (const effectiveField of effectiveFields) {
    const parameters = effectiveField.effective.generator?.parameters ?? [];
    for (const parameter of parameters) {
      const contextExpressions = extractContextReferenceExpressionsFromValue(parameter.value);
      for (const expression of contextExpressions) {
        const parseResult = parseContextReferenceExpression(expression);
        if (!parseResult.ok) {
          errors.push({
            code: 'analyzer.invalidContextReference',
            message: parseResult.errors[0] ?? `Invalid context reference '${expression}'`,
            severity: 'error',
            location: effectiveField.field.location,
            suggestion:
              "Supported forms: @context.<collection>.random, @context.<collection>[<index>], @context.<collection>@tag.random, @context.<collection>@tagOne AND @tagTwo.random, and optional .fieldName suffix",
          });
          continue;
        }

        const collectionName = parseResult.value.collection;
        if (!availableContextCollections.has(collectionName)) {
          const suggestions = findSimilar(collectionName, Array.from(availableContextCollections));

          errors.push({
            code: 'analyzer.undefinedContextCollection',
            message: `Context collection '${collectionName}' is not available for reference '${expression}'`,
            severity: 'error',
            location: effectiveField.field.location,
            suggestion:
              suggestions.length > 0
                ? `Did you mean '${suggestions[0]}'?`
                : availableContextCollections.size === 0
                  ? 'Provide context collections in generation options before using @context references'
                  : undefined,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

function buildDependencyGraph(
  schemas: SchemaNode[],
  localSchemaContexts: ReadonlyMap<string, LocalSchemaContext>,
): DependencyGraph {
  const graph: DependencyGraph = new Map();
  const schemaNames = new Set(schemas.map((schema) => schema.name));

  for (const schema of schemas) {
    const dependencies = new Map<string, DependencyKind>();

    for (const field of schema.fields) {
      const schemaReference = parseSchemaReference(field.type);
      if (schemaReference && schemaNames.has(schemaReference)) {
        dependencies.set(schemaReference, 'schema-reference');
      }
    }

    const templateReferences = getTemplateReferencesForSchema(
      localSchemaContexts.get(schema.name)?.fields ?? [],
    );
    for (const reference of templateReferences) {
      if (reference.schema && schemaNames.has(reference.schema)) {
        dependencies.set(reference.schema, 'template-reference');
      }
    }

    if (schema.extendsSchema && schemaNames.has(schema.extendsSchema)) {
      dependencies.set(schema.extendsSchema, 'inheritance');
    }

    graph.set(schema.name, dependencies);
  }

  return graph;
}

function resolveEffectiveSchema(
  schema: SchemaNode,
  configuredGeneratorDefaults: readonly DefaultSpec[],
): LocalSchemaContext {
  const resolvedDefaults = resolveSchemaDefaults(schema, configuredGeneratorDefaults);

  return {
    schema,
    resolvedDefaults,
    fields: schema.fields.map((field) => resolveEffectiveField(field, resolvedDefaults)),
  };
}

function resolveSchemaDefaults(
  schema: SchemaNode,
  configuredGeneratorDefaults: readonly DefaultSpec[],
): ResolvedSchemaDefaults {
  const generatorDefaults = new Map<string, ResolvedGeneratorDefault>();

  for (const configuredDefault of configuredGeneratorDefaults) {
    generatorDefaults.set(configuredDefault.fieldType, {
      generator: cloneGeneratorSpec(configuredDefault.generator),
      source: 'config',
    });
  }

  for (const schemaDefault of schema.defaults?.generatorDefaults ?? []) {
    generatorDefaults.set(schemaDefault.fieldType, {
      generator: cloneGeneratorSpec(schemaDefault.generator),
      source: 'schema',
    });
  }

  return {
    generatorDefaults,
    unique: schema.defaults?.constraints?.unique,
  };
}

function resolveEffectiveField(
  field: FieldNode,
  resolvedDefaults: ResolvedSchemaDefaults,
): EffectiveFieldContext {
  const referencedSchema = parseSchemaReference(field.type);
  const configuredDefault = referencedSchema ? undefined : resolvedDefaults.generatorDefaults.get(field.type);

  const generator = field.generator
    ? cloneGeneratorSpec(field.generator)
    : configuredDefault?.generator;
  const generatorSource: GeneratorResolutionSource = field.generator
    ? 'field'
    : configuredDefault?.source ?? 'built-in';
  const uniqueSource: UniqueResolutionSource = field.constraints?.unique !== undefined
    ? 'field'
    : resolvedDefaults.unique !== undefined
      ? 'schema'
      : 'built-in';
  const unique = field.constraints?.unique ?? resolvedDefaults.unique ?? false;

  return {
    field,
    effective: {
      generator,
      generatorSource,
      unique,
      uniqueSource,
    },
    templateReferences: getTemplateReferencesForGenerator(generator),
    referencedSchema,
  };
}

function cloneGeneratorSpec(generator: GeneratorSpec): GeneratorSpec {
  return {
    name: generator.name,
    source: generator.source,
    reference: generator.reference,
    parameters: generator.parameters?.map((parameter) => ({
      name: parameter.name,
      value: cloneLiteralValue(parameter.value),
    })),
  };
}

function cloneLiteralValue(value: LiteralValue): LiteralValue {
  if (Array.isArray(value)) {
    const arrayValue = value as readonly LiteralValue[];
    return arrayValue.map((item): LiteralValue => cloneLiteralValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as { readonly [key: string]: LiteralValue };
    const clonedObject: { [key: string]: LiteralValue } = {};

    for (const key of Object.keys(objectValue)) {
      clonedObject[key] = cloneLiteralValue(objectValue[key]);
    }

    return clonedObject;
  }

  return value;
}

function computeSortOrder(graph: DependencyGraph): Map<string, number> {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(node: string): void {
    if (visited.has(node)) {
      return;
    }

    visited.add(node);

    const dependencies = graph.get(node) ?? new Map<string, DependencyKind>();
    for (const dependency of dependencies.keys()) {
      visit(dependency);
    }

    order.push(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }

  const sortOrder = new Map<string, number>();
  order.forEach((schemaName, index) => {
    sortOrder.set(schemaName, index);
  });

  return sortOrder;
}

/**
 * Detects circular dependencies between schemas using depth-first search.
 */
function detectCircularDependencies(
  graph: DependencyGraph,
  schemas: SchemaNode[],
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaMap = new Map<string, SchemaNode>();

  for (const schema of schemas) {
    schemaMap.set(schema.name, schema);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(
    schemaName: string,
    path: string[],
    incoming?: { readonly from: string; readonly kind: DependencyKind },
  ): void {
    if (visiting.has(schemaName)) {
      // Found a cycle
      const cycleStart = path.indexOf(schemaName);
      const cycle = [...path.slice(cycleStart), schemaName];
      const incomingSchema = incoming ? schemaMap.get(incoming.from) : schemaMap.get(schemaName);

      errors.push({
        code: 'analyzer.circularDependency',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        severity: 'error',
        location:
          incoming?.kind === 'inheritance'
            ? incomingSchema?.extendsSchemaLocation ?? incomingSchema?.location
            : incomingSchema?.location,
        suggestion:
          incoming?.kind === 'inheritance'
            ? 'Break the inheritance cycle by removing or restructuring one of the extends clauses'
            : 'Break the cycle by removing one of the references',
      });
      return;
    }

    if (visited.has(schemaName)) {
      return;
    }

    visiting.add(schemaName);
    path.push(schemaName);

    const dependencies = graph.get(schemaName) ?? new Map<string, DependencyKind>();
    for (const [dep, kind] of dependencies) {
      visit(dep, path, { from: schemaName, kind });
    }

    path.pop();
    visiting.delete(schemaName);
    visited.add(schemaName);
  }

  // Visit all schemas
  for (const schemaName of graph.keys()) {
    if (!visited.has(schemaName)) {
      visit(schemaName, []);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: undefined };
}

