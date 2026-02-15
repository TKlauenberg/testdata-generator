/**
 * Recursive Descent Parser for TestData DSL
 *
 * Transforms a token stream into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing where each grammar rule becomes a method.
 * Accumulates all syntax errors without stopping at the first error.
 *
 * @module parser
 */

import type { Token, TokenKind } from '../scanner/tokens';
import type {
  Program,
  SchemaNode,
  FieldNode,
  GeneratorSpec,
  GeneratorParameter,
  FieldConstraints,
  LiteralValue,
} from './ast';
import type { Diagnostic, SourceLocation } from '../common/diagnostic';
import type { Result } from '../common/result';

/**
 * Recursive descent parser that builds an AST from tokens.
 *
 * The parser uses a single-pass approach with error recovery:
 * - Collects all syntax errors without stopping
 * - Synchronizes to recovery points after errors
 * - Provides helpful, contextual error messages
 * - Tracks source locations precisely for diagnostics
 *
 * @example
 * ```typescript
 * const tokens = scan(source);
 * if (tokens.ok) {
 *   const parser = new Parser(tokens.value);
 *   const ast = parser.parse();
 *   if (ast.ok) {
 *     console.log('Parsed program:', ast.value);
 *   } else {
 *     console.error('Parse errors:', ast.errors);
 *   }
 * }
 * ```
 */
export class Parser {
  /** Maximum number of tokens to prevent DoS attacks with massive files */
  private static readonly _maxTokenCount = 100_000;

  private readonly _tokens: Token[];
  private _current: number = 0;
  private readonly _errors: Diagnostic[] = [];

  /**
   * Creates a new Parser instance.
   *
   * @param tokens - Array of tokens from the scanner (must include EOF token)
   * @throws Error if tokens array is invalid (empty, missing EOF, or exceeds max count)
   */
  constructor(tokens: Token[]) {
    // Security: Validate input tokens
    if (!tokens || tokens.length === 0) {
      throw new Error('Parser requires a non-empty token array');
    }

    // Security: Prevent DoS via excessively large token streams
    if (tokens.length > Parser._maxTokenCount) {
      throw new Error(
        `Token count (${tokens.length}) exceeds maximum allowed (${Parser._maxTokenCount}). ` +
          `Consider splitting the file or checking for malformed input.`,
      );
    }

    // Validate that token array ends with EOF token
    const lastToken = tokens[tokens.length - 1];
    if (lastToken.kind !== 'eof') {
      throw new Error('Token array must end with an EOF token');
    }

    this._tokens = tokens;
  }

  /**
   * Parse the complete token stream into an AST.
   *
   * Entry point for parsing. Attempts to parse all declarations until EOF.
   * Accumulates all syntax errors and returns them together.
   *
   * @returns Result containing Program AST or array of parse errors
   */
  parse(): Result<Program, Diagnostic[]> {
    return this._parseProgram();
  }

  // ==================== Token Navigation ====================

  /**
   * Returns the current token without advancing.
   * @throws Error if current index is out of bounds (internal parser error)
   */
  private _currentToken(): Token {
    // Defensive check: should never happen in normal operation
    // because _isAtEnd() checks for EOF token, but prevents undefined access
    if (this._current < 0 || this._current >= this._tokens.length) {
      throw new Error(
        `Parser internal error: current index ${this._current} out of bounds [0, ${this._tokens.length})`,
      );
    }
    return this._tokens[this._current];
  }

  /**
   * Returns a token at offset from current position without advancing.
   *
   * @param offset - Number of tokens ahead to peek (default: 1)
   */
  private _peek(offset: number = 1): Token {
    const index = this._current + offset;
    return index < this._tokens.length
      ? this._tokens[index]
      : this._tokens[this._tokens.length - 1];
  }

  /**
   * Advances to next token and returns the previous current token.
   */
  private _advance(): Token {
    if (!this._isAtEnd()) {
      this._current++;
    }
    return this._tokens[this._current - 1];
  }

