/**
 * Scanner (Lexical Analyzer) for DSL
 *
 * Converts DSL source code into a stream of tokens.
 * Handles keywords, identifiers, strings, numbers, and operators.
 * Collects all lexical errors without stopping (error accumulation pattern).
 *
 * Key features:
 * - 1-indexed line and column tracking
 * - Multi-error collection (doesn't stop at first error)
 * - Escape sequence handling in strings
 * - QA-friendly error messages
 */

import type { Diagnostic, SourceLocation } from '../common/diagnostic';
import { invalidCharacter, unterminatedString } from '../common/diagnostic';
import type { Result } from '../common/result';
import { err, ok } from '../common/result';
import { getOperators, isKeyword, isOperator } from './keywords';
import type { OperatorType, Token } from './tokens';

const OPERATOR_START_CHARS = new Set(getOperators().map((operator) => operator[0]));

/**
 * Scanner class for lexical analysis.
 *
 * Converts DSL source code into tokens with source location information.
 * Uses character-by-character scanning with lookahead support.
 * Accumulates errors and continues scanning to find all issues.
 *
 * @example
 * ```typescript
 * const scanner = new Scanner('schema User { }', 'user.td');
 * const result = scanner.scan();
 *
 * if (result.ok) {
 *   console.log(result.value); // Token[]
 * } else {
 *   console.error(result.errors); // Diagnostic[]
 * }
 * ```
 */
export class Scanner {
  /** Source code being scanned */
  private readonly _source: string;

  /** Filename for error reporting */
  private readonly _filename: string;

  /** Current position in source (0-indexed internally) */
  private _position: number;

  /** Current line number (1-indexed for output) */
  private _line: number;

  /** Current column number (1-indexed for output) */
  private _column: number;

  /** Accumulated tokens */
  private _tokens: Token[];

  /** Accumulated error diagnostics */
  private _diagnostics: Diagnostic[];

  /**
   * Creates a new Scanner instance.
   *
   * @param source - DSL source code to scan
   * @param filename - Filename for error reporting
   */
  constructor(source: string, filename: string) {
    this._source = source;
    this._filename = filename;
    this._position = 0;
    this._line = 1; // 1-indexed
    this._column = 1; // 1-indexed
    this._tokens = [];
    this._diagnostics = [];
  }

  /**
   * Scans the source code and returns tokens or errors.
   *
   * This is the main entry point for the scanner.
   * Continues scanning after errors to collect all issues.
   *
   * @returns Result containing tokens or diagnostics
   */
  public scan(): Result<Token[], Diagnostic[]> {
    while (!this._isAtEnd()) {
      this._skipWhitespace();
      if (this._isAtEnd()) break;

      const startLine = this._line;
      const startColumn = this._column;

      const char = this._peek();

      // Identifiers and keywords
      if (this._isAlpha(char)) {
        this._scanIdentifier(startLine, startColumn);
        continue;
      }

      // Numbers
      if (this._isDigit(char)) {
        this._scanNumber(startLine, startColumn);
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this._scanString(startLine, startColumn, char);
        continue;
      }

      // Operators
      if (this._isOperatorStart(char)) {
        this._scanOperator(startLine, startColumn);
        continue;
      }

      // Invalid character
      this._diagnostics.push(
        invalidCharacter(
          {
            file: this._filename,
            line: startLine,
            column: startColumn,
            length: 1,
          },
          char,
          'Remove this character or escape it in a string',
        ),
      );
      this._advance(); // Skip invalid character and continue
    }

    // Add EOF token
    this._tokens.push({
      kind: 'eof',
      location: {
        file: this._filename,
        line: this._line,
        column: this._column,
        length: 0,
      },
    });

    // Return result
    if (this._diagnostics.length > 0) {
      return err(this._diagnostics);
    }
    return ok(this._tokens);
  }

  // ===========================================================================
  // Character-level operations
  // ===========================================================================

