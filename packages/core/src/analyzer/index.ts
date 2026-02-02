/**
 * Semantic Analyzer Module
 *
 * Provides symbol table and semantic analysis functionality for validating
 * DSL programs, detecting errors, and building semantic information.
 */

export { SymbolTable } from './symbolTable';
export type { Symbol, SymbolKind } from './symbolTable';

// Re-export AST types used in symbol table API
export type { ContextNode, ProfileNode } from '../parser/ast';