  /**
   * Checks if parser has reached end of file.
   */
  private _isAtEnd(): boolean {
    return this._currentToken().kind === 'eof';
  }

  /**
   * Checks if current token matches the given kind and optional value.
   *
   * @param kind - Expected token kind
   * @param value - Optional expected value (for keywords/operators/identifiers)
   */
  private _check(kind: TokenKind, value?: string): boolean {
    const token = this._currentToken();
    if (token.kind !== kind) return false;
    if (value === undefined) return true;

    // Type narrowing based on kind
    if (kind === 'keyword' && token.kind === 'keyword') {
      return token.value === value;
    }
    if (kind === 'operator' && token.kind === 'operator') {
      return token.value === value;
    }
    if (kind === 'identifier' && token.kind === 'identifier') {
      return token.value === value;
    }

    return false;
  }

  /**
   * Expects a token of given kind (and optional value), advancing if match.
   * Records an error if token doesn't match.
   *
   * @param kind - Expected token kind
   * @param value - Optional expected value (for keywords/operators)
   * @returns Result containing matched token or error
   */
  private _expect(kind: TokenKind, value?: string): Result<Token, Diagnostic[]> {
    const token = this._currentToken();

    if (!this._check(kind, value)) {
      const expectedDesc = value ? `'${value}'` : kind;
      const foundDesc = this._tokenDescription(token);

      const suggestions = this._getSuggestions(kind, value, token);
      const diagnostic: Diagnostic = {
        code: 'PARSE_ERROR',
        message: `Expected ${expectedDesc}, but found ${foundDesc}`,
        severity: 'error',
        location: token.location,
        suggestion: suggestions.length > 0 ? suggestions[0] : undefined,
      };

      this._errors.push(diagnostic);
      return { ok: false, errors: [diagnostic] };
    }

    this._advance();
    return { ok: true, value: token };
  }

  // ==================== Error Reporting ====================

  /**
   * Creates a descriptive string for a token (for error messages).
   */
  private _tokenDescription(token: Token): string {
    if (token.kind === 'eof') {
      return 'end of file';
    }
    if (token.kind === 'keyword') {
      return `${token.kind} '${token.value}'`;
    }
    if (token.kind === 'operator') {
      return `${token.kind} '${token.value}'`;
    }
    if (token.kind === 'identifier') {
      return `${token.kind} '${token.value}'`;
    }
    if (token.kind === 'string') {
      return `${token.kind} '${token.value}'`;
    }
    if (token.kind === 'number') {
      return `number '${token.value}'`;
    }
    // Should never reach here due to exhaustive checking
    const _exhaustiveCheck: never = token;
    return 'unknown';
  }

