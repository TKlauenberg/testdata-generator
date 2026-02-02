# Story 2.5: Semantic Analyzer - Type Checking and Validation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **semantic analysis that validates types and references**,
So that **users get clear errors before attempting data generation**.

## Acceptance Criteria

**Given** I have a parsed AST from the parser
**When** I implement semantic analysis in `packages/core/src/analyzer/analyzer.ts`
**Then** an `analyze(ast: Program): Result<ValidatedProgram>` function exists
**And** the analyzer builds a symbol table from the AST
**And** the analyzer validates all field type references are supported
**And** the analyzer detects undefined field references in templates (e.g., `{{missingField}}`)
**And** the analyzer detects circular dependencies in schema relationships
**And** the analyzer validates generator names are recognized (e.g., `uuid`, `email`, `randomInt`)
**And** the analyzer collects all semantic errors with detailed messages
**And** error messages include suggestions: "Did you mean 'firstName' instead of 'firstname'?"
**And** the analyzer produces a `ValidatedProgram` type on success
**And** the module exports through `packages/core/src/analyzer/index.ts`
**And** Gherkin feature tests cover type errors, undefined references, and circular dependencies

## Tasks / Subtasks

- [ ] Create semantic analyzer foundation (AC: 1, 2)
  - [ ] Create `packages/core/src/analyzer/analyzer.ts`
  - [ ] Define `ValidatedProgram` type with validated schemas and symbol table
  - [ ] Define `analyze(ast: Program): Result<ValidatedProgram>` main function
  - [ ] Import SymbolTable from story 2.4
  - [ ] Import AST node types from parser (story 2.2)
  - [ ] Import Result and Diagnostic types from common utilities

- [ ] Implement symbol table building phase (AC: 2)
  - [ ] Create `buildSymbolTable(ast: Program): Result<SymbolTable>` function
  - [ ] Traverse Program node and collect all schema definitions
  - [ ] For each schema, call `symbolTable.defineSchema()`
  - [ ] For each field in schema, call `symbolTable.defineField()`
  - [ ] Collect duplicate definition errors from symbol table
  - [ ] Return Result with symbol table or accumulated errors

- [ ] Implement supported type validation (AC: 3)
  - [ ] Define list of supported primitive types: `string`, `number`, `boolean`, `uuid`, `date`, `timestamp`
  - [ ] Create `validateFieldType(field: FieldNode, symbolTable: SymbolTable): Result<void>` function
  - [ ] Check if field.type is in supported types list
  - [ ] If unsupported, create diagnostic error: "Type '{{type}}' is not supported"
  - [ ] Include suggestion with similar type names (fuzzy match)
  - [ ] Accumulate all type errors across all fields

- [ ] Implement generator name validation (AC: 6)
  - [ ] Define list of recognized generator names: `uuid`, `email`, `randomInt`, `randomFloat`, `randomString`, `firstName`, `lastName`, `fullName`, `date`, `timestamp`, `pick`, `weighted`
  - [ ] Create `validateGenerator(field: FieldNode): Result<void>` function
  - [ ] Check if field.generator is in recognized generators list
  - [ ] If unrecognized, create diagnostic error: "Generator '{{name}}' is not recognized"
  - [ ] Include suggestion with similar generator names (Levenshtein distance)
  - [ ] Return accumulated errors

- [ ] Implement template field reference validation (AC: 4)
  - [ ] Create `validateTemplateReferences(field: FieldNode, schema: SchemaNode, symbolTable: SymbolTable): Result<void>` function
  - [ ] Parse field value/constraints for template syntax: `{{fieldName}}`
  - [ ] Extract all field references from templates (regex: `/\{\{(\w+)\}\}/g`)
  - [ ] For each reference, check if field exists in current schema using `symbolTable.lookupField()`
  - [ ] If field not found, create diagnostic error: "Undefined field '{{name}}' in template"
  - [ ] Include suggestion with similar field names from schema
  - [ ] Return accumulated errors

