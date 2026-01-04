# Story 1.2: Common Utilities - Result Type Pattern

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a Result<T, E> type pattern for error handling**,
so that **I can handle expected errors explicitly without throwing exceptions**.

## Acceptance Criteria

**Given** I am implementing error handling for the DSL parser
**When** I create the Result type utilities in `packages/core/src/common/result.ts`
**Then** a discriminated union type `Result<T, E>` exists with `{ ok: true; value: T }` and `{ ok: false; errors: E }` variants
**And** helper functions `ok<T>(value: T): Result<T>` and `err<E>(errors: E): Result<never, E>` are exported
**And** TypeScript enforces exhaustive checking when consuming Result values
**And** the module exports through `packages/core/src/common/index.ts`
**And** unit tests verify both success and error cases with type safety
**And** example usage is documented in code comments

## Tasks / Subtasks

- [x] Create Result type definition (AC: 1)
  - [x] Define discriminated union type `Result<T, E>` with `ok` discriminator
  - [x] Define success variant: `{ ok: true; value: T }`
  - [x] Define error variant: `{ ok: false; errors: E }`
  - [x] Use `readonly` properties for immutability
- [x] Create helper functions (AC: 2)
  - [x] Implement `ok<T>(value: T): Result<T, never>` factory function
  - [x] Implement `err<E>(errors: E): Result<never, E>` factory function
  - [x] Add utility functions: `isOk()`, `isErr()`, `unwrap()`, `unwrapOr()`
  - [x] Add `map()` and `mapErr()` for functional transformation
- [x] Set up common module structure (AC: 4)
  - [x] Create `packages/core/src/common/` directory
  - [x] Create `packages/core/src/common/result.ts` implementation
  - [x] Create `packages/core/src/common/index.ts` barrel export
  - [x] Export Result types and functions through index
- [x] Write comprehensive unit tests (AC: 5)
  - [x] Create `packages/core/src/common/result.test.ts`
  - [x] Test ok() factory function returns success result
  - [x] Test err() factory function returns error result
  - [x] Test type narrowing with discriminator (ok: boolean)
  - [x] Test helper utilities (isOk, isErr, unwrap, unwrapOr)
  - [x] Test functional transformations (map, mapErr)
  - [x] Verify TypeScript exhaustive checking with example usage
- [x] Document usage patterns (AC: 6)
  - [x] Add JSDoc comments to all public types and functions
  - [x] Include usage examples in comments showing success and error cases
  - [x] Document the rationale for Result pattern over exceptions

## Dev Notes

### Critical Architecture Patterns

