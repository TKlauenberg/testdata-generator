# Story 2.3: Parser - Recursive Descent Implementation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a recursive descent parser that builds an AST from tokens**,
So that **DSL schemas can be transformed into structured data for validation**.

## Acceptance Criteria

**Given** I have a token stream from the scanner
**When** I implement the parser in `packages/core/src/parser/parser.ts`
**Then** a `Parser` class exists with a `parse(tokens: Token[]): Result<Program>` method
**And** the parser uses recursive descent to match grammar rules
**And** the parser builds immutable AST nodes during parsing
**And** the parser handles schema declarations with field definitions
**And** the parser collects multiple syntax errors without stopping at the first error
**And** syntax errors include context like "Expected ':' after field name 'email' at line 3"
**And** the parser provides helpful suggestions for common mistakes
**And** error diagnostics reference the exact token location
**And** the module exports through `packages/core/src/parser/index.ts`
**And** Gherkin feature tests cover valid schemas and syntax error scenarios
**And** tests verify the parser produces correct AST structures

## Tasks / Subtasks

- [ ] Create Parser class foundation (AC: 1)
  - [ ] Create `packages/core/src/parser/parser.ts`
  - [ ] Define `Parser` class with constructor accepting `Token[]`
  - [ ] Implement `parse(): Result<Program>` method
  - [ ] Setup internal state: current token position, errors array
  - [ ] Implement token navigation methods: `current()`, `peek()`, `advance()`, `isAtEnd()`
  - [ ] Implement `expect(kind: TokenKind): Result<Token>` for token matching

- [ ] Implement top-level parsing (AC: 2, 3, 4)
  - [ ] Implement `parseProgram(): Result<Program>` - entry point
  - [ ] Parse declarations in a loop until EOF
  - [ ] Handle different declaration types (schema, profile, context)
  - [ ] Build Program AST node with all declarations
  - [ ] Collect all parse errors without stopping

- [ ] Implement schema declaration parsing (AC: 4)
  - [ ] Implement `parseSchemaDeclaration(): Result<SchemaNode>`
  - [ ] Match `schema` keyword token
  - [ ] Parse schema identifier name
  - [ ] Match opening brace `{`
  - [ ] Parse field declarations in a loop until closing brace
  - [ ] Match closing brace `}`
  - [ ] Build SchemaNode with all fields
  - [ ] Track source location from start to end token

- [ ] Implement field declaration parsing (AC: 4)
  - [ ] Implement `parseFieldDeclaration(): Result<FieldNode>`
  - [ ] Parse field name identifier
  - [ ] Match colon `:` separator
  - [ ] Parse field type identifier
  - [ ] Parse optional generator specification
  - [ ] Parse optional constraints (e.g., `unique`)
  - [ ] Build FieldNode with all properties
  - [ ] Track source location

- [ ] Implement generator specification parsing (AC: 4)
  - [ ] Implement `parseGeneratorSpec(): Result<GeneratorSpec>`
  - [ ] Match `generator=` syntax
  - [ ] Parse generator name identifier
  - [ ] Check for parameter list in parentheses
  - [ ] Parse parameter list if present: `(param1=value1, param2=value2)`
  - [ ] Build GeneratorSpec with parameters
  - [ ] Handle literals: strings, numbers, booleans

- [ ] Implement constraints parsing (AC: 4)
  - [ ] Implement `parseConstraints(): Result<FieldConstraints>`
  - [ ] Parse `unique` keyword → set `unique: true`
  - [ ] Future: Parse other constraint keywords (min, max, pattern)
  - [ ] Build FieldConstraints object
  - [ ] Track constraint locations for error reporting

- [ ] Implement error recovery and accumulation (AC: 5, 6, 7, 8)
  - [ ] Use Result type to accumulate errors without stopping
  - [ ] On syntax error, record diagnostic with location and message
  - [ ] Implement synchronization points to skip to next valid declaration
  - [ ] Provide contextual error messages with token context
  - [ ] Add helpful suggestions for common mistakes
  - [ ] Include token kind and value in error messages
  - [ ] Track line and column numbers in all error messages

- [ ] Add helpful error suggestions (AC: 7)
  - [ ] Missing colon after field name → "Expected ':' after field name '{{name}}'"
  - [ ] Missing type → "Expected type after ':' in field declaration"
  - [ ] Unclosed brace → "Expected '}' to close schema declaration"
  - [ ] Invalid generator syntax → "Generator syntax: generator=name or generator=name(param=value)"
  - [ ] Unexpected token → "Unexpected token '{{token}}', expected '{{expected}}'"
  - [ ] Typo detection → "Did you mean 'schema' instead of 'shema'?"

