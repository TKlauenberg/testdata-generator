/**
 * Symbol Table for Semantic Analysis
 *
 * Tracks all symbols (schemas, fields, contexts, profiles) defined in the program.
 * Enables validation of references, detection of duplicate definitions, and supports
 * nested scopes for schema-level and field-level symbols.
 *
 * @example
 * ```typescript
 * const table = new SymbolTable();
 *
 * // Define a schema
 * table.defineSchema('User', schemaNode);
 *
 * // Define fields within schema
 * table.defineField('User', 'id', fieldNode);
 * table.defineField('User', 'email', fieldNode);
 *
 * // Lookup symbols
 * const userSchema = table.lookupSchema('User');
 * const emailField = table.lookupField('User', 'email');
 * ```
 */

import type { Result } from '../common/result';
import { ok, err } from '../common/result';
import type { Diagnostic, SourceLocation } from '../common/diagnostic';
import { createDiagnostic } from '../common/diagnostic';
import type { ASTNode, SchemaNode, FieldNode, ContextNode, ProfileNode } from '../parser/ast';

/**
 * Type of symbol in the symbol table.
 *
 * - `schema`: Top-level schema definition
 * - `field`: Field within a schema
 * - `context`: Context definition for data sources
 * - `profile`: Profile definition for generator configurations
 */
export type SymbolKind = 'schema' | 'field' | 'context' | 'profile';

/**
 * Symbol entry in the symbol table.
 *
 * Represents a named entity (schema, field, context, profile) with its kind,
 * AST node reference, and source location.
 */
export interface Symbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly astNode: ASTNode;
  readonly location: SourceLocation;
  readonly scope?: string;
}

/**
 * Scope structure for managing nested symbol visibility.
 *
 * Supports hierarchy: global scope → schema scope → field scope
 */
interface Scope {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly symbols: Map<string, Symbol>;
  readonly parent: Scope | null;
}

/**
 * Symbol table for tracking all symbols in the program.
 *
 * Provides methods to define and lookup symbols with duplicate detection,
 * nested scope support, and comprehensive error reporting.
 */
export class SymbolTable {
  /** Schema symbols */
  private readonly _schemas: Map<string, Symbol> = new Map();

  /** Context symbols */
  private readonly _contexts: Map<string, Symbol> = new Map();

  /** Profile symbols */
  private readonly _profiles: Map<string, Symbol> = new Map();

  /** Schema-scoped symbol tables (fields within each schema) */
  private readonly _schemaScopes: Map<string, Map<string, Symbol>> = new Map();

  /** Current scope stack for nested scope management */
  private readonly _scopeStack: Scope[] = [];

  /** Current active scope (null = global scope) */
  private _currentScope: Scope | null = null;

  /**
   * Define a schema in the global scope.
   *
   * @param name - Schema name
   * @param node - Schema AST node
   * @returns Result with void on success, or error diagnostic on duplicate
   *
   * @example
   * ```typescript
   * const result = table.defineSchema('User', schemaNode);
   * if (!result.ok) {
   *   console.error(result.errors[0].message);
   * }
   * ```
   */
  public defineSchema(name: string, node: SchemaNode): Result<void, Diagnostic[]> {
    return this._defineInGlobalScope(name, 'schema', node);
  }

  /**
   * Lookup a schema in the global scope.
   *
   * @param name - Schema name
   * @returns Symbol if found, undefined otherwise
   */
  public lookupSchema(name: string): Symbol | undefined {
    return this._schemas.get(name);
  }

  /**
   * Define a field within a schema.
   *
   * @param schemaName - Name of the schema containing the field
   * @param fieldName - Field name
   * @param node - Field AST node
   * @returns Result with void on success, or error diagnostic on duplicate
   */
  public defineField(
    schemaName: string,
    fieldName: string,
    node: FieldNode,
  ): Result<void, Diagnostic[]> {
    // Get or create schema scope
    let schemaScope = this._schemaScopes.get(schemaName);
    if (!schemaScope) {
      schemaScope = new Map();
      this._schemaScopes.set(schemaName, schemaScope);
    }

    // Check for duplicate field in this schema
    const existing = schemaScope.get(fieldName);
    if (existing) {
      const diagnostic = createDiagnostic({
        code: 'analyzer.duplicateField',
        message: `Field '${fieldName}' is already defined in schema '${schemaName}'`,
        severity: 'error',
        location: node.location,
        suggestion: `Rename this field to avoid conflict with the existing definition`,
        related: [
          createDiagnostic({
            code: 'analyzer.duplicateField.original',
            message: `Field '${fieldName}' first defined here`,
            severity: 'info',
            location: existing.location,
          }),
        ],
      });
      return err([diagnostic]);
    }

    // Define field symbol
    const symbol: Symbol = {
      name: fieldName,
      kind: 'field',
      astNode: node,
      location: node.location,
      scope: schemaName,
    };

    schemaScope.set(fieldName, symbol);
    return ok(undefined);
  }

