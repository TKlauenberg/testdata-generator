# Story 2.6: End-to-End Schema Validation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to validate my DSL schema files and receive clear error messages**,
So that **I can fix issues before attempting data generation**.

## Acceptance Criteria

**Given** I have written a `.td` schema file
**When** I use the validation API from the core library
**Then** a public `validateSchema(source: string, filename: string): Result<ValidatedProgram>` function exists
**And** the function chains scanner → parser → analyzer in sequence
**And** validation completes in under 1 second for typical schema files (NFR2)
**And** all errors from all phases are collected and returned together
**And** error messages are sorted by file location (line, then column)
**And** the function returns a `ValidatedProgram` on success containing the complete validated AST
**And** the API is exported from `packages/core/src/index.ts`
**And** comprehensive Gherkin feature tests cover:
  - Valid schema validation succeeds
  - Syntax errors are reported clearly
  - Semantic errors are reported with suggestions
  - Multiple errors are collected and reported together
  - Performance requirements are met
**And** example schemas in `docs/examples/` demonstrate valid syntax

## Tasks / Subtasks

- [ ] Create end-to-end validation function (AC: 1, 2, 6)
  - [ ] Create `packages/core/src/validate.ts`
  - [ ] Define `validateSchema(source: string, filename: string): Result<ValidatedProgram>` function signature
  - [ ] Import Scanner from story 2.1
  - [ ] Import Parser from story 2.3
  - [ ] Import Analyzer from story 2.5
  - [ ] Import Result and Diagnostic types from common utilities

- [ ] Implement validation pipeline (AC: 2)
  - [ ] Phase 1: Call `scanner.scan(source)` with filename context
  - [ ] If scan fails, collect all lexical errors
  - [ ] Phase 2: Call `parser.parse(tokens)` with scanner result
  - [ ] If parse fails, collect all syntax errors
  - [ ] Phase 3: Call `analyzer.analyze(ast)` with parser result
  - [ ] If analysis fails, collect all semantic errors
  - [ ] On success, return ValidatedProgram with complete validated AST

- [ ] Implement error collection and sorting (AC: 4, 5)
  - [ ] Create `combineErrors(errors: Diagnostic[][]): Diagnostic[]` utility function
  - [ ] Flatten all error arrays from all phases into single array
  - [ ] Sort errors by: file path → line number → column number
  - [ ] Ensure related information (from duplicate definitions) is preserved
  - [ ] Handle errors without location (place at end of list)
  - [ ] Return sorted error array in Result

- [ ] Export through public API (AC: 7)
  - [ ] Update `packages/core/src/index.ts`
  - [ ] Export `validateSchema` function
  - [ ] Re-export `ValidatedProgram` type from analyzer
  - [ ] Re-export `Result` type from common utilities
  - [ ] Re-export `Diagnostic` type from common utilities
  - [ ] Create barrel export for all validation-related types

- [ ] Performance optimization and testing (AC: 3)
  - [ ] Create test schema files of varying sizes:
    - [ ] Small: 5 schemas, 20 fields (~200 lines)
    - [ ] Medium: 20 schemas, 100 fields (~1000 lines)
    - [ ] Large: 50 schemas, 500 fields (~5000 lines)
  - [ ] Implement performance test in `validate.test.ts`
  - [ ] Use `performance.now()` to measure validation time
  - [ ] Assert validation completes in < 1000ms for all sizes
  - [ ] If performance issues, profile and optimize hot paths
  - [ ] Document performance characteristics in code comments

- [ ] Write comprehensive unit tests (AC: implicit)
  - [ ] Create `packages/core/src/validate.test.ts`
  - [ ] Test: Valid schema returns ValidatedProgram
  - [ ] Test: Lexical errors returned from scanner phase
  - [ ] Test: Syntax errors returned from parser phase
  - [ ] Test: Semantic errors returned from analyzer phase
  - [ ] Test: Multiple errors from different phases collected together
  - [ ] Test: Errors sorted by line/column correctly
  - [ ] Test: Empty source string handled gracefully
  - [ ] Test: Large schema files validated successfully
  - [ ] Test: Filename parameter included in error context