- [ ] Export parser through public API (AC: 9)
  - [ ] Update `packages/core/src/parser/index.ts`
  - [ ] Export `Parser` class
  - [ ] Export `parse()` convenience function: `parse(tokens: Token[]): Result<Program>`
  - [ ] Export AST node types (already done in Story 2.2)
  - [ ] Do NOT export internal parser methods

- [ ] Write comprehensive unit tests (AC: 10, 11)
  - [ ] Create `packages/core/src/parser/parser.test.ts`
  - [ ] Test: Parse simple schema with one field
  - [ ] Test: Parse schema with multiple fields
  - [ ] Test: Parse field with generator specification
  - [ ] Test: Parse field with parameters in generator
  - [ ] Test: Parse field with unique constraint
  - [ ] Test: Parse multiple schemas in one program
  - [ ] Test: Error - missing colon after field name
  - [ ] Test: Error - missing type after colon
  - [ ] Test: Error - unclosed schema brace
  - [ ] Test: Error - invalid token in schema body
  - [ ] Test: Error - multiple errors collected together
  - [ ] Test: Verify AST structure matches expected nodes
  - [ ] Test: Verify source locations are accurate

- [ ] Write Gherkin feature tests (AC: 10)
  - [ ] Create `packages/core/tests/features/parser.feature`
  - [ ] Scenario: Parse valid schema with single field
  - [ ] Scenario: Parse valid schema with multiple fields
  - [ ] Scenario: Parse schema with generator and constraints
  - [ ] Scenario: Parse multiple schemas
  - [ ] Scenario: Syntax error - missing colon
  - [ ] Scenario: Syntax error - unclosed brace
  - [ ] Scenario: Multiple syntax errors reported together
  - [ ] Verify error messages include line/column numbers
  - [ ] Verify suggestions are provided for common errors

- [ ] Integration and validation
  - [ ] Verify Token types imported from `packages/core/src/scanner/`
  - [ ] Verify AST node types imported from `packages/core/src/parser/ast.ts`
  - [ ] Verify Result type imported from `packages/core/src/common/result.ts`
  - [ ] Verify Diagnostic imported from `packages/core/src/common/diagnostic.ts`
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Update exports in `packages/core/src/index.ts` if needed

## Dev Notes

### Previous Story Learnings

From **Story 2.2 (Parser - AST Node Types)**:

✅ **Patterns That Worked:**
- Discriminated unions with `kind` property for type safety
- `readonly` modifiers on ALL properties and arrays
- Comprehensive JSDoc documentation with examples
- Co-located unit tests (`.test.ts` files)
- Type guards for safe type narrowing
- Immutable data structures (no methods on node types)

⚠️ **Key Takeaways:**
- Must include `SourceLocation` on ALL AST nodes for error reporting
- Use interfaces for node types, not classes
- Export types through `index.ts`, not internal helpers
- TypeScript strict mode catches mutation attempts at compile time
- Think of AST as JSON-serializable pure data

From **Story 2.1 (Scanner - Token Types and Lexical Analysis)**:
- Error accumulation pattern: collect all errors, don't stop at first one
- Use Result type to wrap success/failure explicitly
- Source location tracking is 1-indexed (line and column)
- Diagnostic messages should be helpful and contextual

### Architecture Requirements

**Recursive Descent Parsing Pattern:**

A recursive descent parser is a top-down parser where each grammar rule becomes a function. The parser calls these functions recursively to match the grammar structure.

**Grammar (Simplified):**
```
Program ::= Declaration* EOF
Declaration ::= SchemaDeclaration | ProfileDeclaration
SchemaDeclaration ::= 'schema' Identifier '{' FieldDeclaration* '}'
FieldDeclaration ::= Identifier ':' Type GeneratorSpec? Constraints?
GeneratorSpec ::= 'generator' '=' Identifier ('(' ParameterList ')')?
ParameterList ::= Parameter (',' Parameter)*
Parameter ::= Identifier '=' Literal
```