**From [project-context.md](../project-context.md#error-handling-patterns):**

**Result<T, E> Type Pattern (MANDATORY):**
- **NEVER throw exceptions for expected errors** - Use Result type instead
- Discriminated union with `ok` boolean discriminator for TypeScript narrowing
- Success variant: `{ ok: true; value: T }`
- Error variant: `{ ok: false; errors: E }` (note: plural "errors" for consistency with Diagnostic[])
- Enable exhaustive checking via TypeScript strict mode

**Example from project-context.md:**
```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ✅ Correct usage
function parse(tokens: Token[]): Result<Program, Diagnostic[]> {
  if (error) return { ok: false, error: diagnostics };
  return { ok: true, value: program };
}

// Consumer pattern with exhaustive checking
const result = parse(tokens);
if (result.ok) {
  // TypeScript knows: result.value is Program
  console.log(result.value);
} else {
  // TypeScript knows: result.error is Diagnostic[]
  console.error(result.error);
}
```

**From [architecture.md](../architecture.md#error-handling-strategy):**

**Error Handling Philosophy:**
- Two error categories:
  1. **Expected errors** (DSL syntax errors, validation failures) → Use Result<T, E>
  2. **Unexpected errors** (file system failures, OOM) → Can throw exceptions
- Result type is for parser/analyzer/generator phases
- Diagnostic type will be defined in Story 1.3 (next story)
- For now, use generic E type parameter (will specialize to Diagnostic[] later)

**From [project-context.md](../project-context.md#typescript-strict-mode-requirements):**

**TypeScript Constraints:**
- **strict: true** enabled - ensures exhaustive checking works
- **No `any` types** - Result generic parameters must be concrete
- **Explicit return types** required for all public functions
- **Immutable data structures** - use `readonly` for Result properties

**File Naming & Module Structure:**
- **camelCase.ts** naming: `result.ts` (NOT Result.ts, not result-type.ts)
- **Module exports through index.ts**: Create `common/index.ts` barrel
- **Co-located tests**: `result.test.ts` in same directory as `result.ts`

### Implementation Guidance

**Core Result Type (result.ts):**
```typescript
// Main discriminated union type
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; errors: E };

// Factory functions
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(errors: E): Result<never, E> {
  return { ok: false, errors };
}

// Type guards (for convenience, though not strictly needed with discriminator)
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; errors: E } {
  return !result.ok;
}

// Utility functions (Rust-inspired API)
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error('Called unwrap on error Result');
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

// Functional transformations
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (errors: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.errors));
}
```

**Module Barrel Export (common/index.ts):**
```typescript
export type { Result } from './result';
export { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr } from './result';
```

**Test Strategy (result.test.ts):**
- Use Bun's built-in test runner (import from 'bun:test' or use globals)
- Test factory functions create correct structure
- Test discriminator-based narrowing works
- Test utility functions behave correctly
- Test type safety (TypeScript compilation is part of test)

### Dependencies on Previous Stories

**Story 1.1 (Initialize Bun Monorepo):**
- ✅ Complete - monorepo structure exists
- `packages/core/` directory exists with `src/` folder
- TypeScript strict mode enabled in `tsconfig.json`
- `bun test` command configured and working

**Files Created in Story 1.1:**
- `packages/core/package.json` - package metadata
- `packages/core/tsconfig.json` - strict mode enabled
- `packages/core/src/index.ts` - main entry point (currently empty)

### Files to Create in This Story

**New Files:**
1. `packages/core/src/common/result.ts` - Result type implementation
2. `packages/core/src/common/index.ts` - Barrel export for common utilities
3. `packages/core/src/common/result.test.ts` - Unit tests

**Modified Files:**
1. `packages/core/src/index.ts` - Add export: `export * from './common';`

### Testing Strategy

**Unit Test Coverage (result.test.ts):**
```typescript
import { describe, test, expect } from 'bun:test';
import { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr } from './result';

describe('Result type', () => {
  test('ok() creates success result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  test('err() creates error result', () => {
    const result = err(['error message']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(['error message']);
    }
  });

  test('discriminator enables exhaustive checking', () => {
    const successResult = ok(100);
    const errorResult = err(['failed']);
    
    // Type narrowing works
    if (successResult.ok) {
      // TypeScript knows: successResult.value is number
      const value: number = successResult.value;
      expect(value).toBe(100);
    }
    
    if (!errorResult.ok) {
      // TypeScript knows: errorResult.errors is string[]
      const errors: string[] = errorResult.errors;
      expect(errors).toEqual(['failed']);
    }
  });

  test('isOk type guard works', () => {
    expect(isOk(ok(42))).toBe(true);
    expect(isOk(err(['error']))).toBe(false);
  });

  test('isErr type guard works', () => {
    expect(isErr(err(['error']))).toBe(true);
    expect(isErr(ok(42))).toBe(false);
  });

  test('unwrap returns value for ok result', () => {
    const result = ok(42);
    expect(unwrap(result)).toBe(42);
  });

  test('unwrap throws for error result', () => {
    const result = err(['error']);
    expect(() => unwrap(result)).toThrow();
  });

  test('unwrapOr returns value for ok result', () => {
    const result = ok(42);
    expect(unwrapOr(result, 0)).toBe(42);
  });

  test('unwrapOr returns default for error result', () => {
    const result = err(['error']);
    expect(unwrapOr(result, 0)).toBe(0);
  });

  test('map transforms ok value', () => {
    const result = ok(10);
    const doubled = map(result, (x) => x * 2);
    expect(doubled.ok && doubled.value).toBe(20);
  });

  test('map passes through error', () => {
    const result = err(['error']);
    const mapped = map(result, (x: number) => x * 2);
    expect(!mapped.ok && mapped.errors).toEqual(['error']);
  });

  test('mapErr transforms error', () => {
    const result = err('simple error');
    const mapped = mapErr(result, (e) => [e]);
    expect(!mapped.ok && mapped.errors).toEqual(['simple error']);
  });

  test('mapErr passes through ok value', () => {
    const result = ok(42);
    const mapped = mapErr(result, (e: string) => [e]);
    expect(mapped.ok && mapped.value).toBe(42);
  });
});
```

### Integration with Future Stories

**Story 1.3 (Diagnostic System) - NEXT:**
- Will define `Diagnostic` type for structured errors
- Result type will be specialized: `Result<Program, Diagnostic[]>`
- Error handling pattern established here will be reused

**Story 2.1-2.6 (DSL Parser):**
- Scanner will return: `Result<Token[], Diagnostic[]>`
- Parser will return: `Result<Program, Diagnostic[]>`
- Analyzer will return: `Result<ValidatedProgram, Diagnostic[]>`
- All use the Result pattern defined here

**Story 3.x (Generator):**
- Generator may return: `Result<AsyncIterable<Record>, Diagnostic[]>`
- Consistent error handling throughout the pipeline

### Project Structure Notes

**Alignment with Unified Project Structure:**
- ✅ Follows camelCase naming: `result.ts`, not `Result.ts` or `result-type.ts`
- ✅ Module organization: `common/` for shared utilities
- ✅ Co-located tests: `result.test.ts` next to implementation
- ✅ Barrel exports: All exports through `common/index.ts`
- ✅ TypeScript strict mode: Enables exhaustive checking

**No Conflicts Detected:**
- Architecture document prescribes this exact pattern
- Project context mandates Result<T,E> for error handling
- File naming convention followed exactly

### References

- **Primary Source**: [project-context.md](../project-context.md#error-handling-patterns) - Result<T,E> pattern specification
- **Architecture**: [architecture.md](../architecture.md#error-handling-strategy) - Error handling philosophy
- **Previous Story**: [1-1-initialize-bun-monorepo-with-core-and-cli-packages.md](./1-1-initialize-bun-monorepo-with-core-and-cli-packages.md#dev-notes) - Established TypeScript configuration

### Quality Checklist

**Before marking story as done:**
- [x] Result type correctly implements discriminated union with `ok: boolean`
- [x] Factory functions (ok, err) work correctly
- [x] Utility functions (unwrap, unwrapOr, map, mapErr) are implemented
- [x] TypeScript exhaustive checking verified (try compiling invalid cases)
- [x] All unit tests pass with `bun test`
- [x] Module exports through `common/index.ts` barrel
- [x] Main `packages/core/src/index.ts` re-exports common utilities
- [x] JSDoc documentation complete with usage examples
- [x] Code follows camelCase.ts naming convention
- [x] No TypeScript errors with strict mode enabled

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

✅ **Result Type Implementation (2026-01-04)**
- Implemented discriminated union `Result<T, E>` with `ok: boolean` discriminator
- Added `readonly` properties for immutability (AC: 1)
- Created factory functions: `ok()` and `err()` with proper type signatures (AC: 2)
- Implemented type guards: `isOk()` and `isErr()` for type narrowing
- Added utility functions: `unwrap()`, `unwrapOr()` for value extraction
- Implemented functional transformations: `map()` and `mapErr()`
- All functions include comprehensive JSDoc documentation with examples (AC: 6)

✅ **Module Structure (AC: 4)**
- Created `packages/core/src/common/` directory
- Implemented barrel export pattern through `common/index.ts`
- Updated main `packages/core/src/index.ts` to re-export common utilities
- Follows camelCase.ts naming convention as per project-context.md

✅ **Comprehensive Testing (AC: 5)**
- Created 40 unit tests covering all functions and edge cases
- Verified discriminator-based type narrowing works correctly (AC: 3)
- Tested factory functions, type guards, unwrap utilities
- Tested functional transformations (map, mapErr)
- Included real-world usage patterns with parseNumber example
- All tests pass: `40 pass, 0 fail` with Bun test runner

✅ **Quality Assurance**
- TypeScript strict mode compilation passes with no errors
- No regressions in existing tests (packages/core and packages/cli)
- Added @types/bun for proper bun:test type support
- Verified exports work correctly through main index
- Code follows all project-context.md patterns and conventions

✅ **Code Review Fixes (2026-01-04)**
- Updated project-context.md canonical example to use `errors` (plural) for consistency
- Enhanced unwrap() error message to include error details for debugging
- Completed all quality checklist items after verification
- Updated File List to include package.json modification
- All tests still passing after improvements

### File List

**Files Created:**
- `packages/core/src/common/result.ts` - Result type and utilities (219 lines)
- `packages/core/src/common/index.ts` - Barrel export (8 lines)
- `packages/core/src/common/result.test.ts` - Unit tests (329 lines)

**Files Modified:**
- `packages/core/src/index.ts` - Added export for common module (3 lines added)
- `package.json` - Added @types/bun devDependency (1 line added)
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status to in-progress → review → done
- `docs/project-context.md` - Updated canonical Result type example to use `errors` property
- `packages/core/src/common/result.ts` - Enhanced unwrap() error message with error details