- [ ] Write Gherkin feature tests (AC: 8)
  - [ ] Update or create `packages/core/features/end-to-end-validation.feature`
  - [ ] Scenario: Valid schema file validates successfully
  - [ ] Scenario: Schema with lexical error reports clear message
  - [ ] Scenario: Schema with syntax error reports clear message
  - [ ] Scenario: Schema with semantic error reports suggestions
  - [ ] Scenario: Schema with multiple errors reports all sorted
  - [ ] Scenario: Large schema file validates within performance requirement
  - [ ] Create step definitions using Screenplay pattern
  - [ ] Verify ValidatedProgram structure on success

- [ ] Create example schema files (AC: 9)
  - [ ] Create `docs/examples/` directory if not exists
  - [ ] Create `docs/examples/basic-schema.td` - minimal valid schema
  - [ ] Create `docs/examples/user-profile.td` - typical user schema with generators
  - [ ] Create `docs/examples/complex-schema.td` - multi-schema with relationships
  - [ ] Add comments explaining DSL syntax and features
  - [ ] Verify all examples validate successfully
  - [ ] Update README with links to examples

- [ ] Integration and validation
  - [ ] Verify imports from Scanner (story 2.1)
  - [ ] Verify imports from Parser (story 2.3)
  - [ ] Verify imports from Analyzer (story 2.5)
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Test with various schema files (valid and invalid)
  - [ ] Verify error messages are user-friendly and actionable
  - [ ] Verify performance requirements met on developer machine

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Completes Epic 2: DSL Core - Parse and Validate Schemas**

This is the **final integration story** that brings together all previous work from stories 2.1-2.5. It creates the **public validation API** that QA testers and developers will use to validate DSL schema files before data generation.

**Critical Mission:**
- Wire together scanner → parser → analyzer pipeline flawlessly
- Provide clear, sorted, comprehensive error reporting
- Meet strict performance requirements (< 1 second)
- Create production-ready public API that's easy to use
- Deliver example schemas demonstrating DSL syntax

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Not accumulating errors from all phases (stopping at first phase failure)
- ❌ Losing error context when combining errors from multiple phases
- ❌ Not sorting errors by location (confusing user with random order)
- ❌ Not testing performance with realistic schema sizes
- ❌ Creating overly complex API when simple function is sufficient
- ❌ Not providing example schemas for users to learn from
- ❌ Forgetting to export types needed by API consumers

### Previous Story Intelligence

**From Story 2.5 (Semantic Analyzer - Type Checking and Validation):**

✅ **Critical Interfaces Established:**
```typescript
// Analyzer exports these - we will use them
import { analyze } from './analyzer/analyzer';
import type { ValidatedProgram } from './analyzer/types';

// Analyzer returns Result type
const analysisResult: Result<ValidatedProgram> = analyze(ast);
```

✅ **Error Accumulation Pattern:**
```typescript
// All phases return Result<T> with accumulated errors
const errors: Diagnostic[] = [];
if (!scanResult.ok) errors.push(...scanResult.errors);
if (!parseResult.ok) errors.push(...parseResult.errors);
if (!analysisResult.ok) errors.push(...analysisResult.errors);

// Sort before returning
errors.sort((a, b) => {
  if (a.location.line !== b.location.line) return a.location.line - b.location.line;
  return a.location.column - b.location.column;
});
```

✅ **Key Learnings:**
- ValidatedProgram contains complete validated AST + symbol table
- Analyzer performs exhaustive validation with suggestions
- All phases use Result type for consistent error handling
- Diagnostics include code, message, location, and optional suggestions

**From Story 2.4 (Semantic Analyzer - Symbol Table):**
- Symbol table is part of ValidatedProgram
- Duplicate definitions tracked with related information
- All lookups are case-sensitive

**From Story 2.3 (Parser - Recursive Descent Implementation):**

✅ **Parser Interface:**
```typescript
import { Parser } from './parser/parser';

const parser = new Parser(tokens);
const parseResult: Result<Program> = parser.parse();
```

