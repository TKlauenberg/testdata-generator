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
import type { Program, SchemaNode } from '../parser/ast';
import { SymbolTable } from './symbolTable';
import type { ValidatedProgram, ValidatedSchema, ValidatedField } from './types';
import {
  isContextReferenceExpression,
  parseContextReferenceExpression,
} from '../context/contextReference';

// Supported primitive types in the DSL
const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean', 'uuid', 'date', 'timestamp']);

// Recognized generator names
const RECOGNIZED_GENERATORS = new Set([
  // Identity generators
  'uuid',
  'sequential',
  // Personal data generators
  'firstName',
  'lastName',
  'fullName',
  'email',
  // Numeric generators
  'randomInt',
  'randomFloat',
  // Text generators
  'randomString',
  'word',
  'sentence',
  'paragraph',
  // Temporal generators
  'date',
  'timestamp',
  'dateRange',
  // Selection generators
  'pick',
  'weightedPick',
]);

type TemplateReference = {
  readonly raw: string;
  readonly schema?: string;
  readonly field: string;
};

export interface AnalyzeOptions {
  readonly availableContextCollections?: readonly string[];
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

  const templateReferencesBySchema = new Map<string, TemplateReference[]>();

  // Step 2: Validate each schema's fields
  for (const schema of schemas) {
    // Validate field types
    const typeResult = validateFieldTypes(schema, symbolTable, schemas);
    if (!typeResult.ok) {
      errors.push(...typeResult.errors);
    }

    // Validate generator names
    const genResult = validateGenerators(schema);
    if (!genResult.ok) {
      errors.push(...genResult.errors);
    }

    // Validate template references
    const templateResult = validateTemplateReferences(schema, symbolTable);
    if (!templateResult.ok) {
      errors.push(...templateResult.errors);
    }

    // Validate uniqueness constraints
    const uniqueResult = validateUniqueConstraints(schema);
    if (!uniqueResult.ok) {
      errors.push(...uniqueResult.errors);
    }

    // Validate context references
    const contextRefResult = validateContextReferences(schema, availableContextCollections);
    if (!contextRefResult.ok) {
      errors.push(...contextRefResult.errors);
    }

    // Validate composite uniqueness constraints
    const fieldNames = new Set(schema.fields.map((field) => field.name));
    const compositeUniqueResult = validateCompositeUniqueConstraints(schema, fieldNames);
    if (!compositeUniqueResult.ok) {
      errors.push(...compositeUniqueResult.errors);
    }

    templateReferencesBySchema.set(schema.name, getTemplateReferencesForSchema(schema));
  }

  // Step 3: Detect circular dependencies
  const dependencyGraph = buildDependencyGraph(schemas, templateReferencesBySchema);
  const circularResult = detectCircularDependencies(dependencyGraph, schemas);
  if (!circularResult.ok) {
    errors.push(...circularResult.errors);
  }

  // If any errors occurred, return them all
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Step 4: Build ValidatedProgram
  const sortOrder = computeSortOrder(dependencyGraph);
  const validatedSchemas = new Map<string, ValidatedSchema>();
  let totalFields = 0;