  /**
   * Generates helpful suggestions for common syntax errors.
   * Provides context-aware hints to guide users toward correct syntax.
   */
  private _getSuggestions(
    expectedKind: TokenKind,
    expectedValue: string | undefined,
    found: Token,
  ): string[] {
    const suggestions: string[] = [];

    // Missing colon after field name
    if (expectedKind === 'operator' && expectedValue === ':' && found.kind === 'identifier') {
      suggestions.push("Did you forget ':' after the field name?");
      suggestions.push('Field syntax: fieldName: type');
    }

    // Missing opening brace after schema name
    if (expectedKind === 'operator' && expectedValue === '{' && found.kind === 'identifier') {
      suggestions.push("Schema declarations require '{' after the name");
      suggestions.push('Schema syntax: schema Name { ... }');
    }

    // Missing closing brace
    if (expectedKind === 'operator' && expectedValue === '}') {
      suggestions.push('Check for unclosed braces in your schema');
      if (found.kind === 'eof') {
        suggestions.push("You may have forgotten a '}' to close a schema declaration");
      }
    }

    // Missing equals after generator keyword
    if (expectedKind === 'operator' && expectedValue === '=' && found.kind !== 'operator') {
      suggestions.push('Generator syntax: generator=name or generator=name(param=value)');
      suggestions.push('Example: email: string generator=email');
    }

    // Missing generator name after equals
    if (expectedKind === 'identifier' && found.kind === 'operator') {
      suggestions.push('Expected a generator name after generator=');
      suggestions.push('Available generators: uuid, email, randomInt, randomString, etc.');
    }

    // Missing closing parenthesis in generator parameters
    if (expectedKind === 'operator' && expectedValue === ')') {
      suggestions.push('Check for unclosed parentheses in generator parameters');
      suggestions.push('Parameter syntax: generator=name(param1=value1, param2=value2)');
    }

    // Typo detection for keywords
    if (expectedKind === 'keyword' && found.kind === 'identifier') {
      const typos: Record<string, string> = {
        shema: 'schema',
        schmea: 'schema',
        scema: 'schema',
        Schema: 'schema',
        SCHEMA: 'schema',
        profle: 'profile',
        Profile: 'profile',
        contxt: 'context',
        Context: 'context',
        uniqe: 'unique',
        Unique: 'unique',
        UNIQUE: 'unique',
        templte: 'template',
        genrator: 'generator',
        genertor: 'generator',
      };
      const suggestion = typos[found.value];
      if (suggestion) {
        suggestions.push(`Did you mean '${suggestion}' instead of '${found.value}'?`);
      }
    }

    // Unexpected token at top level - guide toward valid declarations
    if (expectedKind === 'keyword' && expectedValue === 'schema' && found.kind === 'identifier') {
      suggestions.push('Files must start with a declaration (schema, profile, or context)');
      suggestions.push('Example: schema UserProfile { ... }');
    }

    return suggestions;
  }

  /**
   * Records a diagnostic error.
   */
  private _addError(message: string, location: SourceLocation, suggestions: string[] = []): void {
    this._errors.push({
      code: 'PARSE_ERROR',
      message,
      severity: 'error',
      location,
      suggestion: suggestions.length > 0 ? suggestions[0] : undefined,
    });
  }

  /**
   * Synchronizes parser to next valid parsing point after error.
   * Skips tokens until a declaration boundary is found.
   */
  private _synchronize(): void {
    this._advance();

    while (!this._isAtEnd()) {
      // Stop at schema, profile, or context keywords (declaration boundaries)
      if (
        this._check('keyword', 'schema') ||
        this._check('keyword', 'profile') ||
        this._check('keyword', 'context')
      ) {
        return;
      }

      this._advance();
    }
  }

  // ==================== Grammar Rules (Parsing Methods) ====================

  /**
   * Parses the complete program (entry point).
   *
   * Grammar: Program ::= Declaration* EOF
   */
  private _parseProgram(): Result<Program, Diagnostic[]> {
    const declarations: SchemaNode[] = [];
    const startLocation = this._currentToken().location;

    while (!this._isAtEnd()) {
      const declResult = this._parseDeclaration();

      if (declResult.ok) {
        declarations.push(declResult.value);
      } else {
        // Error already recorded, synchronize to next declaration
        this._synchronize();
      }
    }

    // Return errors if any were collected
    if (this._errors.length > 0) {
      return { ok: false, errors: this._errors };
    }

    // Calculate program location from start to current position
    const endLocation = this._tokens[this._current - 1]?.location || startLocation;
    const programLocation: SourceLocation = {
      file: startLocation.file,
      line: startLocation.line,
      column: startLocation.column,
      length:
        endLocation.line === startLocation.line
          ? endLocation.column + endLocation.length - startLocation.column
          : endLocation.length,
    };

    return {
      ok: true,
      value: {
        kind: 'program',
        declarations,
        location: programLocation,
      },
    };
  }