**Parser Structure:**
```typescript
class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: Diagnostic[] = [];

  parse(): Result<Program> {
    return this.parseProgram();
  }

  private parseProgram(): Result<Program> {
    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
      const declResult = this.parseDeclaration();
      if (declResult.ok) {
        declarations.push(declResult.value);
      }
      // Errors already accumulated in this.errors
    }

    if (this.errors.length > 0) {
      return { ok: false, errors: this.errors };
    }

    return {
      ok: true,
      value: {
        kind: 'program',
        declarations,
        location: this.getLocationSpan(0, this.current)
      }
    };
  }

  private parseSchemaDeclaration(): Result<SchemaNode> {
    const startToken = this.current();

    // Match 'schema' keyword
    const schemaResult = this.expect('keyword', 'schema');
    if (!schemaResult.ok) return schemaResult;

    // Match schema name
    const nameResult = this.expect('identifier');
    if (!nameResult.ok) return nameResult;
    const name = nameResult.value.value;

    // Match opening brace
    const openResult = this.expect('operator', '{');
    if (!openResult.ok) return openResult;

    // Parse fields
    const fields: FieldNode[] = [];
    while (!this.check('operator', '}') && !this.isAtEnd()) {
      const fieldResult = this.parseFieldDeclaration();
      if (fieldResult.ok) {
        fields.push(fieldResult.value);
      }
      // Error already recorded, continue parsing
    }

    // Match closing brace
    const closeResult = this.expect('operator', '}');
    if (!closeResult.ok) return closeResult;

    return {
      ok: true,
      value: {
        kind: 'schema',
        name,
        fields,
        location: this.getLocationSpan(startToken, this.current())
      }
    };
  }

  private expect(kind: TokenKind, value?: string): Result<Token> {
    const token = this.current();

    if (token.kind !== kind || (value && token.value !== value)) {
      const error: Diagnostic = {
        level: 'error',
        code: 'PARSE_ERROR',
        message: `Expected ${kind}${value ? ` '${value}'` : ''}, but found ${token.kind} '${token.value}'`,
        location: token.location,
        suggestions: this.getSuggestions(kind, value, token)
      };
      this.errors.push(error);
      return { ok: false, errors: [error] };
    }

    this.advance();
    return { ok: true, value: token };
  }
}
```

**Error Recovery Strategy:**

When a syntax error occurs:
1. Record the diagnostic with detailed message
2. Synchronize to next valid parsing point (next declaration, next field, etc.)
3. Continue parsing to find more errors
4. Return accumulated errors at the end

**Synchronization Points:**
- After schema declaration error → skip to next `schema` keyword or EOF
- After field declaration error → skip to next field or closing brace `}`
- After generator error → skip to next field

**Immutable AST Construction:**

- Build AST nodes during parsing using object literals
- All properties are `readonly` (enforced by TypeScript)
- No mutation after node creation
- Parser produces new immutable data structures

**Source Location Tracking:**

- Track start token position when entering each parse rule
- Calculate location span from start to current position
- Use token locations for precise error reporting
- Format: `{ file: string, line: number, column: number, length: number }`

### Technical Implementation Guidance

**Token Navigation Methods:**

```typescript
private current(): Token {
  return this.tokens[this.current];
}

private peek(offset: number = 1): Token {
  return this.tokens[this.current + offset];
}

private advance(): Token {
  if (!this.isAtEnd()) this.current++;
  return this.tokens[this.current - 1];
}

private isAtEnd(): boolean {
  return this.current().kind === 'eof';
}

private check(kind: TokenKind, value?: string): boolean {
  const token = this.current();
  return token.kind === kind && (!value || token.value === value);
}
```

**Error Message Patterns:**

```typescript
// Missing expected token
"Expected ':' after field name 'email' at line 3, column 10"

// Unexpected token
"Unexpected token 'identifier' 'wrongPlace', expected 'keyword' 'schema' at line 5, column 1"

// Unclosed delimiter
"Expected '}' to close schema declaration started at line 2, column 1"

// Invalid syntax
"Invalid generator syntax. Expected: generator=name or generator=name(param=value)"

// Helpful suggestion
"Did you mean 'schema' instead of 'shema'? (line 1, column 1)"
```

**Testing Strategy:**

**Unit Tests (Bun):**
- Test each parse method independently with mock token arrays
- Test valid input produces correct AST structure
- Test error cases produce correct diagnostics
- Test error recovery continues parsing after errors
- Test source location tracking is accurate