- [ ] Implement circular dependency detection (AC: 5)
  - [ ] Create `detectCircularDependencies(schemas: SchemaNode[], symbolTable: SymbolTable): Result<void>` function
  - [ ] Build dependency graph: Map<schemaName, Set<referencedSchemas>>
  - [ ] For each schema, extract referenced schemas from field types and templates
  - [ ] Use depth-first search to detect cycles in dependency graph
  - [ ] Track visited nodes and current path to identify cycle location
  - [ ] If cycle found, create diagnostic error: "Circular dependency detected: Schema A → Schema B → Schema A"
  - [ ] Include full cycle path in error message
  - [ ] Return accumulated errors

- [ ] Implement suggestion generation (AC: 8)
  - [ ] Create `findSimilar(target: string, candidates: string[]): string[]` utility function
  - [ ] Implement Levenshtein distance algorithm for fuzzy matching
  - [ ] Return top 3 most similar candidates with distance <= 3
  - [ ] Use in all error messages: "Did you mean '{{suggestion}}'?"
  - [ ] Handle both type names, generator names, and field names

- [ ] Implement main analyzer orchestration (AC: 1, 7, 9)
  - [ ] In `analyze()` function, call `buildSymbolTable()` first
  - [ ] If symbol table building fails, return errors immediately
  - [ ] For each schema in AST:
    - [ ] Validate all field types
    - [ ] Validate all generator names
    - [ ] Validate all template references
  - [ ] Call `detectCircularDependencies()` across all schemas
  - [ ] Accumulate ALL errors from all validation phases
  - [ ] If any errors, return `Result` with complete error list
  - [ ] If no errors, return `Result` with `ValidatedProgram` containing AST and symbol table

- [ ] Define ValidatedProgram type (AC: 9)
  - [ ] Create `packages/core/src/analyzer/types.ts`
  - [ ] Define `ValidatedProgram` interface:
    - [ ] `ast: Program` - The validated abstract syntax tree
    - [ ] `symbolTable: SymbolTable` - Complete symbol table with all definitions
    - [ ] `schemas: Map<string, ValidatedSchema>` - Quick lookup for validated schemas
  - [ ] Define `ValidatedSchema` type with validated fields and metadata
  - [ ] Export types through analyzer index

- [ ] Export through public API (AC: 10)
  - [ ] Update `packages/core/src/analyzer/index.ts`
  - [ ] Export `analyze` function
  - [ ] Export `ValidatedProgram` type
  - [ ] Export `ValidatedSchema` type
  - [ ] Do NOT export internal validation functions
  - [ ] Update `packages/core/src/index.ts` to include analyzer exports

- [ ] Write comprehensive unit tests (AC: implicit)
  - [ ] Create `packages/core/src/analyzer/analyzer.test.ts`
  - [ ] Test: Valid AST produces ValidatedProgram
  - [ ] Test: Unsupported field type produces error with suggestion
  - [ ] Test: Unrecognized generator produces error with suggestion
  - [ ] Test: Undefined template field reference produces error with suggestion
  - [ ] Test: Circular dependency between 2 schemas detected
  - [ ] Test: Circular dependency between 3+ schemas detected
  - [ ] Test: Multiple errors accumulated and returned together
  - [ ] Test: Error suggestions use Levenshtein distance
  - [ ] Test: Symbol table is built correctly from AST
  - [ ] Test: ValidatedProgram contains all required fields

- [ ] Write Gherkin feature tests (AC: 11)
  - [ ] Create `packages/core/tests/features/semantic-analysis.feature`
  - [ ] Scenario: Valid schema passes semantic analysis
  - [ ] Scenario: Unsupported field type reported with suggestion
  - [ ] Scenario: Unrecognized generator reported with suggestion
  - [ ] Scenario: Undefined template field reference reported
  - [ ] Scenario: Circular dependency between schemas detected
  - [ ] Scenario: Multiple semantic errors collected together
  - [ ] Scenario: Error messages include helpful suggestions
  - [ ] Create step definitions using Screenplay pattern
  - [ ] Verify error diagnostics include line/column numbers

- [ ] Integration and validation
  - [ ] Verify imports from SymbolTable (story 2.4)
  - [ ] Verify imports from Parser AST types (story 2.2)
  - [ ] Verify imports from Result and Diagnostic (stories 1.2, 1.3)
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Test integration: Scanner → Parser → Analyzer pipeline
  - [ ] Verify error messages are user-friendly and actionable

## Dev Notes

### Previous Story Learnings

From **Story 2.4 (Semantic Analyzer - Symbol Table)**:

✅ **Patterns That Worked:**
- Result type for error accumulation with detailed diagnostics
- Comprehensive error messages with dual location tracking (original + duplicate)
- Clear separation of concerns: symbol table focuses on storage/lookup, analyzer handles validation
- Nested scope support for schema-level and field-level symbols
- Export only public API through index.ts
- Co-located unit tests with comprehensive coverage
- Gherkin tests for integration scenarios

⚠️ **Key Implementation Details:**
- Symbol table tracks all definitions with AST node references
- Duplicate detection uses `relatedInformation` field for showing both locations
- Lookup methods return `undefined` for not found (not errors)
- Symbol table is built first, then used for all subsequent validation
- Error diagnostics should be actionable with suggestions

📋 **Code Patterns Established:**
```typescript
// Result type usage for validation operations
function validateFieldType(field: FieldNode): Result<void> {
  if (!supportedTypes.includes(field.type)) {
    return {
      ok: false,
      errors: [createDiagnostic({
        code: 'analyzer.unsupportedType',
        message: `Type '${field.type}' is not supported`,
        location: field.location,
        suggestion: findSimilar(field.type, supportedTypes)[0]
      })]
    };
  }
  return { ok: true, value: undefined };
}

// Error accumulation pattern
const errors: Diagnostic[] = [];
for (const field of schema.fields) {
  const typeResult = validateFieldType(field);
  if (!typeResult.ok) {
    errors.push(...typeResult.errors);
  }
}
if (errors.length > 0) {
  return { ok: false, errors };
}
```

From **Story 2.3 (Parser - Recursive Descent Implementation)**:
- Error accumulation allows collecting all errors without stopping
- Include context and location in every error message
- Provide helpful suggestions for common mistakes
- Use Result type consistently across all phases

From **Story 2.2 (Parser - AST Node Types)**:
- AST nodes are immutable with readonly properties
- All nodes include SourceLocation for error reporting
- Use discriminated unions for type safety

From **Story 2.1 (Scanner - Token Types and Lexical Analysis)**:
- 1-indexed line and column numbers for user-facing output
- Diagnostic system with severity levels and suggestions

### Architecture Requirements

**Semantic Analysis Purpose:**

The semantic analyzer is the final validation phase before code generation. It ensures:
1. All type references are valid and supported
2. All generator names are recognized
3. All template field references exist in their schemas
4. No circular dependencies exist between schemas
5. Symbol table is complete and accurate
6. Comprehensive error reporting with actionable suggestions

**Analysis Pipeline:**

```
Input: AST (Program node)
  ↓
Step 1: Build Symbol Table
  → Track all schemas, fields, contexts, profiles
  → Detect duplicate definitions
  ↓
Step 2: Validate Field Types
  → Check each field type is supported
  → Provide suggestions for typos
  ↓
Step 3: Validate Generator Names
  → Check each generator is recognized
  → Provide suggestions for typos
  ↓
Step 4: Validate Template References
  → Extract {{fieldName}} from templates
  → Check fields exist in schema
  → Provide suggestions for typos
  ↓
Step 5: Detect Circular Dependencies
  → Build schema dependency graph
  → DFS to find cycles
  → Report full cycle path
  ↓
Output: ValidatedProgram (if no errors)
     OR: Diagnostic[] (if errors found)
```

**Validation Rules:**

1. **Supported Types:**
   - Primitives: `string`, `number`, `boolean`
   - Identity: `uuid`
   - Temporal: `date`, `timestamp`
   - *Note: Generator-specific types handled by generator validation*

2. **Recognized Generators:**
   - Identity: `uuid`, `sequential`
   - Personal: `firstName`, `lastName`, `fullName`, `email`
   - Numeric: `randomInt`, `randomFloat`
   - Text: `randomString`, `word`, `sentence`, `paragraph`
   - Temporal: `date`, `timestamp`, `dateRange`
   - Selection: `pick`, `weightedPick`

3. **Template Syntax:**
   - Format: `{{fieldName}}`
   - Field must exist in current schema
   - Cross-schema references handled in future stories

4. **Circular Dependency Detection:**
   - Schema A references Schema B in field type
   - Schema B references Schema A (direct cycle)
   - Or: Schema A → B → C → A (indirect cycle)
   - Must report full cycle path for debugging