  /**
   * Parses a declaration (schema, profile, or context).
   *
   * Grammar: Declaration ::= SchemaDeclaration | ProfileDeclaration | ContextDeclaration
   *
   * Currently only SchemaDeclaration is implemented.
   */
  private _parseDeclaration(): Result<SchemaNode, Diagnostic[]> {
    const token = this._currentToken();

    if (this._check('keyword', 'schema')) {
      return this._parseSchemaDeclaration();
    }

    // Future: profile, context declarations
    if (this._check('keyword', 'profile') || this._check('keyword', 'context')) {
      this._addError(
        `'${token.kind === 'keyword' ? token.value : ''}' declarations are not yet implemented`,
        token.location,
        ['Only schema declarations are supported in this version'],
      );
      return { ok: false, errors: this._errors };
    }

    // Unexpected token at top level
    this._addError(`Unexpected ${this._tokenDescription(token)} at top level`, token.location, [
      'Expected a schema declaration',
    ]);
    return { ok: false, errors: this._errors };
  }

  /**
   * Parses a schema declaration.
   *
   * Grammar: SchemaDeclaration ::= 'schema' Identifier '{' FieldDeclaration* '}'
   */
  private _parseSchemaDeclaration(): Result<SchemaNode, Diagnostic[]> {
    const startToken = this._currentToken();

    // Match 'schema' keyword
    const schemaResult = this._expect('keyword', 'schema');
    if (!schemaResult.ok) return schemaResult;

    // Match schema name
    const nameResult = this._expect('identifier');
    if (!nameResult.ok) return nameResult;

    // Type guard
    if (nameResult.value.kind !== 'identifier') {
      this._addError('Expected identifier for schema name', nameResult.value.location);
      return { ok: false, errors: this._errors };
    }
    const name = nameResult.value.value;

    // Match opening brace
    const openBraceResult = this._expect('operator', '{');
    if (!openBraceResult.ok) return openBraceResult;

    // Parse fields
    const fields: FieldNode[] = [];
    while (!this._check('operator', '}') && !this._isAtEnd()) {
      const fieldResult = this._parseFieldDeclaration();

      if (fieldResult.ok) {
        fields.push(fieldResult.value);
      } else {
        // Skip to next field or closing brace
        this._synchronizeToNextField();
      }
    }

    // Match closing brace
    const closeBraceResult = this._expect('operator', '}');
    if (!closeBraceResult.ok) {
      this._addError(
        `Expected '}' to close schema declaration '${name}' started at line ${startToken.location.line}`,
        this._currentToken().location,
        ['Check for unclosed braces in schema body'],
      );
      return { ok: false, errors: this._errors };
    }

    // Calculate schema location
    const endToken = this._tokens[this._current - 1];
    const location: SourceLocation = {
      file: startToken.location.file,
      line: startToken.location.line,
      column: startToken.location.column,
      length:
        endToken.location.line === startToken.location.line
          ? endToken.location.column + endToken.location.length - startToken.location.column
          : endToken.location.length,
    };

    return {
      ok: true,
      value: {
        kind: 'schema',
        name,
        fields,
        location,
      },
    };
  }

  /**
   * Synchronizes to next field declaration or closing brace.
   */
  private _synchronizeToNextField(): void {
    while (!this._isAtEnd() && !this._check('operator', '}')) {
      // Field declarations start with an identifier, but NOT if it's 'generator'
      // because generator is part of the current field
      const tok = this._currentToken();
      if (tok.kind === 'identifier' && tok.value !== 'generator') {
        return;
      }
      this._advance();
    }
  }

