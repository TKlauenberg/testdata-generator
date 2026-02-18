/**
 * ValidatedProgram and related types for semantic analysis output
 *
 * These types represent the result of successful semantic analysis,
 * containing validated schemas with enriched metadata and a complete symbol table.
 */

import type { Program, SchemaNode, FieldNode } from '../parser/ast';
import type { SymbolTable } from './symbolTable';

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

  /** Validated and enriched fields */
  readonly fields: readonly ValidatedField[];

  /** Names of schemas this schema depends on */
  readonly dependencies: ReadonlySet<string>;

  /** Topological sort order (for generation) */
  readonly sortOrder: number;
}

/**
 * Validated field with resolved type and generator information.
 */
export interface ValidatedField {
  /** Reference to original AST node */
  readonly node: FieldNode;

  /** Resolved type information */
  readonly resolvedType: string;

  /** Resolved generator name (if specified) */
  readonly resolvedGenerator: string | undefined;

  /** Extracted template field references (e.g., from {{fieldName}}) */
  readonly templateReferences: readonly string[];

  /** Referenced schema name when field uses @schema:<SchemaName> syntax */
  readonly referencedSchema?: string;
}
