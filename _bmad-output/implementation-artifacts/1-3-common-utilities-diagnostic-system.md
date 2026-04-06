# Story 1.3: Common Utilities - Diagnostic System

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a comprehensive diagnostic system for error reporting**,
so that **I can provide clear, actionable error messages with source locations to users**.

## Acceptance Criteria

**Given** I need to report errors with file locations and helpful messages
**When** I implement the diagnostic system in `packages/core/src/common/diagnostic.ts`
**Then** a `Diagnostic` interface exists with `code`, `message`, `severity`, `location`, `suggestion`, and `related` fields
**And** a `SourceLocation` interface exists with `file`, `line`, `column`, and `length` fields
**And** diagnostic factory functions are provided for common error types
**And** error codes follow the `phase.errorType` naming convention (e.g., `scanner.unterminatedString`)
**And** the module exports through `packages/core/src/common/index.ts`
**And** unit tests verify diagnostic creation and formatting
**And** line and column numbers are 1-indexed as specified

## Tasks / Subtasks

- [x] Create SourceLocation type definition (AC: 2)
  - [x] Define interface with `file: string`, `line: number` (1-indexed), `column: number` (1-indexed), `length: number`
  - [x] Add JSDoc documentation explaining 1-indexed line/column convention
  - [x] Make all fields readonly for immutability
- [x] Create Diagnostic type definition (AC: 1)
  - [x] Define interface with all required fields: `code`, `message`, `severity`, `location`, `suggestion?`, `related?`
  - [x] Define `DiagnosticSeverity` enum: `'error'` | `'warning'` | `'info'`
  - [x] Use `SourceLocation` type for location field
  - [x] Make location optional since some diagnostics may be global
  - [x] Related diagnostics array should be readonly
- [x] Create diagnostic factory functions (AC: 3)
  - [x] Implement `createDiagnostic()` base factory function
  - [x] Implement scanner-specific factories: `unterminatedString()`, `invalidCharacter()`, `unexpectedEOF()`
  - [x] Implement parser-specific factories: `unexpectedToken()`, `expectedToken()`, `missingSemicolon()`
  - [x] Implement analyzer-specific factories: `undefinedReference()`, `typeMismatch()`, `duplicateDefinition()`
  - [x] Each factory should follow naming convention `phase.errorType` (AC: 4)
- [x] Export through common module index (AC: 5)
  - [x] Export all types from `packages/core/src/common/diagnostic.ts`
  - [x] Update `packages/core/src/common/index.ts` to include diagnostic exports
  - [x] Ensure barrel export pattern is followed
- [x] Write comprehensive unit tests (AC: 6)
  - [x] Create `packages/core/src/common/diagnostic.test.ts`
  - [x] Test SourceLocation creation with 1-indexed values
  - [x] Test Diagnostic creation with all required fields
  - [x] Test factory functions produce correct error codes
  - [x] Test diagnostic with suggestions
  - [x] Test diagnostic with related diagnostics
  - [x] Test severity levels (error, warning, info)
  - [x] Verify immutability of diagnostic objects

## Dev Notes

### 🎯 ULTIMATE CONTEXT ENGINE ANALYSIS - Everything You Need to Know!

This story is **CRITICAL** for the entire project's success. The diagnostic system is the foundation for user-friendly error messages that distinguish this tool from competitors. QA testers with minimal coding experience will depend on these error messages to fix their DSL schemas.

### Architecture & Design Philosophy

