import type { SourceLocation } from '../common/diagnostic';

/**
 * Discriminator for all AST node types.
 * Used in discriminated unions to enable type-safe exhaustive checking.
 */
export type NodeKind = 'program' | 'schema' | 'field' | 'profile' | 'context' | 'import'; // Reserved for future use

/**
 * Base interface for all AST nodes.
 * All nodes include a discriminator kind and source location for error reporting.
 */
export interface ASTNode {
  readonly kind: NodeKind;
  readonly location: SourceLocation;
}

/**
 * Literal value types that can appear in the DSL.
 * Used for generator parameters and constraint values.
 */
export type LiteralValue =
  | string
  | number
  | boolean
  | readonly LiteralValue[]
  | { readonly [key: string]: LiteralValue };

/**
 * Named parameter passed to a generator function.
 * @example { name: 'min', value: 1 }
 * @example { name: 'length', value: 20 }
 */
export interface GeneratorParameter {
  readonly name: string;
  readonly value: LiteralValue;
}

/**
 * Specification of a generator function and its parameters.
 * @example { name: 'uuid', parameters: [] }
 * @example { name: 'randomInt', parameters: [{ name: 'min', value: 1 }, { name: 'max', value: 100 }] }
 */
export interface GeneratorSpec {
  readonly name: string;
  readonly parameters?: readonly GeneratorParameter[];
}

/**
 * Constraints and validation rules for a field.
 * @example { unique: true }
 */
export interface FieldConstraints {
  readonly unique?: boolean;
  // Future constraints: min?, max?, pattern?, etc.
}

/**
 * Schema-wide field constraint defaults.
 * Applied to fields that do not define an explicit field-level constraint.
 */
export interface SchemaDefaultConstraints {
  readonly unique?: boolean;
}

/**
 * Field definition within a schema.
 * Defines a single field with type, optional generator, and constraints.
 *
 * @example
 * ```typescript
 * const emailField: FieldNode = {
 *   kind: 'field',
 *   name: 'email',
 *   type: 'string',
 *   generator: { name: 'email', parameters: [] },
 *   constraints: { unique: true },
 *   location: { file: 'users.td', line: 3, column: 3, length: 30 }
 * };
 * ```
 */
export interface FieldNode extends ASTNode {
  readonly kind: 'field';
  readonly name: string;
  readonly type: string;
  readonly generator?: GeneratorSpec;
  readonly constraints?: FieldConstraints;
  readonly location: SourceLocation;
}

/**
 * Schema declaration defining a data structure with named fields.
 * A schema represents a record type that can be generated.
 *
 * @example
 * ```typescript
 * const userSchema: SchemaNode = {
 *   kind: 'schema',
 *   name: 'User',
 *   fields: [
 *     { kind: 'field', name: 'id', type: 'string', generator: { name: 'uuid' }, location: {...} },
 *     { kind: 'field', name: 'email', type: 'string', generator: { name: 'email' }, location: {...} }
 *   ],
 *   compositeUniques: [['email', 'tenantId']],
 *   location: { file: 'users.td', line: 1, column: 1, length: 50 }
 * };
 * ```
 */
export interface SchemaNode extends ASTNode {
  readonly kind: 'schema';
  readonly name: string;
  readonly defaults?: SchemaDefaults;
  readonly fields: readonly FieldNode[];
  readonly compositeUniques?: readonly (readonly string[])[];
  readonly location: SourceLocation;
}

/**
 * Explicit schema-level defaults declared in an `@defaults` block.
 * These defaults participate in precedence resolution during validation.
 */
export interface SchemaDefaults {
  readonly generatorDefaults?: readonly DefaultSpec[];
  readonly constraints?: SchemaDefaultConstraints;
  readonly location: SourceLocation;
}

/**
 * Default generator specification for a field type pattern.
 * Used in generation profiles to define default mappings.
 * @example { fieldType: 'string', generator: { name: 'randomString', parameters: [{ name: 'length', value: 20 }] } }
 */
export interface DefaultSpec {
  readonly fieldType: string;
  readonly generator: GeneratorSpec;
}

/**
 * Generation profile defining default settings (future use).
 * Profiles specify default generator mappings for types.
 *
 * @example
 * ```typescript
 * const standardProfile: ProfileNode = {
 *   kind: 'profile',
 *   name: 'Standard',
 *   defaults: [
 *     { fieldType: 'string', generator: { name: 'randomString', parameters: [{ name: 'length', value: 20 }] } }
 *   ],
 *   location: { file: 'profiles.td', line: 1, column: 1, length: 100 }
 * };
 * ```
 */
export interface ProfileNode extends ASTNode {
  readonly kind: 'profile';
  readonly name: string;
  readonly defaults: readonly DefaultSpec[];
  readonly location: SourceLocation;
}

/**
 * Context node for loading external data sources (Epic 8 - future use).
 * Contexts allow referencing external JSON/CSV data during generation.
 * @example { kind: 'context', name: 'UserData', location: {...} }
 */
export interface ContextNode extends ASTNode {
  readonly kind: 'context';
  readonly name: string;
  readonly location: SourceLocation;
}

/**
 * Top-level import declaration for loading reusable DSL files.
 */
export interface ImportNode extends ASTNode {
  readonly kind: 'import';
  readonly path: string;
  readonly location: SourceLocation;
}

/**
 * Top-level declarations that can appear in a DSL file.
 * Discriminated union enabling type-safe exhaustive checking.
 */
export type Declaration = SchemaNode | ProfileNode | ContextNode | ImportNode;

/**
 * Root node containing all top-level declarations in a DSL file.
 * This is the final output of the parser.
 *
 * @example
 * ```typescript
 * const program: Program = {
 *   kind: 'program',
 *   declarations: [
 *     { kind: 'schema', name: 'User', fields: [...], location: {...} }
 *   ],
 *   location: { file: 'users.td', line: 1, column: 1, length: 100 }
 * };
 * ```
 */
export interface Program extends ASTNode {
  readonly kind: 'program';
  readonly declarations: readonly Declaration[];
  readonly location: SourceLocation;
}

// Type Guards

/**
 * Type guard to check if a node is a SchemaNode.
 * @param node - The node to check
 * @returns true if the node is a SchemaNode
 */
export function isSchemaNode(node: ASTNode): node is SchemaNode {
  return node.kind === 'schema';
}

/**
 * Type guard to check if a node is a FieldNode.
 * @param node - The node to check
 * @returns true if the node is a FieldNode
 */
export function isFieldNode(node: ASTNode): node is FieldNode {
  return node.kind === 'field';
}

/**
 * Type guard to check if a node is a ProfileNode.
 * @param node - The node to check
 * @returns true if the node is a ProfileNode
 */
export function isProfileNode(node: ASTNode): node is ProfileNode {
  return node.kind === 'profile';
}

/**
 * Type guard to check if a node is a ContextNode.
 * @param node - The node to check
 * @returns true if the node is a ContextNode
 */
export function isContextNode(node: ASTNode): node is ContextNode {
  return node.kind === 'context';
}

/**
 * Type guard to check if a node is an ImportNode.
 * @param node - The node to check
 * @returns true if the node is an ImportNode
 */
export function isImportNode(node: ASTNode): node is ImportNode {
  return node.kind === 'import';
}

/**
 * Type guard to check if a node is a Program node.
 * @param node - The node to check
 * @returns true if the node is a Program node
 */
export function isProgramNode(node: ASTNode): node is Program {
  return node.kind === 'program';
}