**Gherkin Feature Tests:**
- Test end-to-end: string source → scanner → parser → AST
- Test realistic DSL schema examples
- Test error scenarios users will encounter
- Verify error messages are clear and actionable

**Example Gherkin Scenario:**
```gherkin
Feature: Parser - Recursive Descent Implementation

Scenario: Parse valid schema with multiple fields
  Given I have DSL source code:
    """
    schema User {
      id: string generator=uuid
      email: string generator=email unique
      age: number generator=randomInt(min=18, max=100)
    }
    """
  When I scan and parse the source
  Then the parsing succeeds
  And the AST contains a Program node
  And the Program contains 1 SchemaNode named "User"
  And the SchemaNode contains 3 FieldNodes
  And the first FieldNode has name "id" and type "string"
  And the first FieldNode has generator "uuid" with no parameters
  And the second FieldNode has name "email" and constraint "unique"
  And the third FieldNode has generator "randomInt" with parameters min=18, max=100

Scenario: Parse error - missing colon after field name
  Given I have DSL source code:
    """
    schema User {
      email string
    }
    """
  When I scan and parse the source
  Then the parsing fails
  And the error message contains "Expected ':' after field name 'email'"
  And the error location is line 2, column 9

Scenario: Multiple syntax errors collected
  Given I have DSL source code:
    """
    schema User {
      email
      age: number generator
    }
    """
  When I scan and parse the source
  Then the parsing fails
  And there are 2 errors
  And error 1 contains "Expected ':' after field name 'email'"
  And error 2 contains "Expected '=' after 'generator'"
```

### Project Structure Alignment

**File Organization:**
```
packages/core/src/parser/
├── index.ts           # Public exports
├── ast.ts             # AST node types (Story 2.2 - already done)
├── ast.test.ts        # AST type tests (Story 2.2 - already done)
├── parser.ts          # Parser implementation (THIS STORY)
└── parser.test.ts     # Parser unit tests (THIS STORY)
```

**Module Exports (index.ts):**
```typescript
// AST types (from Story 2.2)
export * from './ast';

// Parser
export { Parser } from './parser';
export { parse } from './parser';
```

**Dependencies:**
- Token types from `packages/core/src/scanner/` (Story 2.1)
- AST node types from `packages/core/src/parser/ast.ts` (Story 2.2)
- Result type from `packages/core/src/common/result.ts` (Story 1.2)
- Diagnostic from `packages/core/src/common/diagnostic.ts` (Story 1.3)

### Common Pitfalls to Avoid

❌ **DON'T:**
- Stop at first syntax error (must accumulate all errors)
- Mutate AST nodes after creation
- Use exceptions for control flow (use Result type)
- Export internal parser methods through `index.ts`
- Create AST nodes with class instances (use object literals)
- Skip source location tracking on nodes
- Write vague error messages like "Syntax error"
- Forget to synchronize after error (causes cascading errors)
- Use `any` type for parser state

✅ **DO:**
- Collect all syntax errors before returning
- Build immutable AST nodes using object literals
- Use Result type for explicit error handling
- Export only public API through `index.ts`
- Track source locations precisely for all nodes
- Write helpful, contextual error messages
- Implement error recovery and synchronization
- Add suggestions for common mistakes
- Test both valid parsing and error cases
- Use TypeScript strict mode

### References

**Architecture:**
- [Source: architecture/core-architectural-decisions.md#ast-design-immutable-data-pure-functions] - AST immutability principles
- [Source: architecture/core-architectural-decisions.md#error-accumulation-result-type-pattern] - Result type pattern
- [Source: architecture/implementation-patterns-consistency-rules.md#structure-patterns] - Module organization
- [Source: architecture/implementation-patterns-consistency-rules.md#result-type-format] - Result type usage

**Epic Requirements:**
- [Source: epics/epic-2-dsl-core-parse-and-validate-schemas.md#story-23] - Story definition and acceptance criteria

**Previous Stories:**
- [Source: implementation-artifacts/2-1-scanner-token-types-and-lexical-analysis.md] - Token types and scanner implementation
- [Source: implementation-artifacts/2-2-parser-ast-node-types.md] - AST node definitions and design patterns

**Testing:**
- [Source: architecture/implementation-patterns-consistency-rules.md#testing-patterns] - Test structure and location conventions
- [Source: implementation-artifacts/1-4-gherkin-bdd-testing-infrastructure.md] - Gherkin BDD setup

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