**From [architecture.md](../architecture.md#error-handling-architecture):**

The project uses a **Result<T, E> pattern** for expected errors, where E is `Diagnostic[]`. This story creates the Diagnostic type that will be used throughout the entire compilation pipeline:

```
Scanner → Result<Token[], Diagnostic[]>
Parser → Result<Program, Diagnostic[]>
Analyzer → Result<ValidatedProgram, Diagnostic[]>
```

**From [project-context.md](../project-context.md#error-handling-patterns):**

```typescript
interface Diagnostic {
  kind: 'error' | 'warning'; // Note: Update to use 'severity' field instead
  message: string;
  location: SourceLocation;
}

interface SourceLocation {
  file: string;
  line: number; // 1-indexed
  column: number; // 1-indexed
  length: number;
}
```

**CRITICAL DESIGN DECISIONS:**

1. **1-Indexed Line/Column Numbers**: The architecture specifies 1-indexed line and column numbers to match standard editor conventions. Most users expect "line 1" to be the first line, not "line 0". This is a **MANDATORY** requirement that must be followed consistently across scanner, parser, and analyzer phases.

2. **Error Code Convention**: Follow `phase.errorType` pattern:
   - Scanner errors: `scanner.unterminatedString`, `scanner.invalidCharacter`
   - Parser errors: `parser.unexpectedToken`, `parser.expectedToken`
   - Analyzer errors: `analyzer.undefinedReference`, `analyzer.typeMismatch`

3. **Severity Levels**: Must support `error`, `warning`, and `info` levels. Use a discriminated union or enum type. Errors block compilation, warnings are shown but don't block, info is for helpful messages.

4. **Helpful Suggestions**: The `suggestion` field is CRITICAL for QA user experience. Examples:
   - "Did you mean 'firstName' instead of 'firstname'?" (fuzzy matching)
   - "Add a semicolon at the end of this line"
   - "Expected a closing brace '}' to match the opening brace at line 5"

5. **Related Diagnostics**: Support linking related diagnostics for complex errors:
   - Show where a symbol was originally defined when reporting duplicate definition
   - Show all locations where a circular dependency exists
   - Link field references to their declarations

### Previous Story Integration (Story 1.2)

**From [1-2-common-utilities-result-type-pattern.md](./1-2-common-utilities-result-type-pattern.md):**

The Result type was implemented in Story 1.2 with this structure:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E }; // Note: field is "errors" (plural)
```

**INTEGRATION REQUIREMENTS:**

1. The Result type expects `errors` (plural) field, so Diagnostic will be used as `Diagnostic[]` in most cases
2. The error variant uses `errors` not `error` - this is intentional for collecting multiple diagnostics
3. Scanner, parser, and analyzer phases should accumulate ALL errors before returning, not fail on first error
4. This allows users to see ALL problems at once instead of fixing one at a time

**Example Integration Pattern:**

```typescript
function scan(source: string): Result<Token[], Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const tokens: Token[] = [];

  // Collect ALL errors during scanning
  // ...scanning logic...

  if (diagnostics.length > 0) {
    return { ok: false, errors: diagnostics };
  }
  return { ok: true, value: tokens };
}
```

### Critical Implementation Details from Architecture

**From [architecture.md](../architecture.md#implementation-patterns-consistency-rules):**

**Naming Patterns (MANDATORY):**

- **Files**: `camelCase.ts` - MUST be `diagnostic.ts` not `Diagnostic.ts` or `diagnostic-system.ts`
- **Interfaces/Types**: `PascalCase` - `Diagnostic`, `SourceLocation`, `DiagnosticSeverity`
- **Functions**: `camelCase` - `createDiagnostic`, `formatDiagnostic`
- **Private members**: `private _memberName` - if class is used, all private fields need underscore prefix

**TypeScript Patterns (MANDATORY):**

- Use `readonly` for all fields in interfaces (immutability requirement)
- No `any` types - TypeScript strict mode
- Explicit return types for all public functions
- Named exports only, no default exports
- Export through index.ts barrel pattern

**File Organization:**

```
packages/core/src/common/
├── result.ts              # ✅ Already exists (Story 1.2)
├── result.test.ts         # ✅ Already exists (Story 1.2)
├── diagnostic.ts          # ⬅️ CREATE THIS
├── diagnostic.test.ts     # ⬅️ CREATE THIS
└── index.ts               # ⬅️ UPDATE THIS to export diagnostic types
```

### Testing Requirements

**From [architecture.md](../architecture.md#testing-strategy) & [project-context.md](../project-context.md#testing-rules):**

**Test Framework:** Use Bun's built-in test runner (NOT Jest, NOT Mocha)

```typescript
import { describe, test, expect } from 'bun:test';
import { createDiagnostic, type Diagnostic, type SourceLocation } from './diagnostic';