  /**
   * Lookup a field within a schema.
   *
   * @param schemaName - Name of the schema containing the field
   * @param fieldName - Field name
   * @returns Symbol if found, undefined otherwise
   */
  public lookupField(schemaName: string, fieldName: string): Symbol | undefined {
    const schemaScope = this._schemaScopes.get(schemaName);
    return schemaScope?.get(fieldName);
  }

  /**
   * Define a context in the global scope.
   *
   * @param name - Context name
   * @param node - Context AST node
   * @returns Result with void on success, or error diagnostic on duplicate
   */
  public defineContext(name: string, node: ContextNode): Result<void, Diagnostic[]> {
    return this._defineInGlobalScope(name, 'context', node);
  }

  /**
   * Lookup a context in the global scope.
   *
   * @param name - Context name
   * @returns Symbol if found, undefined otherwise
   */
  public lookupContext(name: string): Symbol | undefined {
    return this._contexts.get(name);
  }

  /**
   * Define a profile in the global scope.
   *
   * @param name - Profile name
   * @param node - Profile AST node
   * @returns Result with void on success, or error diagnostic on duplicate
   */
  public defineProfile(name: string, node: ProfileNode): Result<void, Diagnostic[]> {
    return this._defineInGlobalScope(name, 'profile', node);
  }

  /**
   * Lookup a profile in the global scope.
   *
   * @param name - Profile name
   * @returns Symbol if found, undefined otherwise
   */
  public lookupProfile(name: string): Symbol | undefined {
    return this._profiles.get(name);
  }

  /**
   * Enter a new scope (push onto scope stack).
   *
   * @param scopeName - Name of the scope
   * @param kind - Kind of the scope (schema, field, etc.)
   */
  public enterScope(scopeName: string, kind: SymbolKind): void {
    const newScope: Scope = {
      name: scopeName,
      kind,
      symbols: new Map(),
      parent: this._currentScope,
    };
    this._scopeStack.push(newScope);
    this._currentScope = newScope;
  }

  /**
   * Exit the current scope (pop from scope stack).
   */
  public exitScope(): void {
    if (this._scopeStack.length === 0) {
      return;
    }
    this._scopeStack.pop();
    this._currentScope =
      this._scopeStack.length > 0 ? this._scopeStack[this._scopeStack.length - 1] : null;
  }

  /**
   * Get all symbols defined in the symbol table.
   *
   * @returns Array of all symbols (global + all schema fields)
   */
  public getAllSymbols(): Symbol[] {
    const symbols: Symbol[] = [];

    // Add schema symbols
    for (const symbol of this._schemas.values()) {
      symbols.push(symbol);
    }

    // Add context symbols
    for (const symbol of this._contexts.values()) {
      symbols.push(symbol);
    }

    // Add profile symbols
    for (const symbol of this._profiles.values()) {
      symbols.push(symbol);
    }

    // Add all field symbols from all schemas
    for (const schemaScope of this._schemaScopes.values()) {
      for (const symbol of schemaScope.values()) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  /**
   * Check if a symbol exists in any scope.
   *
   * @param name - Symbol name
   * @returns true if symbol exists, false otherwise
   */
  public hasSymbol(name: string): boolean {
    // Check schemas, contexts, and profiles
    if (this._schemas.has(name) || this._contexts.has(name) || this._profiles.has(name)) {
      return true;
    }

    // Check all schema scopes
    for (const schemaScope of this._schemaScopes.values()) {
      if (schemaScope.has(name)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Define a symbol in the global scope.
   * Used internally by defineSchema, defineContext, defineProfile.
   *
   * @param name - Symbol name
   * @param kind - Symbol kind
   * @param node - AST node
   * @returns Result with void on success, or error diagnostic on duplicate
   */
  private _defineInGlobalScope(
    name: string,
    kind: SymbolKind,
    node: ASTNode,
  ): Result<void, Diagnostic[]> {
    // Get the appropriate map based on kind
    const symbolMap =
      kind === 'schema' ? this._schemas : kind === 'context' ? this._contexts : this._profiles;

    // Check for duplicate
    const existing = symbolMap.get(name);
    if (existing?.kind === kind) {
      const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
      const diagnostic = createDiagnostic({
        code: `analyzer.duplicate${kindLabel}`,
        message: `${kindLabel} '${name}' is already defined`,
        severity: 'error',
        location: node.location,
        suggestion: `Rename this ${kind} to avoid conflict with the existing definition`,
        related: [
          createDiagnostic({
            code: `analyzer.duplicate${kindLabel}.original`,
            message: `${kindLabel} '${name}' first defined here`,
            severity: 'info',
            location: existing.location,
          }),
        ],
      });
      return err([diagnostic]);
    }

    // Define symbol
    const symbol: Symbol = {
      name,
      kind,
      astNode: node,
      location: node.location,
    };

    symbolMap.set(name, symbol);
    return ok(undefined);
  }
}