  /**
   * Parses a field declaration.
   *
   * Grammar: FieldDeclaration ::= Identifier ':' Type GeneratorSpec? Constraints?
   */
  private _parseFieldDeclaration(): Result<FieldNode, Diagnostic[]> {
    const startToken = this._currentToken();

    // Parse field name
    const nameResult = this._expect('identifier');
    if (!nameResult.ok) return nameResult;

    // Type guard
    if (nameResult.value.kind !== 'identifier') {
      this._addError('Expected identifier for field name', nameResult.value.location);
      return { ok: false, errors: this._errors };
    }
    const fieldName = nameResult.value.value;

    // Parse colon separator
    const colonResult = this._expect('operator', ':');
    if (!colonResult.ok) {
      this._addError(
        `Expected ':' after field name '${fieldName}' at line ${startToken.location.line}, column ${startToken.location.column}`,
        this._currentToken().location,
        ['Field syntax: name: type', 'Example: email: string'],
      );
      return { ok: false, errors: this._errors };
    }

    // Parse field type
    const typeResult = this._expect('identifier');
    if (!typeResult.ok) {
      this._addError(
        `Expected type after ':' in field '${fieldName}'`,
        this._currentToken().location,
        ['Field types: string, number, boolean, date, etc.'],
      );
      return { ok: false, errors: this._errors };
    }

    // Type guard
    if (typeResult.value.kind !== 'identifier') {
      this._addError('Expected identifier for field type', typeResult.value.location);
      return { ok: false, errors: this._errors };
    }
    const fieldType = typeResult.value.value;

    // Parse optional generator specification
    // Look ahead to check if next token is 'generator' identifier
    let generator: GeneratorSpec | undefined;
    const currentTok = this._currentToken();
    if (currentTok.kind === 'identifier' && currentTok.value === 'generator') {
      const genResult = this._parseGeneratorSpec();
      if (genResult.ok) {
        generator = genResult.value;
      } else {
        // Error already recorded, but continue parsing to look for constraints
      }
    }

    // Parse optional constraints
    let constraints: FieldConstraints | undefined;
    if (this._check('keyword', 'unique')) {
      const constraintResult = this._parseConstraints();
      if (constraintResult.ok) {
        constraints = constraintResult.value;
      }
    }

    // Calculate field location
    const endToken = this._tokens[this._current - 1];
    const endLoc = endToken.location;
    const location: SourceLocation = {
      file: startToken.location.file,
      line: startToken.location.line,
      column: startToken.location.column,
      length:
        endLoc.line === startToken.location.line
          ? endLoc.column + endLoc.length - startToken.location.column
          : endLoc.length,
    };

    return {
      ok: true,
      value: {
        kind: 'field',
        name: fieldName,
        type: fieldType,
        generator,
        constraints,
        location,
      },
    };
  }

  /**
   * Parses a generator specification.
   *
   * Grammar: GeneratorSpec ::= 'generator' '=' Identifier ('(' ParameterList ')')?
   */
  private _parseGeneratorSpec(): Result<GeneratorSpec, Diagnostic[]> {
    // Match 'generator' keyword (treated as identifier in tokens)
    const genKeywordResult = this._expect('identifier', 'generator');
    if (!genKeywordResult.ok) return genKeywordResult;

    // Match '=' operator
    const equalsResult = this._expect('operator', '=');
    if (!equalsResult.ok) {
      this._addError(`Expected '=' after 'generator'`, this._currentToken().location, [
        'Generator syntax: generator=name or generator=name(param=value)',
      ]);
      return { ok: false, errors: this._errors };
    }

    // Match generator name
    const nameResult = this._expect('identifier');
    if (!nameResult.ok) {
      this._addError(`Expected generator name after 'generator='`, this._currentToken().location, [
        'Example: generator=uuid',
        'Example: generator=randomInt(min=1, max=100)',
      ]);
      return { ok: false, errors: this._errors };
    }

    // Type guard for identifier token
    if (nameResult.value.kind !== 'identifier') {
      this._addError(`Expected identifier for generator name`, nameResult.value.location, []);
      return { ok: false, errors: this._errors };
    }

    const generatorName = nameResult.value.value;

    // Parse optional parameter list
    let parameters: GeneratorParameter[] | undefined;
    if (this._check('operator', '(')) {
      this._advance(); // consume '('

      const paramsResult = this._parseParameterList();
      if (paramsResult.ok) {
        parameters = paramsResult.value;
      } else {
        return { ok: false, errors: this._errors };
      }

      const closeParenResult = this._expect('operator', ')');
      if (!closeParenResult.ok) {
        this._addError(`Expected ')' to close parameter list`, this._currentToken().location, [
          'Check for unclosed parentheses in generator parameters',
        ]);
        return { ok: false, errors: this._errors };
      }
    }

    return {
      ok: true,
      value: {
        name: generatorName,
        parameters,
      },
    };
  }