**ValidatedProgram Structure:**

```typescript
interface ValidatedProgram {
  // Original parsed AST
  ast: Program;
  
  // Complete symbol table with all definitions
  symbolTable: SymbolTable;
  
  // Quick lookup map for validated schemas
  schemas: Map<string, ValidatedSchema>;
  
  // Metadata
  metadata: {
    analyzedAt: Date;
    schemaCount: number;
    totalFields: number;
  };
}

interface ValidatedSchema {
  // Reference to original AST node
  node: SchemaNode;
  
  // Validated and enriched fields
  fields: ValidatedField[];
  
  // Dependencies on other schemas
  dependencies: Set<string>;
  
  // Topological sort order (for generation)
  sortOrder: number;
}

interface ValidatedField {
  // Reference to original AST node
  node: FieldNode;
  
  // Resolved type information
  resolvedType: string;
  
  // Resolved generator information
  resolvedGenerator: GeneratorInfo;
  
  // Extracted template references
  templateReferences: string[];
}
```

**Suggestion Algorithm (Levenshtein Distance):**

```typescript
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function findSimilar(target: string, candidates: string[]): string[] {
  return candidates
    .map(candidate => ({
      name: candidate,
      distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase())
    }))
    .filter(item => item.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(item => item.name);
}
```

**Circular Dependency Detection (DFS):**

```typescript
interface DependencyGraph {
  nodes: Set<string>;
  edges: Map<string, Set<string>>;
}

function detectCircularDependencies(graph: DependencyGraph): Result<void> {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const errors: Diagnostic[] = [];
  
  function visit(node: string, path: string[]): void {
    if (visiting.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node];
      errors.push(createDiagnostic({
        code: 'analyzer.circularDependency',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        location: /* location of node definition */,
        suggestion: 'Break the cycle by removing one of the references'
      }));
      return;
    }
    
    if (visited.has(node)) {
      return; // Already processed this branch
    }
    
    visiting.add(node);
    path.push(node);
    
    const neighbors = graph.edges.get(node) || new Set();
    for (const neighbor of neighbors) {
      visit(neighbor, path);
    }
    
    path.pop();
    visiting.delete(node);
    visited.add(node);
  }
  
  // Visit all nodes
  for (const node of graph.nodes) {
    if (!visited.has(node)) {
      visit(node, []);
    }
  }
  
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: undefined };
}
```

### Technical Requirements

**Immutability and Type Safety:**
- ValidatedProgram is immutable once created
- All validation functions are pure (no side effects)
- Use TypeScript strict mode for type checking
- Result type for all fallible operations

**Error Handling:**
- ALL errors must be accumulated, not just first error
- Each error must include:
  - Specific error code (`analyzer.errorType`)
  - Clear message explaining the problem
  - Exact source location (file, line, column)
  - Actionable suggestion when possible
- Use `relatedInformation` for contextual errors (e.g., showing where field is defined)

**Performance Considerations:**
- Symbol table building is O(n) where n = number of symbols
- Type validation is O(m) where m = number of fields
- Template reference extraction uses regex (efficient for small templates)
- Circular dependency detection is O(V + E) where V = schemas, E = dependencies
- Expected total analysis time: < 100ms for typical schemas

**Testing Strategy:**
- Unit tests for each validation function independently
- Test both success and error paths
- Test suggestion algorithm with various typos
- Test circular dependency detection with 2, 3, 4+ node cycles
- Gherkin tests for acceptance criteria scenarios
- Integration tests for full scanner → parser → analyzer pipeline

### File Structure Requirements

**New Files:**
```
packages/core/src/analyzer/
├── analyzer.ts             # Main analyzer implementation
├── types.ts               # ValidatedProgram and related types
├── suggestions.ts         # Levenshtein distance and suggestions
├── circularDeps.ts        # Circular dependency detection
└── analyzer.test.ts       # Unit tests

packages/core/tests/features/
├── semantic-analysis.feature        # Gherkin scenarios
└── support/steps/
    └── semantic-analysis.steps.ts  # Step definitions
```

**Module Exports:** `packages/core/src/analyzer/index.ts`
```typescript
export { SymbolTable } from './symbolTable'; // From story 2.4
export { analyze } from './analyzer';
export type { Symbol, SymbolKind } from './symbolTable';
export type { ValidatedProgram, ValidatedSchema, ValidatedField } from './types';
```