✅ **Key Behavior:**
- Parser collects ALL syntax errors (doesn't stop at first)
- Provides context and suggestions for common mistakes
- Returns immutable AST with Program root node

**From Story 2.2 (Parser - AST Node Types):**
- Program node is root containing schema declarations
- All AST nodes are immutable with readonly properties
- All nodes include SourceLocation for error reporting

**From Story 2.1 (Scanner - Token Types and Lexical Analysis):**

✅ **Scanner Interface:**
```typescript
import { Scanner } from './scanner/scanner';

const scanner = new Scanner(source, filename);
const scanResult: Result<Token[]> = scanner.scan();
```

✅ **Key Behavior:**
- Scanner tracks line/column (1-indexed) in SourceLocation
- Collects ALL lexical errors before returning
- Returns Token array with EOF token at end
- Handles string escapes and numeric literals

**Common Patterns Across All Stories:**
- Result type: `{ ok: true, value: T } | { ok: false, errors: Diagnostic[] }`
- Diagnostic structure: code, message, severity, location, suggestion, relatedInformation
- Error codes format: `{phase}.{errorType}` (e.g., `scanner.unterminatedString`)
- 1-indexed line and column numbers
- Immutability everywhere

### Architecture Compliance Requirements

**From Core Architectural Decisions:**

**1. Pipeline Architecture (Multi-Pass):**
```
Source Code (string)
    ↓
Scanner: Lexical Analysis
    ↓
Token[] (or Diagnostic[])
    ↓
Parser: Syntax Analysis
    ↓
Program AST (or Diagnostic[])
    ↓
Analyzer: Semantic Analysis
    ↓
ValidatedProgram (or Diagnostic[])
```

**2. Functional Core Principles:**
- Pure functions: `validateSchema` should be pure (no side effects)
- Immutable data: Don't modify inputs, return new structures
- Explicit error handling: Use Result type, never throw exceptions
- Type safety: Use TypeScript strict mode

**3. Error Handling Architecture:**

**Result Type Pattern (CRITICAL):**
```typescript
// Our function signature must use Result
function validateSchema(
  source: string,
  filename: string
): Result<ValidatedProgram> {
  // Each phase returns Result<T>
  const scanResult = scanner.scan();
  if (!scanResult.ok) {
    return { ok: false, errors: scanResult.errors };
  }

  const parseResult = parser.parse(scanResult.value);
  if (!parseResult.ok) {
    return { ok: false, errors: parseResult.errors };
  }

  const analysisResult = analyze(parseResult.value);
  return analysisResult; // Already in Result format
}
```

**Error Accumulation Requirements:**
- Collect ALL errors from all phases
- Don't stop at first phase failure - continue to find more errors if possible
- But also: short-circuit if early phase fails (can't parse without tokens)
- Sort errors by location before returning
- Preserve all diagnostic metadata (suggestions, related info)

**4. Performance Requirements (NFR2):**
- Validation must complete in < 1 second for typical schema files
- "Typical" defined as: up to 20 schemas, ~100 fields, ~1000 lines
- Each phase should be optimized:
  - Scanner: O(n) where n = source characters
  - Parser: O(t) where t = tokens (roughly O(n))
  - Analyzer: O(s + f) where s = schemas, f = fields
- Total expected time: < 100ms for typical files, < 1000ms for large files

**5. Module Boundaries:**

**Core Package Structure:**
```
packages/core/src/
├── scanner/           # Story 2.1 - Complete
│   ├── scanner.ts
│   ├── token.ts
│   └── index.ts
├── parser/            # Stories 2.2, 2.3 - Complete
│   ├── ast.ts
│   ├── parser.ts
│   └── index.ts
├── analyzer/          # Stories 2.4, 2.5 - Complete
│   ├── symbolTable.ts
│   ├── analyzer.ts
│   ├── types.ts
│   └── index.ts
├── common/            # Story 1.2, 1.3 - Complete
│   ├── result.ts
│   ├── diagnostic.ts
│   └── index.ts
├── validate.ts        # THIS STORY - New file
└── index.ts          # Update to export validateSchema
```

**Public API Surface (@testdata-ai/core):**
```typescript
// Main validation function
export { validateSchema } from './validate';

// Types consumers need
export type { ValidatedProgram, ValidatedSchema, ValidatedField } from './analyzer/types';
export type { Result } from './common/result';
export type { Diagnostic, DiagnosticSeverity } from './common/diagnostic';

// AST types for advanced users
export type {
  Program,
  SchemaNode,
  FieldNode,
  // ... other AST node types
} from './parser/ast';

// Token types for advanced users (less common)
export type { Token, SourceLocation } from './scanner/token';
```

**From Implementation Patterns & Consistency Rules:**

**File Naming:**
- `validate.ts` - main validation module (kebab-case for multi-word would be `validate-schema.ts`, but `validate` is single word)
- `validate.test.ts` - co-located unit tests
- Test file location: same directory as source

**Function Naming:**
- Public API: `validateSchema` (camelCase, verb + noun)
- Internal utilities: `combineErrors`, `sortDiagnostics` (camelCase)

**Type Naming:**
- Interfaces/Types: PascalCase (ValidatedProgram, Result)
- Type parameters: Single uppercase letter (T, E) or descriptive PascalCase

**Error Code Format:**
```typescript
// Format: {phase}.{errorType}
'validation.pipelineError'  // For top-level validation failures
'validation.multiPhaseError' // When errors from multiple phases

// But errors from individual phases keep their codes:
'scanner.unterminatedString'
'parser.unexpectedToken'
'analyzer.undefinedReference'
```

**Testing Patterns:**

**Unit Test Structure:**
```typescript
import { describe, it, expect } from 'bun:test';
import { validateSchema } from './validate';

describe('validateSchema', () => {
  describe('valid schemas', () => {
    it('should return ValidatedProgram for simple valid schema', () => {
      const source = `schema User { name: string }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.ast.declarations).toHaveLength(1);
        expect(result.value.schemas.size).toBe(1);
      }
    });
  });

  describe('error handling', () => {
    it('should return lexical errors from scanner', () => {
      const source = `schema User { name: "unterminated }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/scanner\./);
      }
    });
  });
});
```

**Performance Test Pattern:**
```typescript
import { performance } from 'perf_hooks';

describe('performance requirements', () => {
  it('should validate typical schema in under 1 second', () => {
    const source = generateTypicalSchema(); // ~1000 lines

    const start = performance.now();
    const result = validateSchema(source, 'perf-test.td');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // < 1 second
    expect(result.ok).toBe(true);
  });
});
```

**Gherkin Test Location:**
```
packages/core/features/
└── end-to-end-validation.feature  # This story's scenarios

packages/core/tests/support/
└── steps/
    └── validation.steps.ts  # Step definitions
```

### Technical Requirements - Validation Pipeline

**1. Pipeline Orchestration Strategy:**

**Short-Circuit on Parse Failure:**
```typescript
function validateSchema(
  source: string,
  filename: string
): Result<ValidatedProgram> {
  // Phase 1: Scan
  const scanner = new Scanner(source, filename);
  const scanResult = scanner.scan();

  if (!scanResult.ok) {
    // Can't parse without tokens - return scanner errors
    return { ok: false, errors: scanResult.errors };
  }

  // Phase 2: Parse
  const parser = new Parser(scanResult.value);
  const parseResult = parser.parse();

  if (!parseResult.ok) {
    // Can't analyze without AST - return parse errors
    // But we could accumulate scan warnings if scanner had any
    return { ok: false, errors: parseResult.errors };
  }

  // Phase 3: Analyze
  const analysisResult = analyze(parseResult.value);

  // Return analysis result (success or failure)
  return analysisResult;
}
```

**Why Short-Circuit?**
- Parser needs valid tokens to work
- Analyzer needs valid AST to work
- Continuing would produce cascading errors (unhelpful)
- Each phase assumes valid input from previous phase

**Alternative: Try All Phases (DON'T DO THIS):**
```typescript
// ❌ BAD: Don't try to parse if scanning failed
const errors: Diagnostic[] = [];
const scanResult = scanner.scan();
if (!scanResult.ok) {
  errors.push(...scanResult.errors);
  // ❌ Parser will fail catastrophically with invalid tokens
  const parseResult = parser.parse([]); // Bad!
}
```

**2. Error Sorting Implementation:**

```typescript
function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    // Handle diagnostics without location (rare)
    if (!a.location) return 1;
    if (!b.location) return -1;

    // Sort by filename first (if multiple files in future)
    if (a.location.file !== b.location.file) {
      return a.location.file.localeCompare(b.location.file);
    }

    // Sort by line number
    if (a.location.line !== b.location.line) {
      return a.location.line - b.location.line;
    }

    // Sort by column number
    if (a.location.column !== b.location.column) {
      return a.location.column - b.location.column;
    }

    // Stable sort: maintain original order for same location
    return 0;
  });
}
```

**3. Performance Optimization Strategies:**

**Measurement:**
```typescript
import { performance } from 'perf_hooks';

function validateSchema(
  source: string,
  filename: string
): Result<ValidatedProgram> {
  const startTime = performance.now();

  // ... validation pipeline ...

  const duration = performance.now() - startTime;

  // Log performance in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Validation completed in ${duration.toFixed(2)}ms`);
  }

  return result;
}
```

**Expected Performance Profile:**
- Small schemas (< 10 schemas, < 50 fields): 10-50ms
- Medium schemas (10-25 schemas, 50-150 fields): 50-200ms
- Large schemas (25-50 schemas, 150-500 fields): 200-800ms
- Very large schemas (> 50 schemas, > 500 fields): 800-1000ms

**If Performance Issues:**
1. Profile with `bun --inspect` or Node.js profiler
2. Identify hot paths (likely in analyzer or parser)
3. Optimize algorithms (e.g., symbol table lookups, regex in templates)
4. Consider caching intermediate results
5. Avoid unnecessary object creation in tight loops

**4. Example Schema Files - Content Guidelines:**

**`docs/examples/basic-schema.td`:**
```
# Basic Schema Example
# Demonstrates minimal DSL syntax

schema User {
  # Identity field
  id: uuid

  # Basic fields
  name: string
  email: string
  age: number
  active: boolean
}
```

**`docs/examples/user-profile.td`:**
```
# User Profile Schema
# Demonstrates generators and field types

schema UserProfile {
  # Generated identity
  userId: uuid

  # Personal information with generators
  firstName: string @generate(firstName)
  lastName: string @generate(lastName)
  email: string @generate(email)

  # Temporal data
  createdAt: timestamp @generate(timestamp)
  birthDate: date @generate(dateRange, start: "1950-01-01", end: "2005-12-31")

  # Numeric fields
  age: number @generate(randomInt, min: 18, max: 90)
  score: number @generate(randomFloat, min: 0.0, max: 100.0)
}
```

**`docs/examples/complex-schema.td`:**
```
# Complex Schema Example
# Demonstrates multiple schemas and relationships

schema Organization {
  orgId: uuid
  name: string @generate(word)
  employeeCount: number @generate(randomInt, min: 10, max: 1000)
}

schema Department {
  deptId: uuid
  name: string @generate(pick, choices: ["Engineering", "Sales", "Marketing", "HR"])
  orgId: uuid  # Reference to Organization
}

schema Employee {
  empId: uuid
  firstName: string @generate(firstName)
  lastName: string @generate(lastName)
  email: string  # Template: {{firstName}}.{{lastName}}@example.com
  deptId: uuid  # Reference to Department
  salary: number @generate(randomInt, min: 50000, max: 200000)
}
```

### Library and Framework Requirements

**TypeScript Configuration:**
```json
// tsconfig.json - already configured in project
{
  "compilerOptions": {
    "strict": true,           // Enforce strict type checking
    "target": "ES2022",       // Modern JavaScript features
    "module": "ESNext",       // ESM modules
    "moduleResolution": "bundler",  // Bun-compatible
    "types": ["bun-types"]    // Bun runtime types
  }
}
```

**Testing Framework:**
```typescript
// Use Bun's built-in test runner
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// No additional test frameworks needed
// Bun provides Jest-compatible API
```

**Performance Testing:**
```typescript
// Use built-in performance API
import { performance } from 'perf_hooks';

// Or Bun's console.time
console.time('validation');
const result = validateSchema(source, filename);
console.timeEnd('validation');
```

**No External Dependencies Required:**
- Scanner, Parser, Analyzer already implemented
- Result and Diagnostic types already available
- Bun provides test runner and performance APIs
- TypeScript provides type safety

### File Structure and Module Exports

**New Files to Create:**

```
packages/core/
├── src/
│   ├── validate.ts                    # ✨ NEW - Main validation function
│   ├── validate.test.ts              # ✨ NEW - Unit tests
│   └── index.ts                      # UPDATE - Export validateSchema
├── features/
│   └── end-to-end-validation.feature # ✨ NEW - Gherkin scenarios
├── tests/support/steps/
│   └── validation.steps.ts           # ✨ NEW - Step definitions
└── docs/examples/                     # ✨ NEW - Example schemas
    ├── basic-schema.td
    ├── user-profile.td
    └── complex-schema.td
```

**`packages/core/src/validate.ts` - Complete Implementation:**

```typescript
/**
 * End-to-end validation module
 *
 * Provides the public API for validating DSL schema files.
 * Chains scanner → parser → analyzer pipeline and returns
 * either a ValidatedProgram or accumulated errors.
 *
 * @module validate
 */

import { Scanner } from './scanner/scanner';
import { Parser } from './parser/parser';
import { analyze } from './analyzer/analyzer';
import type { Result } from './common/result';
import type { Diagnostic } from './common/diagnostic';
import type { ValidatedProgram } from './analyzer/types';

/**
 * Validates a DSL schema source file.
 *
 * Executes the complete validation pipeline:
 * 1. Scanner: Lexical analysis (source → tokens)
 * 2. Parser: Syntax analysis (tokens → AST)
 * 3. Analyzer: Semantic analysis (AST → ValidatedProgram)
 *
 * Errors from all phases are collected and sorted by location.
 *
 * @param source - The DSL source code to validate
 * @param filename - The filename for error reporting (e.g., "schema.td")
 * @returns Result containing ValidatedProgram on success, or sorted errors on failure
 *
 * @example
 * ```typescript
 * const source = `schema User { id: uuid, name: string }`;
 * const result = validateSchema(source, 'user-schema.td');
 *
 * if (result.ok) {
 *   console.log(`Validated ${result.value.schemas.size} schemas`);
 * } else {
 *   result.errors.forEach(err => console.error(err.message));
 * }
 * ```
 */
export function validateSchema(
  source: string,
  filename: string
): Result<ValidatedProgram> {
  // Phase 1: Lexical Analysis
  const scanner = new Scanner(source, filename);
  const scanResult = scanner.scan();

  if (!scanResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(scanResult.errors)
    };
  }

  // Phase 2: Syntax Analysis
  const parser = new Parser(scanResult.value);
  const parseResult = parser.parse();

  if (!parseResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(parseResult.errors)
    };
  }

  // Phase 3: Semantic Analysis
  const analysisResult = analyze(parseResult.value);

  if (!analysisResult.ok) {
    return {
      ok: false,
      errors: sortDiagnostics(analysisResult.errors)
    };
  }

  // Success: Return validated program
  return {
    ok: true,
    value: analysisResult.value
  };
}

