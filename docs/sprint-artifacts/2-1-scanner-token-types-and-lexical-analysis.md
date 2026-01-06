# Story 2.1: Scanner - Token Types and Lexical Analysis

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a lexical scanner that converts DSL source code into tokens**,
So that **the parser can process structured tokens instead of raw text**.

## Acceptance Criteria

**Given** I need to tokenize DSL source code
**When** I implement the scanner in `packages/core/src/scanner/`
**Then** a discriminated union type `Token` exists with variants for `keyword`, `identifier`, `string`, `number`, `operator`, and `eof`
**And** each token includes a `SourceLocation` with file, line, column, and length information
**And** a `Scanner` class exists with a `scan(source: string): Result<Token[]>` method
**And** the scanner recognizes DSL keywords: `schema`, `profile`, `context`, `unique`, `template`
**And** the scanner handles string literals with proper escape sequences
**And** the scanner handles numeric literals (integers and floats)
**And** the scanner collects multiple lexical errors without stopping (e.g., unterminated strings)
**And** error diagnostics include helpful messages like "Unterminated string starting at line 5"
**And** the module exports through `packages/core/src/scanner/index.ts`
**And** Gherkin feature tests cover valid tokenization and error cases
**And** line and column tracking is 1-indexed as specified

## Tasks / Subtasks

- [ ] Define Token types and discriminated union (AC: 1, 2)
  - [ ] Create `packages/core/src/scanner/tokens.ts`
  - [ ] Define `Token` discriminated union with all variants
  - [ ] Define `TokenKind` type or enum
  - [ ] Define token variants: keyword, identifier, string, number, operator, eof
  - [ ] Ensure all token types include `SourceLocation` field
  - [ ] Use `readonly` modifiers for immutability
  - [ ] Add comprehensive documentation for each token type

- [ ] Define keywords and operators (AC: 4)
  - [ ] Create `packages/core/src/scanner/keywords.ts`
  - [ ] Define keyword list: `schema`, `profile`, `context`, `unique`, `template`
  - [ ] Define operator symbols needed for DSL
  - [ ] Export keyword checking function: `isKeyword(text: string): boolean`
  - [ ] Export operator validation

- [ ] Implement Scanner class core structure (AC: 3, 11)
  - [ ] Create `packages/core/src/scanner/scanner.ts`
  - [ ] Define `Scanner` class with private members using underscore convention
  - [ ] Implement constructor: `constructor(source: string, filename: string)`
  - [ ] Implement private state: `_position`, `_line`, `_column`, `_source`, `_filename`
  - [ ] Implement public `scan(): Result<Token[]>` method
  - [ ] Initialize line and column tracking at 1 (1-indexed per spec)
  - [ ] Implement error accumulation using Diagnostic system from common/

- [ ] Implement character-level operations (AC: 11)
  - [ ] Implement `private _advance(): string` - consume and return character
  - [ ] Implement `private _peek(offset?: number): string` - look ahead without consuming
  - [ ] Implement `private _isAtEnd(): boolean` - check if at EOF
  - [ ] Implement `private _match(expected: string): boolean` - conditional advance
  - [ ] Implement position tracking (update `_line`, `_column` on newlines)
  - [ ] Handle various line endings: \n, \r\n, \r

- [ ] Implement whitespace and comment handling
  - [ ] Implement `private _skipWhitespace(): void` - skip spaces, tabs, newlines
  - [ ] Update line/column tracking when skipping newlines
  - [ ] Optionally: implement comment handling (if DSL has comments)

- [ ] Implement identifier and keyword tokenization (AC: 4)
  - [ ] Implement `private _scanIdentifier(): Token`
  - [ ] Start with alphabetic character or underscore
  - [ ] Continue with alphanumeric characters or underscores
  - [ ] Check if identifier matches keyword using `isKeyword()`
  - [ ] Return keyword token if match, identifier token otherwise
  - [ ] Capture source location (start line/column, length)