**Core Package Exports:** `packages/core/src/index.ts`
```typescript
// Add to existing exports
export { analyze } from './analyzer';
export type { ValidatedProgram, ValidatedSchema } from './analyzer';
```

### Library & Framework Requirements

**Dependencies (Already Established):**
- TypeScript 5.x with strict mode
- Bun test runner (already configured)
- Gherkin BDD testing infrastructure (Story 1.4)
- Result type from `packages/core/src/common/result.ts` (Story 1.2)
- Diagnostic type from `packages/core/src/common/diagnostic.ts` (Story 1.3)
- SymbolTable from `packages/core/src/analyzer/symbolTable.ts` (Story 2.4)
- AST node types from `packages/core/src/parser/ast.ts` (Story 2.2)
- Program type from parser (Story 2.3)

**No External Dependencies Required:**
This story uses only existing project infrastructure. No new npm packages needed.

**Built-in APIs:**
- `String.prototype.match()` for template regex matching
- `Map` and `Set` for graph data structures
- `Array.prototype.sort()` for suggestion ranking

### Architecture Compliance

**Module Boundaries:**
- Analyzer is part of the `analyzer` module in core package
- Must NOT depend on generator or CLI modules
- Can depend on: common utilities, scanner types, parser AST types, symbol table
- Exports only public API through `packages/core/src/analyzer/index.ts`

**Data Flow:**
```
Scanner → Tokens
  ↓
Parser → AST (Program)
  ↓
Analyzer → ValidatedProgram (if no errors)
        → Diagnostic[] (if errors)
  ↓
Generator (next epic)
```

**Naming Conventions:**
- File: `analyzer.ts` (camelCase)
- Function: `analyze()` (camelCase)
- Types: `ValidatedProgram`, `ValidatedSchema` (PascalCase)
- Error codes: `analyzer.unsupportedType` (dot-separated)
- Internal functions: `_buildDependencyGraph()` (underscore prefix)

### Previous Work Integration

**Files Created in Previous Stories:**

From Story 1.2 (Result Type):
- `packages/core/src/common/result.ts` - Use for all fallible operations

From Story 1.3 (Diagnostic System):
- `packages/core/src/common/diagnostic.ts` - Use for all errors
- Supports `suggestion` field for "Did you mean...?" messages

From Story 2.1 (Scanner):
- `packages/core/src/scanner/types.ts` - Import `SourceLocation` type

From Story 2.2 (AST Nodes):
- `packages/core/src/parser/ast.ts` - Import all AST node types
- SchemaNode, FieldNode, Program types

From Story 2.3 (Parser):
- Parser creates Program AST that analyzer consumes
- Error accumulation pattern established

From Story 2.4 (Symbol Table):
- `packages/core/src/analyzer/symbolTable.ts` - Use for symbol tracking
- `SymbolTable` class with define/lookup methods
- Symbol table already handles duplicate detection

**Code Patterns to Follow:**

```typescript
// Import existing types
import type { Result } from '../common/result';
import type { Diagnostic } from '../common/diagnostic';
import type { Program, SchemaNode, FieldNode } from '../parser/ast';
import { SymbolTable } from './symbolTable';

// Main analyzer function signature
export function analyze(ast: Program): Result<ValidatedProgram> {
  // Implementation
}

// Validation function pattern
function validateFieldTypes(schema: SchemaNode): Result<void> {
  const errors: Diagnostic[] = [];
  
  for (const field of schema.fields) {
    if (!SUPPORTED_TYPES.includes(field.type)) {
      errors.push({
        level: 'error',
        code: 'analyzer.unsupportedType',
        message: `Type '${field.type}' is not supported`,
        location: field.location,
        suggestions: findSimilar(field.type, SUPPORTED_TYPES)
      });
    }
  }
  
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: undefined };
}

// Error accumulation across multiple phases
const allErrors: Diagnostic[] = [];

const symbolResult = buildSymbolTable(ast);
if (!symbolResult.ok) {
  allErrors.push(...symbolResult.errors);
}

const typeResult = validateTypes(ast, symbolResult.value);
if (!typeResult.ok) {
  allErrors.push(...typeResult.errors);
}

if (allErrors.length > 0) {
  return { ok: false, errors: allErrors };
}
```

