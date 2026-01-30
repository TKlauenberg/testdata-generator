/**
 * Scanner Module
 *
 * Lexical analysis for DSL source code.
 * Converts text into tokens for parsing.
 */

export { scan, Scanner } from './scanner';
export type { Token, TokenKind, KeywordType, OperatorType } from './tokens';
export { isKeyword, isOperator, getKeywords, getOperators } from './keywords';