  /**
   * Advance to next character and return the consumed character.
   *
   * Updates line and column tracking.
   * Handles different line ending styles (\n, \r\n, \r).
   *
   * @returns The character that was consumed
   */
  private _advance(): string {
    const char = this._source[this._position];
    this._position++;

    // Handle line endings
    if (char === '\n') {
      this._line++;
      this._column = 1;
    } else if (char === '\r') {
      // Handle \r\n (Windows) and \r (old Mac)
      if (this._peek() === '\n') {
        this._position++; // Skip the \n in \r\n
      }
      this._line++;
      this._column = 1;
    } else {
      this._column++;
    }

    return char;
  }

  /**
   * Look ahead without consuming characters.
   *
   * @param offset - Number of characters to look ahead (default: 0)
   * @returns The character at the specified offset, or empty string if at/past EOF
   */
  private _peek(offset: number = 0): string {
    const pos = this._position + offset;
    if (pos >= this._source.length) {
      return '';
    }
    return this._source[pos];
  }

  /**
   * Check if scanner is at end of file.
   *
   * @returns true if at or past end of source
   */
  private _isAtEnd(): boolean {
    return this._position >= this._source.length;
  }

  /**
   * Conditionally advance if the next character matches expected.
   *
   * @param expected - The character to match
   * @returns true if matched and advanced, false otherwise
   */
  private _match(expected: string): boolean {
    if (this._isAtEnd()) return false;
    if (this._peek() !== expected) return false;
    this._advance();
    return true;
  }

  // ===========================================================================
  // Character classification helpers
  // ===========================================================================

  /**
   * Check if character is alphabetic (a-z, A-Z) or underscore.
   *
   * @param char - Character to check
   * @returns true if alphabetic or underscore
   */
  private _isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  /**
   * Check if character is a digit (0-9).
   *
   * @param char - Character to check
   * @returns true if digit
   */
  private _isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is alphanumeric or underscore.
   *
   * @param char - Character to check
   * @returns true if alphanumeric or underscore
   */
  private _isAlphaNumeric(char: string): boolean {
    return this._isAlpha(char) || this._isDigit(char);
  }

  /**
   * Check if character is whitespace.
   *
   * @param char - Character to check
   * @returns true if whitespace
   */
  private _isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  /**
   * Check if character can start an operator.
   *
   * @param char - Character to check
   * @returns true if operator start character
   */
  private _isOperatorStart(char: string): boolean {
    return OPERATOR_START_CHARS.has(char);
  }

  // ===========================================================================
  // Whitespace handling
  // ===========================================================================

  /**
   * Skip whitespace and comments.
   *
   * Updates line and column tracking while skipping.
   */
  private _skipWhitespace(): void {
    while (!this._isAtEnd()) {
      const char = this._peek();
      if (this._isWhitespace(char)) {
        this._advance();
      } else {
        break;
      }
    }
  }

  // ===========================================================================
  // Token scanning methods
  // ===========================================================================

  /**
   * Scan an identifier or keyword token.
   *
   * Identifiers start with alpha or underscore, continue with alphanumeric or underscore.
   * Checks if identifier matches a keyword.
   *
   * @param startLine - Starting line number (1-indexed)
   * @param startColumn - Starting column number (1-indexed)
   */
  private _scanIdentifier(startLine: number, startColumn: number): void {
    const start = this._position;
    this._advance(); // Consume first character (already checked as alpha)

    // Continue while alphanumeric or underscore
    while (!this._isAtEnd() && this._isAlphaNumeric(this._peek())) {
      this._advance();
    }

    const value = this._source.substring(start, this._position);
    const length = this._position - start;

    const location: SourceLocation = {
      file: this._filename,
      line: startLine,
      column: startColumn,
      length,
    };

    // Check if identifier is a keyword
    if (isKeyword(value)) {
      this._tokens.push({
        kind: 'keyword',
        value: value,
        location,
      });
    } else {
      this._tokens.push({
        kind: 'identifier',
        value,
        location,
      });
    }
  }