### Git Intelligence Summary

**Recent Commit Patterns (Stories 2.1-2.4):**

Based on completed work:
- Feature implementation followed by comprehensive tests
- Unit tests co-located with source files (`.test.ts`)
- Gherkin tests in `packages/core/tests/features/`
- Export updates in module index files
- Lint and format before committing
- Integration tests verify end-to-end pipeline

**Expected File Changes for This Story:**
```
New files:
+ packages/core/src/analyzer/analyzer.ts
+ packages/core/src/analyzer/types.ts
+ packages/core/src/analyzer/suggestions.ts
+ packages/core/src/analyzer/circularDeps.ts
+ packages/core/src/analyzer/analyzer.test.ts
+ packages/core/tests/features/semantic-analysis.feature
+ packages/core/tests/support/steps/semantic-analysis.steps.ts

Modified files:
~ packages/core/src/analyzer/index.ts (add new exports)
~ packages/core/src/index.ts (add analyzer exports)
```

**Testing Standards Established:**
- Minimum 90% code coverage for new modules
- Both unit tests AND Gherkin feature tests required
- Test success paths and error paths
- Use descriptive test names with scenarios
- Group related tests with `describe()` blocks
- Integration tests for scanner → parser → analyzer pipeline

### Latest Technical Information

**TypeScript 5.x Features to Use:**
- Discriminated unions for Result type
- `satisfies` operator for type checking
- `readonly` modifiers for immutability
- Strict mode type checking enabled
- Template literal types for error codes

**Bun Test Framework:**
- Use `import { describe, test, expect } from 'bun:test'`
- Supports async tests (though analyzer is sync)
- Fast test execution (< 1 second for this module)
- Built-in matchers: `expect().toBe()`, `expect().toEqual()`

**JavaScript Built-ins:**
- `Map<K, V>` for schema lookups
- `Set<T>` for dependency tracking and visited nodes
- `String.match(/\{\{(\w+)\}\}/g)` for template parsing
- `Array.sort()` for suggestion ranking

**Levenshtein Distance Algorithm:**
- Well-established string similarity metric
- Commonly used for "Did you mean?" suggestions
- Threshold of 3 edits is standard for typo detection
- Efficient O(m*n) implementation with matrix

**DFS for Cycle Detection:**
- Standard graph algorithm for finding cycles
- Tracks "visiting" (current path) vs "visited" (completed)
- When revisiting a node in current path → cycle found
- Time complexity: O(V + E) where V = vertices, E = edges

### Testing Examples

**Unit Test Examples:**

```typescript
import { describe, test, expect } from 'bun:test';
import { analyze } from './analyzer';
import type { Program } from '../parser/ast';

describe('analyze()', () => {
  test('should validate simple schema successfully', () => {
    const ast: Program = {
      kind: 'program',
      declarations: [
        {
          kind: 'schema',
          name: 'User',
          fields: [
            {
              kind: 'field',
              name: 'id',
              type: 'uuid',
              generator: 'uuid',
              location: { file: 'test.td', line: 2, column: 3, length: 10 }
            }
          ],
          location: { file: 'test.td', line: 1, column: 1, length: 50 }
        }
      ],
      location: { file: 'test.td', line: 1, column: 1, length: 100 }
    };
    
    const result = analyze(ast);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemas.size).toBe(1);
      expect(result.value.schemas.has('User')).toBe(true);
    }
  });
  
  test('should detect unsupported type with suggestion', () => {
    const ast: Program = {
      kind: 'program',
      declarations: [
        {
          kind: 'schema',
          name: 'User',
          fields: [
            {
              kind: 'field',
              name: 'id',
              type: 'uuuid', // Typo: should be 'uuid'
              generator: 'uuid',
              location: { file: 'test.td', line: 2, column: 3, length: 10 }
            }
          ],
          location: { file: 'test.td', line: 1, column: 1, length: 50 }
        }
      ],
      location: { file: 'test.td', line: 1, column: 1, length: 100 }
    };
    
    const result = analyze(ast);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe('analyzer.unsupportedType');
      expect(result.errors[0].message).toContain('uuuid');
      expect(result.errors[0].suggestions).toContain('uuid');
    }
  });
  
  test('should detect circular dependency between two schemas', () => {
    const ast: Program = {
      kind: 'program',
      declarations: [
        {
          kind: 'schema',
          name: 'User',
          fields: [
            {
              kind: 'field',
              name: 'profile',
              type: 'Profile', // References Profile
              generator: null,
              location: { file: 'test.td', line: 2, column: 3, length: 10 }
            }
          ],
          location: { file: 'test.td', line: 1, column: 1, length: 50 }
        },
        {
          kind: 'schema',
          name: 'Profile',
          fields: [
            {
              kind: 'field',
              name: 'user',
              type: 'User', // References User (cycle!)
              generator: null,
              location: { file: 'test.td', line: 6, column: 3, length: 10 }
            }
          ],
          location: { file: 'test.td', line: 5, column: 1, length: 50 }
        }
      ],
      location: { file: 'test.td', line: 1, column: 1, length: 100 }
    };
    
    const result = analyze(ast);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe('analyzer.circularDependency');
      expect(result.errors[0].message).toMatch(/User.*Profile.*User/);
    }
  });
});
```