/**
 * Sorts diagnostics by file location (line, then column).
 *
 * Ensures errors are presented in source order for better UX.
 * Diagnostics without location are placed at the end.
 *
 * @param diagnostics - Unsorted diagnostic array
 * @returns New array with diagnostics sorted by location
 */
function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    // Handle missing locations
    if (!a.location) return 1;
    if (!b.location) return -1;

    // Sort by file (for future multi-file support)
    if (a.location.file !== b.location.file) {
      return a.location.file.localeCompare(b.location.file);
    }

    // Sort by line number
    if (a.location.line !== b.location.line) {
      return a.location.line - b.location.line;
    }

    // Sort by column number
    if (a.location.column !== b.location.column) {
      return a.location.column - b.location.column;
    }

    // Stable sort for same location
    return 0;
  });
}
```

**`packages/core/src/index.ts` - Update Public API:**

```typescript
// ============================================
// @testdata-ai/core Public API
// ============================================

// Validation (NEW - Story 2.6)
export { validateSchema } from './validate';

// Common utilities (Story 1.2, 1.3)
export type { Result } from './common/result';
export type {
  Diagnostic,
  DiagnosticSeverity,
  SourceLocation
} from './common/diagnostic';

// Analyzer types (Story 2.5)
export type {
  ValidatedProgram,
  ValidatedSchema,
  ValidatedField
} from './analyzer/types';