  /**
   * Scan a string literal token.
   *
   * Handles escape sequences: \n, \t, \\, \", \'
   * Collects error for unterminated strings but continues scanning.
   *
   * @param startLine - Starting line number (1-indexed)
   * @param startColumn - Starting column number (1-indexed)
   * @param quote - Opening quote character (" or ')
   */
  private _scanString(startLine: number, startColumn: number, quote: string): void {
    const start = this._position;
    this._advance(); // Consume opening quote

    let value = '';
    let terminated = false;

    while (!this._isAtEnd()) {
      const char = this._peek();

      // Newline before closing quote => unterminated string (stop to recover)
      if (char === '\n' || char === '\r') {
        break;
      }

      // Closing quote
      if (char === quote) {
        this._advance();
        terminated = true;
        break;
      }

      // Escape sequences
      if (char === '\\') {
        this._advance(); // Consume backslash
        if (this._isAtEnd()) break;

        const escapeChar = this._peek();
        this._advance();

        switch (escapeChar) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            // Invalid escape sequence - keep as-is
            value += '\\' + escapeChar;
            break;
        }
      } else {
        value += char;
        this._advance();
      }
    }

    const length = this._position - start;
    const location: SourceLocation = {
      file: this._filename,
      line: startLine,
      column: startColumn,
      length,
    };

    if (!terminated) {
      // Unterminated string - report error but continue scanning
      this._diagnostics.push(
        unterminatedString(location, `Add closing ${quote} at the end of the string`),
      );
    } else {
      // Successfully scanned string
      this._tokens.push({
        kind: 'string',
        value,
        location,
      });
    }
  }

  /**
   * Scan a numeric literal token.
   *
   * Handles integers and floats (with decimal point).
   *
   * @param startLine - Starting line number (1-indexed)
   * @param startColumn - Starting column number (1-indexed)
   */
  private _scanNumber(startLine: number, startColumn: number): void {
    const start = this._position;

    // Consume digits
    while (!this._isAtEnd() && this._isDigit(this._peek())) {
      this._advance();
    }

    // Check for decimal point
    if (this._peek() === '.' && this._isDigit(this._peek(1))) {
      this._advance(); // Consume '.'

      // Consume fractional digits
      while (!this._isAtEnd() && this._isDigit(this._peek())) {
        this._advance();
      }
    }

    const text = this._source.substring(start, this._position);
    const value = Number(text);
    const length = this._position - start;

    const location: SourceLocation = {
      file: this._filename,
      line: startLine,
      column: startColumn,
      length,
    };

    this._tokens.push({
      kind: 'number',
      value,
      location,
    });
  }

  /**
   * Scan an operator token.
   *
   * Handles single-character operators and multi-character operators (->).
   *
   * @param startLine - Starting line number (1-indexed)
   * @param startColumn - Starting column number (1-indexed)
   */
  private _scanOperator(startLine: number, startColumn: number): void {
    const start = this._position;
    const first = this._advance();

    // Check for multi-character operators
    let value = first;
    if (first === '-' && this._peek() === '>') {
      this._advance();
      value = '->';
    }

    if (!isOperator(value)) {
      this._diagnostics.push(
        invalidCharacter(
          {
            file: this._filename,
            line: startLine,
            column: startColumn,
            length: this._position - start,
          },
          value,
          value === '-'
            ? 'Use the arrow operator (->) or remove this character'
            : 'Remove this character or escape it in a string',
        ),
      );
      return;
    }

    const length = this._position - start;
    const location: SourceLocation = {
      file: this._filename,
      line: startLine,
      column: startColumn,
      length,
    };

    this._tokens.push({
      kind: 'operator',
      value: value,
      location,
    });
  }
}

/**
 * Convenience function for scanning DSL source code.
 *
 * @param source - DSL source code to scan
 * @param filename - Filename for error reporting (default: '<anonymous>')
 * @returns Result containing tokens or diagnostics
 *
 * @example
 * ```typescript
 * const result = scan('schema User { }', 'user.td');
 * ```
 */
export function scan(
  source: string,
  filename: string = '<anonymous>',
): Result<Token[], Diagnostic[]> {
  const scanner = new Scanner(source, filename);
  return scanner.scan();
}