  /**
   * Parses a parameter list.
   *
   * Grammar: ParameterList ::= Parameter (',' Parameter)*
   */
  private _parseParameterList(): Result<GeneratorParameter[], Diagnostic[]> {
    const parameters: GeneratorParameter[] = [];

    // Parse first parameter
    const firstParam = this._parseParameter();
    if (!firstParam.ok) return firstParam;
    parameters.push(firstParam.value);

    // Parse additional parameters
    while (this._check('operator', ',')) {
      this._advance(); // consume ','

      const param = this._parseParameter();
      if (!param.ok) return param;
      parameters.push(param.value);
    }

    return { ok: true, value: parameters };
  }

  /**
   * Parses a single parameter.
   *
   * Grammar: Parameter ::= Identifier '=' Literal
   */
  private _parseParameter(): Result<GeneratorParameter, Diagnostic[]> {
    // Parse parameter name
    const nameResult = this._expect('identifier');
    if (!nameResult.ok) {
      this._addError(`Expected parameter name`, this._currentToken().location, [
        'Parameter syntax: name=value',
        'Example: min=1, max=100',
      ]);
      return { ok: false, errors: this._errors };
    }

    // Type guard for identifier token
    if (nameResult.value.kind !== 'identifier') {
      this._addError(`Expected identifier for parameter name`, nameResult.value.location, []);
      return { ok: false, errors: this._errors };
    }

    const paramName = nameResult.value.value;

    // Match '=' operator
    const equalsResult = this._expect('operator', '=');
    if (!equalsResult.ok) {
      this._addError(
        `Expected '=' after parameter name '${paramName}'`,
        this._currentToken().location,
        ['Parameter syntax: name=value'],
      );
      return { ok: false, errors: this._errors };
    }

    // Parse parameter value (literal)
    const valueResult = this._parseLiteral();
    if (!valueResult.ok) {
      this._addError(
        `Expected value after '=' in parameter '${paramName}'`,
        this._currentToken().location,
        ['Parameter values can be strings, numbers, booleans, arrays, or objects'],
      );
      return { ok: false, errors: this._errors };
    }

    return {
      ok: true,
      value: {
        name: paramName,
        value: valueResult.value,
      },
    };
  }

  /**
   * Parses a literal value (string, number, boolean, array, or object).
   *
   * Grammar: Literal ::= String | Number | Boolean | ArrayLiteral | ObjectLiteral
   */
  private _parseLiteral(): Result<LiteralValue, Diagnostic[]> {
    const token = this._currentToken();

    if (token.kind === 'string') {
      this._advance();
      return { ok: true, value: token.value };
    }

    if (token.kind === 'number') {
      this._advance();
      return { ok: true, value: token.value };
    }

    if (token.kind === 'identifier') {
      // Check for boolean keywords
      if (token.value === 'true') {
        this._advance();
        return { ok: true, value: true };
      }
      if (token.value === 'false') {
        this._advance();
        return { ok: true, value: false };
      }
    }

    if (token.kind === 'operator' && token.value === '[') {
      return this._parseArrayLiteral();
    }

    if (token.kind === 'operator' && token.value === '{') {
      return this._parseObjectLiteral();
    }

    this._addError(
      `Expected literal value (string, number, boolean, array, or object), but found ${this._tokenDescription(token)}`,
      token.location,
      ['Literals: "string", 42, true, false, [1, 2], {key="value"}'],
    );
    return { ok: false, errors: this._errors };
  }

