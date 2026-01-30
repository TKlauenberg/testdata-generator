/**
 * DSL Keywords and Operators
 *
 * Defines reserved keywords and operator symbols for the DSL.
 * Provides utility functions for checking if an identifier is a keyword.
 */

import { KEYWORD_VALUES, OPERATOR_VALUES } from './tokens';
import type { KeywordType, OperatorType } from './tokens';

/**
 * Set of DSL reserved keywords.
 *
 * These keywords have special meaning in the DSL and cannot be used as identifiers.
 * Keywords are case-sensitive: 'schema' is a keyword, 'Schema' is not.
 */
const DSL_KEYWORDS: ReadonlySet<KeywordType> = new Set(KEYWORD_VALUES);

/**
 * Set of valid operator symbols.
 *
 * Used for validation in the scanner.
 */
const DSL_OPERATORS: ReadonlySet<OperatorType> = new Set(OPERATOR_VALUES);

/**
 * Check if a string is a DSL keyword.
 *
 * @param text - String to check
 * @returns true if text is a keyword, false otherwise
 *
 * @example
 * ```typescript
 * isKeyword('schema')    // true
 * isKeyword('Schema')    // false (case-sensitive)
 * isKeyword('myField')   // false
 * ```
 */
export function isKeyword(text: string): text is KeywordType {
  return DSL_KEYWORDS.has(text as KeywordType);
}

/**
 * Check if a string is a valid operator.
 *
 * @param text - String to check
 * @returns true if text is a valid operator, false otherwise
 *
 * @example
 * ```typescript
 * isOperator(':')    // true
 * isOperator('->')   // true
 * isOperator('??')   // false
 * ```
 */
export function isOperator(text: string): text is OperatorType {
  return DSL_OPERATORS.has(text as OperatorType);
}

/**
 * Get all DSL keywords as an array.
 *
 * @returns Array of all keyword strings
 */
export function getKeywords(): readonly KeywordType[] {
  return Array.from(DSL_KEYWORDS);
}

/**
 * Get all DSL operators as an array.
 *
 * @returns Array of all operator strings
 */
export function getOperators(): readonly OperatorType[] {
  return Array.from(DSL_OPERATORS);
}