- [ ] Implement string literal tokenization (AC: 5, 7, 8)
  - [ ] Implement `private _scanString(): Token | null`
  - [ ] Handle single quotes `'...'` or double quotes `"..."`
  - [ ] Implement escape sequence handling: `\n`, `\t`, `\\`, `\"`, `\'`
  - [ ] Handle unterminated strings (AC: 7, 8)
  - [ ] On unterminated string: collect diagnostic with helpful message
  - [ ] Continue scanning to find more errors (don't stop immediately)
  - [ ] Return null on error but continue collecting more errors

- [ ] Implement numeric literal tokenization (AC: 6)
  - [ ] Implement `private _scanNumber(): Token`
  - [ ] Handle integers: sequences of digits
  - [ ] Handle floats: digits with decimal point (e.g., `123.45`)
  - [ ] Handle leading negative sign if needed
  - [ ] Validate numeric format (reject invalid patterns)
  - [ ] Convert string to number and store in token value

- [ ] Implement operator tokenization (AC: 1)
  - [ ] Implement `private _scanOperator(): Token`
  - [ ] Identify single-character operators: `:`, `,`, `{`, `}`, `[`, `]`, `(`, `)`
  - [ ] Identify multi-character operators if needed: `::`, `->`, etc.
  - [ ] Return operator token with appropriate kind

- [ ] Implement main scanning loop (AC: 3, 7)
  - [ ] Implement loop in `scan()` method
  - [ ] Skip whitespace before each token
  - [ ] Determine token type from current character
  - [ ] Call appropriate scan method (identifier, string, number, operator)
  - [ ] Collect all tokens in array
  - [ ] Accumulate errors in diagnostics array (don't throw exceptions)
  - [ ] Continue scanning even after errors (collect all errors)
  - [ ] Append EOF token at end

- [ ] Implement error handling and Result return (AC: 7, 8)
  - [ ] Use `Result<Token[], Diagnostic[]>` return type
  - [ ] If no errors: return `ok(tokens)`
  - [ ] If errors found: return `err(diagnostics)`
  - [ ] Error messages must be QA-friendly (AC: 8)
  - [ ] Include helpful context: "Unterminated string starting at line 5"
  - [ ] Use existing diagnostic factories from `common/diagnostic.ts`

- [ ] Create module exports (AC: 9)
  - [ ] Create `packages/core/src/scanner/index.ts`
  - [ ] Export `scan` function (convenience wrapper around Scanner.scan)
  - [ ] Export `Scanner` class
  - [ ] Export `Token` type and all token variants
  - [ ] Export `TokenKind` type
  - [ ] Do NOT export private helper functions

- [ ] Write unit tests (AC: 9, 10, 11)
  - [ ] Create `packages/core/src/scanner/scanner.test.ts`
  - [ ] Test: scan empty string → returns EOF token only
  - [ ] Test: scan keywords → returns keyword tokens
  - [ ] Test: scan identifiers → returns identifier tokens
  - [ ] Test: scan strings with escape sequences → correct values
  - [ ] Test: scan integers → correct numeric values
  - [ ] Test: scan floats → correct numeric values
  - [ ] Test: scan operators → correct operator tokens
  - [ ] Test: unterminated string → error collected, scanning continues
  - [ ] Test: multiple errors → all collected and returned
  - [ ] Test: line/column tracking → 1-indexed (starts at line 1, column 1)
  - [ ] Test: multiline input → line numbers increment correctly
  - [ ] Test: source location length → calculated correctly

- [ ] Write Gherkin/BDD tests (AC: 10)
  - [ ] Create `packages/core/features/scanner.feature`
  - [ ] Create `packages/core/features/step_definitions/scanner.steps.ts`
  - [ ] Feature: tokenize valid DSL keywords
  - [ ] Feature: tokenize identifiers
  - [ ] Feature: tokenize string literals with escapes
  - [ ] Feature: tokenize numeric literals
  - [ ] Feature: handle unterminated strings
  - [ ] Feature: collect multiple errors
  - [ ] Feature: verify 1-indexed line/column tracking
  - [ ] Use Screenplay pattern per project-context.md testing standards

- [ ] Integration and validation
  - [ ] Ensure scanner integrates with existing `common/` utilities
  - [ ] Verify Result type usage matches pattern from Story 1.2
  - [ ] Verify Diagnostic usage matches pattern from Story 1.3
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Update exports in `packages/core/src/index.ts` if needed

## Dev Notes

### Architecture Requirements

**Multi-Pass Compilation Pipeline:**
- Scanner is the FIRST phase: Source Code → Tokens
- Must use Result<T,E> pattern (never throw exceptions for expected errors)
- Must collect ALL errors before returning (don't fail fast)
- Output tokens feed into Parser (Story 2.2)

**Discriminated Union Pattern:**
```typescript
type Token =
  | { kind: 'keyword'; value: KeywordType; location: SourceLocation }
  | { kind: 'identifier'; value: string; location: SourceLocation }
  | { kind: 'string'; value: string; location: SourceLocation }
  | { kind: 'number'; value: number; location: SourceLocation }
  | { kind: 'operator'; value: OperatorType; location: SourceLocation }
  | { kind: 'eof'; location: SourceLocation };
```

**Error Handling:**
- Use existing Diagnostic system from `packages/core/src/common/diagnostic.ts`
- Leverage diagnostic factories: `unterminatedString()`, `invalidCharacter()`, `unexpectedEOF()`
- Error messages must be QA-tester friendly (non-programmer language)
- Include source location in every diagnostic

**Position Tracking:**
- Line and column are 1-indexed (starts at 1, not 0)
- Track position, line, column as private class members
- Update on every character advance
- Reset column to 1 on newline, increment line

### Project Structure Alignment

**File Organization (from project-context.md):**
```
packages/core/src/scanner/
├── index.ts           # Public exports
├── scanner.ts         # Scanner class implementation
├── tokens.ts          # Token type definitions
├── keywords.ts        # Keyword mappings
└── scanner.test.ts    # Co-located unit tests
```

**Naming Conventions:**
- Files: `camelCase.ts` (scanner.ts, tokens.ts, keywords.ts)
- Types: `PascalCase` (Token, Scanner, TokenKind)
- Private members: `private _memberName` (BOTH keyword and underscore)
- Functions: `camelCase` (scan, scanIdentifier)
- Constants: `UPPER_SNAKE_CASE` (DSL_KEYWORDS)

**Module Exports:**
- ALL public exports through `index.ts` only
- Do NOT export internal helper functions
- Scanner class and scan() function are public API

### Technical Implementation Guidance

**Lexical Analysis Best Practices:**
1. **Character-by-character processing:** Use position-based scanning
2. **Lookahead:** Use peek() for multi-character operators
3. **State tracking:** Maintain position, line, column consistently
4. **Error recovery:** Continue scanning after errors to find all issues
5. **Source location:** Capture start position before scanning each token

**String Literal Handling:**
- Support both single `'` and double `"` quotes
- Handle escape sequences: `\n`, `\t`, `\\`, `\"`, `\'`
- Unterminated strings: report error but continue scanning
- Don't interpret escape sequences at scan time (just recognize them)

**Number Literal Handling:**
- Integers: sequences of digits (0-9)
- Floats: digits + decimal point + digits (e.g., 123.45)
- Consider negative numbers: leading `-` sign
- Convert to JavaScript number type

**Keyword Recognition:**
- Keywords: `schema`, `profile`, `context`, `unique`, `template`
- Scan as identifier first, then check if keyword
- Case-sensitive matching (schema ≠ Schema)

### Testing Strategy

**Unit Tests (Bun Test Runner):**
- Fast, focused tests for individual scanner functions
- Test each token type independently
- Test error cases (unterminated strings, invalid characters)
- Test edge cases (empty input, only whitespace, EOF)
- Test position tracking (line/column accuracy)

**BDD Tests (Cucumber + Screenplay):**
- End-to-end tokenization scenarios
- User-facing behavior: "QA Tester scans DSL source code"
- Integration with Result type and Diagnostic system
- Location: `packages/core/features/scanner.feature`
- Step definitions: `packages/core/features/step_definitions/scanner.steps.ts`

**Test Coverage Goals:**
- All token types tokenized correctly
- All error cases handled gracefully
- Position tracking accurate
- Multiple error accumulation works

### Common Pitfalls to Avoid

❌ **DON'T:**
- Use 0-indexed line/column (MUST be 1-indexed)
- Throw exceptions for lexical errors (use Result<T,E> pattern)
- Stop scanning at first error (collect ALL errors)
- Export private helper functions through index.ts
- Use PascalCase for file names (use camelCase.ts)
- Forget to add `private` keyword with `_underscore`
- Use CommonJS `require()` (use ESM `import/export`)
- Skip escape sequence handling in strings
- Mutate token objects after creation (use `readonly`)

✅ **DO:**
- Start line and column at 1 (1-indexed)
- Use Result<Token[], Diagnostic[]> return type
- Continue scanning after errors to collect all issues
- Export only public API through index.ts
- Use camelCase.ts for all file names
- Use `private _memberName` for all private members
- Use ESM modules (`import`/`export`)
- Handle escape sequences: `\n`, `\t`, `\\`, `\"`, `\'`
- Make token types immutable with `readonly`

### Dependencies and Imports

**Existing Utilities to Use:**
- `Result<T,E>` from `packages/core/src/common/result.ts`
- `ok()`, `err()` helpers from `packages/core/src/common/result.ts`
- `Diagnostic`, `SourceLocation` from `packages/core/src/common/diagnostic.ts`
- Diagnostic factories: `unterminatedString()`, `invalidCharacter()`, `unexpectedEOF()`

**No External Dependencies:**
- Do NOT use Faker.js or any external parsing libraries
- Do NOT use regex-based tokenization (character-by-character scanning)
- Use only Bun built-in APIs and TypeScript standard library

### References

**Source Documents:**
- [Epic Definition](docs/epics.md#story-21-scanner-token-types-and-lexical-analysis) - Complete story requirements
- [Architecture - Token Representation](docs/architecture.md#token-representation-discriminated-union-types) - Discriminated union pattern
- [Architecture - Error Handling](docs/architecture.md#error-accumulation-result-type-pattern) - Result type usage
- [Architecture - Implementation Patterns](docs/architecture.md#naming-patterns) - Naming conventions, file structure
- [Project Context](docs/project-context.md#typescript-strict-mode-requirements) - TypeScript rules, testing strategy
- [Story 1.2 - Result Type](docs/sprint-artifacts/1-2-common-utilities-result-type-pattern.md) - Result<T,E> implementation
- [Story 1.3 - Diagnostic System](docs/sprint-artifacts/1-3-common-utilities-diagnostic-system.md) - Error reporting system

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### File List

_To be filled with created/modified files_

---

**Story Preparation Completed:** 2026-01-06

**Ultimate Context Engine Analysis Complete** - This story file contains comprehensive developer guidance extracted from:
- Epic 2 requirements and all story acceptance criteria
- Architecture decisions on token representation, error handling, and multi-pass compilation
- Project context rules for TypeScript patterns, naming conventions, and testing strategies
- Existing common utilities (Result, Diagnostic) from Stories 1.2 and 1.3
- File organization and module export patterns from completed Story 1.5

**Next Steps:**
1. Review this comprehensive story context
2. Optional: Run `*validate-create-story` for quality competition check
3. Load Dev agent and run `dev-story` for implementation
4. Run `code-review` when complete
