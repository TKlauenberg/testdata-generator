/**
 * Token Types and Discriminated Union for Scanner
 *
 * Defines token types produced by the lexical scanner.
 * Uses discriminated union pattern for type-safe token handling.
 * All token types include source location information for error reporting.
 *
 * Token kinds represent different lexical elements:
 * - keyword: Reserved DSL keywords (schema, profile, context, unique, template)
 * - identifier: User-defined names (schema names, field names, etc.)
 * - string: String literals with escape sequences
 * - number: Numeric literals (integers and floats)
 * - operator: Syntactic operators (:, {, }, etc.)
 * - eof: End-of-file marker
 */

import type { SourceLocation } from '../common/diagnostic';

/**
 * Token kinds (discriminator for Token union).
 */
export type TokenKind = 'keyword' | 'identifier' | 'string' | 'number' | 'operator' | 'eof';

/**
 * DSL keyword values.
 *
 * These are reserved words that have special meaning in the DSL.
 */
export const KEYWORD_VALUES = ['schema', 'profile', 'context', 'unique', 'template'] as const;
export type KeywordType = (typeof KEYWORD_VALUES)[number];

/**
 * Operator symbols used in the DSL.
 */
export const OPERATOR_VALUES = [':', ',', '{', '}', '[', ']', '(', ')', '=', '->', '@'] as const;
export type OperatorType = (typeof OPERATOR_VALUES)[number];

/**
 * Token discriminated union.
 *
 * All tokens include:
 * - kind: Discriminator for type narrowing
 * - location: Source location (1-indexed line/column)
 *
 * Token-specific fields:
 * - keyword: value (KeywordType)
 * - identifier: value (string)
 * - string: value (string) - interpreted with escape sequences
 * - number: value (number) - converted to JavaScript number
 * - operator: value (OperatorType)
 * - eof: no additional fields
 *
 * @example
 * ```typescript
 * // Keyword token
 * const token: Token = {
 *   kind: 'keyword',
 *   value: 'schema',
 *   location: { file: 'test.td', line: 1, column: 1, length: 6 }
 * };
 *
 * // Type narrowing with discriminated union
 * if (token.kind === 'keyword') {
 *   console.log(token.value); // KeywordType
 * }
 * ```
 */
export type Token =
  | {
      readonly kind: 'keyword';
      readonly value: KeywordType;
      readonly location: SourceLocation;
    }
  | {
      readonly kind: 'identifier';
      readonly value: string;
      readonly location: SourceLocation;
    }
  | {
      readonly kind: 'string';
      readonly value: string;
      readonly location: SourceLocation;
    }
  | {
      readonly kind: 'number';
      readonly value: number;
      readonly location: SourceLocation;
    }
  | {
      readonly kind: 'operator';
      readonly value: OperatorType;
      readonly location: SourceLocation;
    }
  | {
      readonly kind: 'eof';
      readonly location: SourceLocation;
    };