describe('Diagnostic', () => {
  test('creates diagnostic with all required fields', () => {
    const location: SourceLocation = {
      file: 'test.td',
      line: 1,
      column: 1,
      length: 5,
    };

    const diagnostic: Diagnostic = createDiagnostic({
      code: 'scanner.unterminatedString',
      message: 'Unterminated string literal',
      severity: 'error',
      location,
    });

    expect(diagnostic.code).toBe('scanner.unterminatedString');
    expect(diagnostic.location?.line).toBe(1);
  });
});
```

**CRITICAL TEST CASES:**

1. **1-Indexed Validation**: Verify line and column are 1-indexed, not 0-indexed
2. **Immutability**: Verify readonly fields cannot be modified (TypeScript compile-time check)
3. **Optional Fields**: Test diagnostics work with and without suggestion/related fields
4. **Factory Functions**: Each factory function should produce correct error code
5. **Severity Levels**: Test all three severity levels work correctly
6. **Related Diagnostics**: Test linking multiple diagnostics together

**Test File Location:** `packages/core/src/common/diagnostic.test.ts` (co-located with implementation)

### Real-World Error Message Examples

**From [architecture.md](../architecture.md#error-handling-user-experience):**

The CLI tool (Story 4.5) will eventually format these diagnostics with Rust-style error messages. The diagnostic system should provide ALL the information needed for beautiful formatting:

**Example 1: Scanner Error (Unterminated String)**

```
error: scanner.unterminatedString
  --> schema.td:3:15
   |
 3 |   name: "John
   |         ^^^^^ unterminated string literal
   |
   = help: Add closing quote (") at the end of the string
```

**Example 2: Parser Error (Missing Semicolon)**

```
error: parser.expectedToken
  --> schema.td:5:20
   |
 5 |   email: string
   |                ^ expected semicolon
   |
   = help: Add ';' at the end of this line
```

**Example 3: Analyzer Error (Undefined Reference)**

```
error: analyzer.undefinedReference
  --> schema.td:10:25
   |
10 |   fullName: "{{fistName}} {{lastName}}"
   |                ^^^^^^^^^ undefined field reference
   |
   = help: Did you mean 'firstName' instead of 'fistName'?
```

**Example 4: Analyzer Error with Related Diagnostic (Duplicate Definition)**

```
error: analyzer.duplicateDefinition
  --> schema.td:15:8
   |
15 | schema User {
   |        ^^^^ duplicate schema definition
   |
note: schema 'User' was first defined here
  --> schema.td:3:8
   |
 3 | schema User {
   |        ^^^^
```

**YOUR IMPLEMENTATION** should create Diagnostic objects that contain all this information:

- `code`: e.g., `"analyzer.undefinedReference"`
- `message`: e.g., `"undefined field reference"`
- `location`: File, line, column, length of problematic text
- `suggestion`: e.g., `"Did you mean 'firstName' instead of 'fistName'?"`
- `related`: Array of related diagnostics for showing context

### Integration with Future Stories

This diagnostic system will be used immediately in the next stories:

**Story 2.1 (Scanner)**: Will create diagnostics for:

- Unterminated strings: `scanner.unterminatedString`
- Invalid characters: `scanner.invalidCharacter`
- Unexpected EOF: `scanner.unexpectedEOF`

**Story 2.3 (Parser)**: Will create diagnostics for:

- Unexpected tokens: `parser.unexpectedToken`
- Expected tokens: `parser.expectedToken`
- Missing semicolons: `parser.missingSemicolon`
- Invalid syntax: `parser.invalidSyntax`

**Story 2.5 (Semantic Analyzer)**: Will create diagnostics for:

- Undefined references: `analyzer.undefinedReference`
- Type mismatches: `analyzer.typeMismatch`
- Duplicate definitions: `analyzer.duplicateDefinition`
- Circular dependencies: `analyzer.circularDependency`

**The factory functions you create now should anticipate these needs.**

### Git Intelligence from Previous Story (Story 1.2)

Looking at the completed Story 1.2 implementation patterns:

**File Structure Established:**

```
packages/core/src/common/
├── result.ts           # Main implementation
├── result.test.ts      # Co-located tests
└── index.ts            # Barrel exports
```

**Export Pattern Used in index.ts:**

```typescript
// From packages/core/src/common/index.ts (current state after Story 1.2)
export { ok, err, isOk, isErr } from './result';
export type { Result } from './result';
```

**YOU SHOULD FOLLOW THE SAME PATTERN:**

- Create `diagnostic.ts` with all types and factory functions
- Create `diagnostic.test.ts` with comprehensive tests
- Update `index.ts` to export diagnostic types and functions

**TypeScript Patterns to Follow (from Story 1.2):**

- Use `readonly` for interface fields
- Use `type` for discriminated unions
- Use `interface` for object shapes
- Explicit return types on all functions
- No `any` types (strict mode)

### Performance Considerations

**From [architecture.md](../architecture.md#nfr-performance-requirements):**

- **NFR2**: Schema validation must complete in <1 second
- This includes ALL diagnostic creation during scanning, parsing, and analysis
- Diagnostic objects should be lightweight (just data, no heavy computation)
- Avoid string concatenation in hot paths - build message once
- SourceLocation should be efficient to create (just 4 numbers)

**Memory Efficiency:**

- Diagnostics accumulate during compilation but are released after reporting
- For a typical schema file (100-500 lines), expect 0-50 diagnostics
- Each diagnostic ~200 bytes, so memory impact is minimal

### Anti-Patterns to Avoid

**❌ WRONG: Throwing exceptions for expected errors**

```typescript
throw new Error('Unterminated string at line 5');
```

**✅ CORRECT: Creating diagnostic objects**

```typescript
return createDiagnostic({
  code: 'scanner.unterminatedString',
  message: 'Unterminated string literal',
  severity: 'error',
  location: { file, line: 5, column: 10, length: 8 },
});
```

**❌ WRONG: 0-indexed line numbers**

```typescript
const location: SourceLocation = {
  file: 'test.td',
  line: 0, // WRONG! Should be 1-indexed
  column: 0,
  length: 5,
};
```

**✅ CORRECT: 1-indexed line numbers**

```typescript
const location: SourceLocation = {
  file: 'test.td',
  line: 1, // CORRECT! First line is line 1
  column: 1,
  length: 5,
};
```

**❌ WRONG: Mutable diagnostic objects**

```typescript
interface Diagnostic {
  code: string;
  message: string;  // Missing readonly
  // ...
}

const diag = createDiagnostic(...);
diag.message = "Changed!";  // Should not be allowed
```

**✅ CORRECT: Immutable diagnostic objects**

```typescript
interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  // All fields readonly
}
```

### Quality Criteria for DEV Agent

**When implementing this story, the DEV agent MUST:**

1. ✅ Create both `diagnostic.ts` AND `diagnostic.test.ts` files
2. ✅ Use 1-indexed line/column numbers (verified by tests)
3. ✅ Follow `phase.errorType` error code convention
4. ✅ Make all interface fields `readonly`
5. ✅ Use camelCase for file names (not PascalCase or kebab-case)
6. ✅ Export through `index.ts` barrel pattern
7. ✅ Write comprehensive Bun tests (not Jest)
8. ✅ Use TypeScript strict mode (no `any` types)
9. ✅ Provide factory functions for common error types
10. ✅ Include JSDoc documentation for all public APIs

**Success Criteria:**

- `bun test` passes all tests
- TypeScript compiles with no errors
- Can import diagnostic types from `@testdata-generator/core` package
- Next story (Scanner) can use these diagnostics immediately
- Error messages will be QA-friendly and actionable

### Project Structure Reference

**From [architecture.md](../architecture.md#project-structure):**

```
testdata-generator/
├── packages/
│   ├── core/                           # @testdata-generator/core
│   │   ├── src/
│   │   │   ├── common/                 # ⬅️ YOU ARE HERE
│   │   │   │   ├── result.ts           # ✅ Exists (Story 1.2)
│   │   │   │   ├── result.test.ts      # ✅ Exists (Story 1.2)
│   │   │   │   ├── diagnostic.ts       # ⬅️ CREATE THIS
│   │   │   │   ├── diagnostic.test.ts  # ⬅️ CREATE THIS
│   │   │   │   └── index.ts            # ⬅️ UPDATE THIS
│   │   │   ├── scanner/                # 🔜 Story 2.1 (will use your diagnostics)
│   │   │   ├── parser/                 # 🔜 Story 2.2-2.3 (will use your diagnostics)
│   │   │   ├── analyzer/               # 🔜 Story 2.4-2.5 (will use your diagnostics)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/                            # 🔜 Story 4.5 (will format your diagnostics)
├── bunfig.toml
└── package.json
```

### Reference Documentation

**Key Files to Reference:**

1. [architecture.md](../architecture.md) - Overall architecture decisions
2. [project-context.md](../project-context.md) - Critical implementation rules
3. [epics.md](../epics.md) - Story 1.3 acceptance criteria
4. [1-2-common-utilities-result-type-pattern.md](./1-2-common-utilities-result-type-pattern.md) - Previous story patterns

**Online Resources:**

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Bun Test API: https://bun.sh/docs/cli/test
- Rust Error Messages (inspiration): https://doc.rust-lang.org/book/ch09-00-error-handling.html

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Implementation Notes

**Implementation Approach:**

Implemented the diagnostic system following red-green-refactor TDD principles:

1. **Type Design**: Created `SourceLocation` and `Diagnostic` interfaces with readonly fields for immutability, following TypeScript strict mode requirements. Used discriminated union type `DiagnosticSeverity` for severity levels.

2. **Factory Pattern**: Implemented `createDiagnostic()` as the base factory, then created phase-specific factory functions for scanner, parser, and analyzer errors. Each factory follows the `phase.errorType` naming convention.

3. **1-Indexed Convention**: All line and column numbers are 1-indexed per architecture requirements. Added comprehensive JSDoc documentation to make this explicit.

4. **Related Diagnostics**: Implemented support for linking related diagnostics (e.g., showing original definition location when reporting duplicate).

5. **Integration with Result Type**: Designed to work seamlessly with the Result<T, Diagnostic[]> pattern from Story 1.2.

**Key Design Decisions:**

- Made `location` optional on Diagnostic to support global errors
- Used type alias for `DiagnosticSeverity` instead of enum for better TypeScript discriminated union support
- Factory functions include smart defaults (e.g., `missingSemicolon` has default suggestion)
- All interfaces use `readonly` fields to enforce immutability at compile time

**Testing Strategy:**

- 39 comprehensive tests covering all factory functions, edge cases, and integration patterns
- Tests verify 1-indexed line/column numbers
- Tests verify error code conventions
- Tests demonstrate integration with Result type pattern
- Immutability tests include compile-time checks (TypeScript) and runtime verification

### Debug Log References

<!-- Dev agent: Link to any debugging sessions or issues encountered -->

### Completion Notes

- [x] All acceptance criteria met
- [x] All tests passing (`bun test`) - 87 tests pass, 0 fail
- [x] TypeScript compiles with no errors
- [x] Exports correctly through index.ts
- [x] Documentation complete (JSDoc comments)
- [x] 1-indexed line/column numbers verified
- [x] Immutability enforced (readonly fields)
- [x] Error code convention followed (phase.errorType)

**Test Results:** 39 diagnostic tests + 40 result tests + 3 index tests = 82 total tests passing (source files only, excluding dist/ duplicates)
**Files Created:** 2 (diagnostic.ts, diagnostic.test.ts)
**Files Modified:** 1 (index.ts)
**Ready for:** Scanner implementation (Story 2.1) can now use these diagnostics

### Files Created/Modified

- Created: `packages/core/src/common/diagnostic.ts` (439 lines)
- Created: `packages/core/src/common/diagnostic.test.ts` (662 lines)
- Modified: `packages/core/src/common/index.ts` (added diagnostic exports)