  for (const schema of schemas) {
    const dependencies = dependencyGraph.get(schema.name) ?? new Set();
    const validatedFields: ValidatedField[] = schema.fields.map((field) => ({
      node: field,
      resolvedType: field.type,
      resolvedGenerator: field.generator?.name,
      isUnique: field.constraints?.unique === true,
      templateReferences: getTemplateReferencesForField(field).map((ref) => ref.raw),
      referencedSchema: parseSchemaReference(field.type),
    }));

    validatedSchemas.set(schema.name, {
      node: schema,
      fields: validatedFields,
      dependencies,
      compositeUniques: schema.compositeUniques ?? [],
      sortOrder: sortOrder.get(schema.name) ?? 0,
    });

    totalFields += schema.fields.length;
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
      },
    },
  };
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

      // Define fields within schema
      for (const field of declaration.fields) {
        const fieldResult = symbolTable.defineField(declaration.name, field.name, field);
        if (!fieldResult.ok) {
          errors.push(...fieldResult.errors);
        }
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
  symbolTable: SymbolTable,
  schemas: SchemaNode[],
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaNames = schemas.map((item) => item.name);

  for (const field of schema.fields) {
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
function validateGenerators(schema: SchemaNode): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  for (const field of schema.fields) {
    if (field.generator && !RECOGNIZED_GENERATORS.has(field.generator.name)) {
      const suggestions = findSimilar(field.generator.name, Array.from(RECOGNIZED_GENERATORS));

      errors.push({
        code: 'analyzer.unrecognizedGenerator',
        message: `Generator '${field.generator.name}' is not recognized`,
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
 * Validates all template references in generator parameters.
 */
function validateTemplateReferences(
  schema: SchemaNode,
  symbolTable: SymbolTable,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const schemaFieldNames = schema.fields.map((field) => field.name);

  for (const field of schema.fields) {
    const references = getTemplateReferencesForField(field);
    for (const reference of references) {
      if (reference.schema && reference.schema !== schema.name) {
        const referencedSchema = symbolTable.lookupSchema(reference.schema);
        if (!referencedSchema) {
          const schemaSuggestions = findSimilar(
            reference.schema,
            Array.from(symbolTable.getAllSymbols())
              .filter((symbol) => symbol.kind === 'schema')
              .map((symbol) => symbol.name),
          );
          errors.push({
            code: 'analyzer.undefinedSchema',
            message: `Schema '${reference.schema}' is not defined`,
            severity: 'error',
            location: field.location,
            suggestion:
              schemaSuggestions.length > 0 ? `Did you mean '${schemaSuggestions[0]}'?` : undefined,
          });
          continue;
        }

        const referencedField = symbolTable.lookupField(reference.schema, reference.field);
        if (!referencedField) {
          const schemaNode = referencedSchema.astNode;
          const candidateFields: string[] = [];
          if (schemaNode.kind === 'schema') {
            const typedSchemaNode = schemaNode as SchemaNode;
            candidateFields.push(...typedSchemaNode.fields.map((item) => item.name));
          }
          const suggestions = findSimilar(reference.field, candidateFields);

          errors.push({
            code: 'analyzer.undefinedTemplateField',
            message: `Undefined field '${reference.field}' in template for schema '${reference.schema}'`,
            severity: 'error',
            location: field.location,
            suggestion: suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : undefined,
          });
        }

        continue;
      }

      const referencedField = symbolTable.lookupField(schema.name, reference.field);
      if (!referencedField) {
        const suggestions = findSimilar(reference.field, schemaFieldNames);
        errors.push({
          code: 'analyzer.undefinedTemplateField',
          message: `Undefined field '${reference.field}' in template`,
          severity: 'error',
          location: field.location,
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
function validateUniqueConstraints(schema: SchemaNode): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  for (const field of schema.fields) {
    if (!field.constraints || field.constraints.unique === undefined) {
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
  fieldNames: ReadonlySet<string>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];
  const compositeUniques = schema.compositeUniques ?? [];
  const fieldByName = new Map(schema.fields.map((field) => [field.name, field]));

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

function getTemplateReferencesForSchema(schema: SchemaNode): TemplateReference[] {
  const references: TemplateReference[] = [];

  for (const field of schema.fields) {
    references.push(...getTemplateReferencesForField(field));
  }

  return references;
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
    return Object.values(value as Record<string, unknown>).flatMap((v) =>
      extractTemplateReferencesFromValue(v),
    );
  }

  return [];
}

function getTemplateReferencesForField(field: SchemaNode['fields'][number]): TemplateReference[] {
  if (!field.generator?.parameters) {
    return [];
  }

  return field.generator.parameters.flatMap((parameter) =>
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
  availableContextCollections: ReadonlySet<string>,
): Result<void, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  for (const field of schema.fields) {
    const parameters = field.generator?.parameters ?? [];
    for (const parameter of parameters) {
      const contextExpressions = extractContextReferenceExpressionsFromValue(parameter.value);
      for (const expression of contextExpressions) {
        const parseResult = parseContextReferenceExpression(expression);
        if (!parseResult.ok) {
          errors.push({
            code: 'analyzer.invalidContextReference',
            message: parseResult.errors[0] ?? `Invalid context reference '${expression}'`,
            severity: 'error',
            location: field.location,
            suggestion:
              "Supported forms: @context.<collection>.random, @context.<collection>[<index>], and optional .fieldName suffix",
          });
          continue;
        }

        const collectionName = parseResult.value.collection;
        if (!availableContextCollections.has(collectionName)) {
          errors.push({
            code: 'analyzer.undefinedContextCollection',
            message: `Context collection '${collectionName}' is not available for reference '${expression}'`,
            severity: 'error',
            location: field.location,
            suggestion:
              availableContextCollections.size > 0
                ? `Available collections: ${Array.from(availableContextCollections).join(', ')}`
                : 'Provide context collections in generation options before using @context references',
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
  templateReferencesBySchema: Map<string, TemplateReference[]>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const schemaNames = new Set(schemas.map((schema) => schema.name));

  for (const schema of schemas) {
    const dependencies = new Set<string>();

    for (const field of schema.fields) {
      const schemaReference = parseSchemaReference(field.type);
      if (schemaReference && schemaNames.has(schemaReference)) {
        dependencies.add(schemaReference);
      }
    }

    const templateReferences = templateReferencesBySchema.get(schema.name) ?? [];
    for (const reference of templateReferences) {
      if (reference.schema && schemaNames.has(reference.schema)) {
        dependencies.add(reference.schema);
      }
    }

    graph.set(schema.name, dependencies);
  }

  return graph;
}

function computeSortOrder(graph: Map<string, Set<string>>): Map<string, number> {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(node: string): void {
    if (visited.has(node)) {
      return;
    }

    visited.add(node);

    const dependencies = graph.get(node) ?? new Set();
    for (const dependency of dependencies) {
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
  graph: Map<string, Set<string>>,
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

  function visit(schemaName: string, path: string[]): void {
    if (visiting.has(schemaName)) {
      // Found a cycle
      const cycleStart = path.indexOf(schemaName);
      const cycle = [...path.slice(cycleStart), schemaName];
      const schema = schemaMap.get(schemaName);

      errors.push({
        code: 'analyzer.circularDependency',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        severity: 'error',
        location: schema?.location,
        suggestion: 'Break the cycle by removing one of the references',
      });
      return;
    }

    if (visited.has(schemaName)) {
      return;
    }

    visiting.add(schemaName);
    path.push(schemaName);

    const dependencies = graph.get(schemaName) ?? new Set();
    for (const dep of dependencies) {
      visit(dep, path);
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

/**
 * Finds similar strings using Levenshtein distance.
 * Returns up to 3 most similar candidates with distance <= 3.
 */
function findSimilar(target: string, candidates: string[]): string[] {
  return candidates
    .map((candidate) => ({
      name: candidate,
      distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase()),
    }))
    .filter((item) => item.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((item) => item.name);
}

/**
 * Calculates Levenshtein distance between two strings.
 * Used for "Did you mean?" suggestions.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column and row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