  /**
   * Parses an array literal.
   *
   * Grammar: ArrayLiteral ::= '[' (Literal (',' Literal)*)? ']'
   */
  private _parseArrayLiteral(): Result<LiteralValue, Diagnostic[]> {
    const openBracket = this._expect('operator', '[');
    if (!openBracket.ok) {
      return openBracket;
    }

    const values: LiteralValue[] = [];

    if (!this._check('operator', ']')) {
      const firstValue = this._parseLiteral();
      if (!firstValue.ok) {
        return firstValue;
      }
      values.push(firstValue.value);

      while (this._check('operator', ',')) {
        this._advance();

        const nextValue = this._parseLiteral();
        if (!nextValue.ok) {
          return nextValue;
        }
        values.push(nextValue.value);
      }
    }

    const closeBracket = this._expect('operator', ']');
    if (!closeBracket.ok) {
      this._addError(`Expected ']' to close array literal`, this._currentToken().location, [
        'Array syntax: ["a", "b", "c"]',
      ]);
      return { ok: false, errors: this._errors };
    }

    return { ok: true, value: values };
  }

  /**
   * Parses an object literal.
   *
   * Grammar: ObjectLiteral ::= '{' (Identifier (':'|'=') Literal (',' Identifier (':'|'=') Literal)*)? '}'
   */
  private _parseObjectLiteral(): Result<LiteralValue, Diagnostic[]> {
    const openBrace = this._expect('operator', '{');
    if (!openBrace.ok) {
      return openBrace;
    }

    const obj: Record<string, LiteralValue> = {};

    if (!this._check('operator', '}')) {
      while (true) {
        const keyResult = this._expect('identifier');
        if (!keyResult.ok) {
          this._addError(`Expected object property name`, this._currentToken().location, [
            'Object syntax: {value="free", weight=70}',
          ]);
          return { ok: false, errors: this._errors };
        }

        if (keyResult.value.kind !== 'identifier') {
          this._addError(`Expected identifier for object property name`, keyResult.value.location, []);
          return { ok: false, errors: this._errors };
        }

        if (!(this._check('operator', '=') || this._check('operator', ':'))) {
          this._addError(
            `Expected '=' or ':' after object property '${keyResult.value.value}'`,
            this._currentToken().location,
            ['Object syntax: {value="free", weight=70}'],
          );
          return { ok: false, errors: this._errors };
        }
        this._advance();

        const valueResult = this._parseLiteral();
        if (!valueResult.ok) {
          return valueResult;
        }

        obj[keyResult.value.value] = valueResult.value;

        if (!this._check('operator', ',')) {
          break;
        }
        this._advance();
      }
    }

    const closeBrace = this._expect('operator', '}');
    if (!closeBrace.ok) {
      this._addError(`Expected '}' to close object literal`, this._currentToken().location, [
        'Object syntax: {value="free", weight=70}',
      ]);
      return { ok: false, errors: this._errors };
    }

    return { ok: true, value: obj };
  }

  /**
   * Parses field constraints.
   *
   * Grammar: Constraints ::= 'unique'
   *
   * Future: additional constraint keywords (min, max, pattern, etc.)
   */
  private _parseConstraints(): Result<FieldConstraints, Diagnostic[]> {
    const constraints: FieldConstraints = {};

    if (this._check('keyword', 'unique')) {
      this._advance();
      return {
        ok: true,
        value: { unique: true },
      };
    }

    return { ok: true, value: constraints };
  }
}

/**
 * Convenience function to parse tokens into an AST.
 *
 * @param tokens - Array of tokens from the scanner
 * @returns Result containing Program AST or array of parse errors
 *
 * @example
 * ```typescript
 * const scanResult = scan(source);
 * if (scanResult.ok) {
 *   const parseResult = parse(scanResult.value);
 *   if (parseResult.ok) {
 *     console.log('Program:', parseResult.value);
 *   }
 * }
 * ```
 */
export function parse(tokens: Token[]): Result<Program, Diagnostic[]> {
  const parser = new Parser(tokens);
  return parser.parse();
}