**Gherkin Test Examples:**

```gherkin
Feature: Semantic Analysis
  As a developer
  I want semantic analysis to validate my DSL schemas
  So that I catch errors before attempting data generation

  Background:
    Given the testdata-ai core library is initialized

  @semantic-analysis @happy-path
  Scenario: Valid schema passes semantic analysis
    Given Developer has a valid DSL schema:
      """
      schema User {
        id: uuid;
        name: string;
        email: email;
      }
      """
    When Developer runs semantic analysis
    Then Developer should see analysis succeeded
    And the validated program should contain schema "User"
    And the validated program should have 3 fields

  @semantic-analysis @error-handling
  Scenario: Unsupported type produces error with suggestion
    Given Developer has a DSL schema with unsupported type:
      """
      schema User {
        id: uuuid;
      }
      """
    When Developer runs semantic analysis
    Then Developer should see analysis failed
    And Developer should see error with code "analyzer.unsupportedType"
    And the error message should contain "uuuid"
    And the error suggestion should be "uuid"

  @semantic-analysis @circular-dependencies
  Scenario: Circular dependency between schemas is detected
    Given Developer has DSL schemas with circular dependency:
      """
      schema User {
        profile: Profile;
      }
      schema Profile {
        user: User;
      }
      """
    When Developer runs semantic analysis
    Then Developer should see analysis failed
    And Developer should see error with code "analyzer.circularDependency"
    And the error message should contain "User → Profile → User"
```

### Success Criteria

**This story is complete when:**

1. ✅ `analyze()` function exists and accepts Program AST
2. ✅ Symbol table is built from AST automatically
3. ✅ All field types are validated against supported types list
4. ✅ Template field references are validated ({{fieldName}})
5. ✅ Circular dependencies between schemas are detected
6. ✅ Generator names are validated against recognized list
7. ✅ All errors are accumulated and returned together
8. ✅ Error messages include suggestions using Levenshtein distance
9. ✅ ValidatedProgram type is returned on success
10. ✅ Module exports through analyzer/index.ts
11. ✅ Comprehensive unit tests pass (90%+ coverage)
12. ✅ Gherkin feature tests cover all acceptance criteria
13. ✅ Integration tests verify scanner → parser → analyzer pipeline
14. ✅ `bun test` passes with no errors
15. ✅ `bun run lint` passes with no violations
16. ✅ All code formatted with `bun run format`

---

**🎯 ULTIMATE CONTEXT FOR DEVELOPER:**

This story completes the core validation pipeline for the testdata-ai DSL. After this story:
- Users will get comprehensive error messages BEFORE attempting generation
- The system can detect and prevent common mistakes (typos, circular deps, undefined refs)
- ValidatedProgram provides a clean, verified AST ready for generation
- Foundation is set for Story 2.6 (End-to-End Schema Validation)

**The developer should focus on:**
1. Building symbol table first (leverage Story 2.4 work)
2. Implementing each validation phase independently
3. Accumulating ALL errors, not stopping at first error
4. Providing helpful suggestions using Levenshtein distance
5. Testing both success and error paths thoroughly
6. Writing clear Gherkin scenarios for acceptance criteria

**This is a critical story - take time to get error messages right!**