// AST types for advanced usage (Story 2.2)
export type {
  Program,
  SchemaNode,
  FieldNode,
  // ... other AST node types
} from './parser/ast';

// Token types for advanced usage (Story 2.1)
export type {
  Token,
  TokenKind
} from './scanner/token';

// Symbol table for advanced usage (Story 2.4)
export type {
  Symbol,
  SymbolKind
} from './analyzer/symbolTable';
```

### Integration Points and Dependencies

**Imports Required:**

```typescript
// From Story 2.1 - Scanner
import { Scanner } from './scanner/scanner';
// Scanner.scan(source: string): Result<Token[]>

// From Story 2.3 - Parser
import { Parser } from './parser/parser';
// new Parser(tokens: Token[])
// Parser.parse(): Result<Program>

// From Story 2.5 - Analyzer
import { analyze } from './analyzer/analyzer';
// analyze(ast: Program): Result<ValidatedProgram>

// From Story 1.2 - Result Type
import type { Result } from './common/result';
// Result<T> = { ok: true, value: T } | { ok: false, errors: Diagnostic[] }

// From Story 1.3 - Diagnostic System
import type { Diagnostic } from './common/diagnostic';
// Diagnostic = { code, message, severity, location, suggestion?, relatedInformation? }

// From Story 2.5 - Validated Program
import type { ValidatedProgram } from './analyzer/types';
// ValidatedProgram = { ast, symbolTable, schemas, metadata }
```

**Verification Checklist:**

Before completing this story, verify:

✅ **Scanner Integration:**
- [ ] Scanner imported correctly from `./scanner/scanner`
- [ ] Scanner.scan() returns Result<Token[]>
- [ ] Scanner accepts filename for error context
- [ ] Lexical errors have correct error codes (`scanner.*`)

✅ **Parser Integration:**
- [ ] Parser imported correctly from `./parser/parser`
- [ ] Parser constructor accepts Token[]
- [ ] Parser.parse() returns Result<Program>
- [ ] Syntax errors have correct error codes (`parser.*`)

✅ **Analyzer Integration:**
- [ ] analyze() imported correctly from `./analyzer/analyzer`
- [ ] analyze() accepts Program AST
- [ ] analyze() returns Result<ValidatedProgram>
- [ ] Semantic errors have correct error codes (`analyzer.*`)
- [ ] ValidatedProgram contains ast, symbolTable, schemas

✅ **Type Compatibility:**
- [ ] All Result types compatible across phases
- [ ] Diagnostic types match across all phases
- [ ] SourceLocation format consistent (1-indexed)

✅ **Error Handling:**
- [ ] Errors sorted by line/column
- [ ] Related information preserved
- [ ] Suggestions included when available
- [ ] Error messages user-friendly

✅ **Performance:**
- [ ] Validation completes in < 1000ms for typical schemas
- [ ] Performance tests pass
- [ ] No obvious performance bottlenecks

✅ **Public API:**
- [ ] validateSchema exported from index.ts
- [ ] ValidatedProgram type exported
- [ ] Result type exported
- [ ] Diagnostic types exported
- [ ] API documented with JSDoc

✅ **Testing:**
- [ ] Unit tests comprehensive (valid + error cases)
- [ ] Gherkin tests cover acceptance criteria
- [ ] Performance tests verify requirements
- [ ] Integration tests verify full pipeline
- [ ] All tests pass with `bun test`

✅ **Documentation:**
- [ ] Example schemas created and validated
- [ ] JSDoc comments complete
- [ ] README updated if needed
- [ ] API documentation clear

### References

**Story Dependencies:**
- [Story 2.1: Scanner](2-1-scanner-token-types-and-lexical-analysis.md) - Lexical analysis phase
- [Story 2.2: AST Node Types](2-2-parser-ast-node-types.md) - AST structure
- [Story 2.3: Parser](2-3-parser-recursive-descent-implementation.md) - Syntax analysis phase
- [Story 2.4: Symbol Table](2-4-semantic-analyzer-symbol-table.md) - Symbol tracking
- [Story 2.5: Semantic Analyzer](2-5-semantic-analyzer-type-checking-and-validation.md) - Semantic analysis phase
- [Story 1.2: Result Type](1-2-common-utilities-result-type-pattern.md) - Error handling pattern
- [Story 1.3: Diagnostic System](1-3-common-utilities-diagnostic-system.md) - Error reporting

**Architecture References:**
- [Core Architectural Decisions](_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#error-handling-architecture) - Result type pattern
- [Implementation Patterns](_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#testing-patterns) - Testing standards
- [Project Structure](_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#public-api-surface) - API design

**Epic Context:**
- [Epic 2: DSL Core](_bmad-output/planning-artifacts/epics/epic-2-dsl-core-parse-and-validate-schemas.md) - Complete epic overview

## Dev Agent Record

### Agent Model Used

*To be filled by dev agent*

### Debug Log References

*To be filled by dev agent*

### Completion Notes List

*To be filled by dev agent*

### File List

*To be filled by dev agent*
