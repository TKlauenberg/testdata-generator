/**
 * ValidatedProgram and related types for semantic analysis output
 *
 * These types represent the result of successful semantic analysis,
 * containing validated schemas with enriched metadata and a complete symbol table.
 */

import type { Program, SchemaNode, FieldNode, GeneratorSpec, WorkspaceGeneratorDefinition } from '../parser/ast';
import type { SymbolTable } from './symbolTable';

export type GeneratorResolutionSource = 'field' | 'schema' | 'config' | 'built-in';
export type UniqueResolutionSource = 'field' | 'schema' | 'built-in';

export interface ResolvedGeneratorDefault {
  readonly generator: GeneratorSpec;
  readonly source: Exclude<GeneratorResolutionSource, 'field' | 'built-in'>;
}

export interface ResolvedSchemaDefaults {
  readonly generatorDefaults: ReadonlyMap<string, ResolvedGeneratorDefault>;
  readonly unique?: boolean;
}

export interface EffectiveFieldMetadata {
  readonly generator?: GeneratorSpec;
  readonly generatorSource: GeneratorResolutionSource;
  readonly unique: boolean;
  readonly uniqueSource: UniqueResolutionSource;
}

/**
 * Result of successful semantic analysis.
 * Contains validated AST, symbol table, and enriched schema information.
 */
export interface ValidatedProgram {
  /** Original parsed AST */
  readonly ast: Program;

  /** Complete symbol table with all definitions */
  readonly symbolTable: SymbolTable;

  /** Quick lookup map for validated schemas */
  readonly schemas: Map<string, ValidatedSchema>;

  /** Metadata about the analyzed program */
  readonly metadata: {
    readonly analyzedAt: Date;
    readonly schemaCount: number;
    readonly totalFields: number;
  };
}

/**
 * Validated schema with enriched metadata and dependency information.
 */
export interface ValidatedSchema {
  /** Reference to original AST node */
  readonly node: SchemaNode;

  /** Name of the base schema when this schema extends another schema */
  readonly baseSchema?: string;

  /** Workspace-scoped shared generator definitions available to this schema */
  readonly workspaceGenerators?: ReadonlyMap<string, WorkspaceGeneratorDefinition>;

  /** Resolved schema-level defaults after precedence resolution */
  readonly resolvedDefaults?: ResolvedSchemaDefaults;

  /** Validated and enriched fields */
  readonly fields: readonly ValidatedField[];

  /** Names of schemas this schema depends on */
  readonly dependencies: ReadonlySet<string>;

  /** Schema-level composite uniqueness constraints (2-5 fields each) */
  readonly compositeUniques: readonly (readonly string[])[];

  /** Topological sort order (for generation) */
  readonly sortOrder: number;
}

/**
 * Validated field with resolved type and generator information.
 */
export interface ValidatedField {
  /** Reference to original AST node */
  readonly node: FieldNode;

  /** Effective field metadata after precedence resolution */
  readonly effective?: EffectiveFieldMetadata;

  /** Resolved type information */
  readonly resolvedType: string;

  /** Resolved generator name (if specified) */
  readonly resolvedGenerator: string | undefined;

  /** Whether single-field uniqueness is required for this field */
  readonly isUnique: boolean;

  /** Extracted template field references (e.g., from {{fieldName}}) */
  readonly templateReferences: readonly string[];

  /** Referenced schema name when field uses @schema:<SchemaName> syntax */
  readonly referencedSchema?: string;
}
