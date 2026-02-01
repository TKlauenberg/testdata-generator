# Story 2.4: Semantic Analyzer - Symbol Table

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a symbol table to track schema definitions and references**,
So that **I can validate cross-references and detect duplicate definitions**.

## Acceptance Criteria

**Given** I need to track defined schemas, fields, and contexts
**When** I implement the symbol table in `packages/core/src/analyzer/symbolTable.ts`
**Then** a `SymbolTable` class exists with methods to `define()` and `lookup()` symbols
**And** the symbol table tracks schemas by name with their AST nodes
**And** the symbol table tracks fields within each schema
**And** the symbol table detects duplicate definitions and reports errors with both locations
**And** the symbol table supports nested scopes (global, schema-level, field-level)
**And** lookup methods return `undefined` for missing symbols
**And** the symbol table tracks symbol kinds: `schema`, `field`, `context`, `profile`
**And** the module exports through `packages/core/src/analyzer/index.ts`
**And** unit tests verify define/lookup operations and duplicate detection
**And** Gherkin tests cover symbol resolution scenarios

## Tasks / Subtasks

- [ ] Create Symbol table foundation (AC: 1, 2)
  - [ ] Create `packages/core/src/analyzer/symbolTable.ts`
  - [ ] Define `Symbol` type with properties: name, kind, astNode, location
  - [ ] Define `SymbolKind` union type: `'schema' | 'field' | 'context' | 'profile'`
  - [ ] Define `SymbolTable` class with constructor
  - [ ] Implement internal scope storage structure (Map<string, Symbol>)
  - [ ] Setup scope hierarchy tracking (global → schema → field)

- [ ] Implement global scope operations (AC: 1, 2, 3)
  - [ ] Implement `defineSchema(name: string, node: SchemaNode): Result<void>`
  - [ ] Store schema symbol in global scope map
  - [ ] Track AST node reference with symbol
  - [ ] Return success or error diagnostic
  - [ ] Implement `lookupSchema(name: string): Symbol | undefined`
  - [ ] Search global scope for schema symbol
  - [ ] Return symbol or undefined if not found

- [ ] Implement nested scope support (AC: 5, 3)
  - [ ] Implement scope stack data structure
  - [ ] Add `enterScope(scopeName: string, kind: SymbolKind)` method
  - [ ] Push new scope onto stack
  - [ ] Track parent scope reference
  - [ ] Add `exitScope()` method
  - [ ] Pop current scope from stack
  - [ ] Implement `defineInCurrentScope(name: string, kind: SymbolKind, node: ASTNode): Result<void>`
  - [ ] Add symbol to current scope's map
  - [ ] Implement `lookupInScopes(name: string): Symbol | undefined`
  - [ ] Search current scope first, then parent scopes recursively

- [ ] Implement field tracking within schemas (AC: 3)
  - [ ] Implement `defineField(schemaName: string, fieldName: string, node: FieldNode): Result<void>`
  - [ ] Enter schema scope
  - [ ] Define field symbol in schema scope
  - [ ] Exit schema scope
  - [ ] Implement `lookupField(schemaName: string, fieldName: string): Symbol | undefined`
  - [ ] Enter schema scope
  - [ ] Lookup field symbol in that scope
  - [ ] Return symbol or undefined

- [ ] Implement duplicate detection (AC: 4)
  - [ ] In `define()` methods, check if symbol already exists before adding
  - [ ] If duplicate found, create diagnostic error
  - [ ] Include both locations in error: original definition + duplicate attempt
  - [ ] Error message format: "Symbol '{{name}}' already defined at {{original_location}}"
  - [ ] Return `Result<void>` with error diagnostic
  - [ ] Accumulate all duplicate errors without stopping

- [ ] Implement context and profile tracking (AC: 7)
  - [ ] Implement `defineContext(name: string, node: ContextNode): Result<void>`
  - [ ] Store context symbol in global scope
  - [ ] Implement `lookupContext(name: string): Symbol | undefined`
  - [ ] Implement `defineProfile(name: string, node: ProfileNode): Result<void>`
  - [ ] Store profile symbol in global scope
  - [ ] Implement `lookupProfile(name: string): Symbol | undefined`

- [ ] Implement helper methods for error reporting (AC: 6)
  - [ ] Implement `getAllSymbols(): Symbol[]` - returns all defined symbols
  - [ ] Implement `getSymbolsInScope(scopeName: string): Symbol[]`
  - [ ] Implement `hasSymbol(name: string): boolean` - check existence without lookup
  - [ ] Implement helper to get symbol location for error messages

- [ ] Export through public API (AC: 8)
  - [ ] Update `packages/core/src/analyzer/index.ts`
  - [ ] Export `SymbolTable` class
  - [ ] Export `Symbol` type
  - [ ] Export `SymbolKind` type
  - [ ] Do NOT export internal scope management methods

- [ ] Write comprehensive unit tests (AC: 9)
  - [ ] Create `packages/core/src/analyzer/symbolTable.test.ts`
  - [ ] Test: Define schema and lookup successfully
  - [ ] Test: Define field in schema and lookup successfully
  - [ ] Test: Lookup undefined symbol returns undefined
  - [ ] Test: Detect duplicate schema definition
  - [ ] Test: Detect duplicate field definition within schema
  - [ ] Test: Nested scopes - field in schema A doesn't conflict with field in schema B
  - [ ] Test: Define and lookup context
  - [ ] Test: Define and lookup profile
  - [ ] Test: Scope hierarchy - lookup in parent scope works
  - [ ] Test: Scope isolation - symbols in child scope don't leak to parent
  - [ ] Test: Multiple duplicate errors are accumulated
  - [ ] Test: Error diagnostics include both original and duplicate locations

- [ ] Write Gherkin feature tests (AC: 10)
  - [ ] Create `packages/core/tests/features/symbol-table.feature`
  - [ ] Scenario: Define and lookup schema symbol
  - [ ] Scenario: Define and lookup field symbol within schema
  - [ ] Scenario: Detect duplicate schema definition
  - [ ] Scenario: Detect duplicate field within same schema
  - [ ] Scenario: Fields with same name in different schemas are allowed
  - [ ] Scenario: Lookup undefined symbol returns undefined
  - [ ] Scenario: Context and profile symbols are tracked separately
  - [ ] Scenario: Nested scope lookup resolves to parent scope
  - [ ] Verify error messages include line/column numbers from both locations

- [ ] Integration and validation
  - [ ] Verify AST node types imported from `packages/core/src/parser/ast.ts`
  - [ ] Verify Result type imported from `packages/core/src/common/result.ts`
  - [ ] Verify Diagnostic imported from `packages/core/src/common/diagnostic.ts`
  - [ ] Verify SourceLocation imported from scanner
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Update exports in `packages/core/src/index.ts` if needed

## Dev Notes

### Previous Story Learnings

From **Story 2.3 (Parser - Recursive Descent Implementation)**:

✅ **Patterns That Worked:**
- Result type for error accumulation - collect all errors, don't stop at first one
- Comprehensive error messages with location context
- Token navigation helper methods (`current()`, `peek()`, `advance()`)
- Clear separation of concerns (each grammar rule = one method)
- Synchronization points for error recovery
- Helpful error suggestions for common mistakes
- Co-located unit tests with comprehensive coverage

⚠️ **Key Implementation Details:**
- Source locations must be preserved through all transformations
- Error diagnostics should be actionable and contextual
- Use immutable data structures throughout
- Export only public API through index.ts
- Internal helper methods remain private
- Test both success and error paths thoroughly

📋 **Code Patterns Established:**
```typescript
// Result type usage for operations that can fail
function define(name: string, node: ASTNode): Result<void> {
  if (alreadyDefined) {
    return {
      ok: false,
      errors: [createDiagnostic(...)]
    };
  }
  // perform operation
  return { ok: true, value: undefined };
}

// Lookup returns undefined for not found
function lookup(name: string): Symbol | undefined {
  return this.symbols.get(name);
}
```

From **Story 2.2 (Parser - AST Node Types)**:
- Use discriminated unions with `kind` property for type safety
- ALL node types must include `SourceLocation` for error reporting
- Use `readonly` modifiers on all properties
- Interfaces preferred over classes for pure data structures
- Comprehensive JSDoc documentation with examples

From **Story 2.1 (Scanner - Token Types and Lexical Analysis)**:
- Error accumulation pattern works well for multiple errors
- 1-indexed line and column numbers for user-facing output
- Diagnostic system with severity levels
- Include suggestions in error messages when possible

### Architecture Requirements

**Symbol Table Purpose:**

The symbol table is a critical data structure in semantic analysis that:
1. Tracks all symbols (schemas, fields, contexts, profiles) defined in the program
2. Enables validation of references (checking if a referenced symbol exists)
3. Detects duplicate definitions and reports errors with both locations
4. Supports nested scopes (global level, schema level, field level)
5. Provides the foundation for type checking and semantic validation

**Scope Hierarchy:**

```
Global Scope (schemas, contexts, profiles)
├── Schema "User" Scope
│   ├── Field "id"
│   ├── Field "name"
│   └── Field "email"
└── Schema "Product" Scope
    ├── Field "id"
    ├── Field "name"
    └── Field "price"
```

**Symbol Table Structure:**

```typescript
interface Symbol {
  name: string;
  kind: SymbolKind;
  astNode: ASTNode; // Reference to original AST node
  location: SourceLocation; // For error reporting
  scope?: string; // Optional scope identifier
}

type SymbolKind = 'schema' | 'field' | 'context' | 'profile';

class SymbolTable {
  private globalSymbols: Map<string, Symbol> = new Map();
  private scopeStack: Scope[] = [];
  private currentScope: Scope | null = null;

  // Public API
  defineSchema(name: string, node: SchemaNode): Result<void>;
  lookupSchema(name: string): Symbol | undefined;
  defineField(schemaName: string, fieldName: string, node: FieldNode): Result<void>;
  lookupField(schemaName: string, fieldName: string): Symbol | undefined;
  defineContext(name: string, node: ContextNode): Result<void>;
  lookupContext(name: string): Symbol | undefined;
  defineProfile(name: string, node: ProfileNode): Result<void>;
  lookupProfile(name: string): Symbol | undefined;

  // Scope management
  enterScope(name: string, kind: SymbolKind): void;
  exitScope(): void;

  // Helpers
  getAllSymbols(): Symbol[];
  hasSymbol(name: string): boolean;
}

interface Scope {
  name: string;
  kind: SymbolKind;
  symbols: Map<string, Symbol>;
  parent: Scope | null;
}
```

**Duplicate Detection Algorithm:**

```typescript
function defineSchema(name: string, node: SchemaNode): Result<void> {
  // Check if schema already defined
  const existing = this.globalSymbols.get(name);

  if (existing) {
    // Create diagnostic with both locations
    const diagnostic: Diagnostic = {
      level: 'error',
      code: 'DUPLICATE_SCHEMA',
      message: `Schema '${name}' is already defined`,
      location: node.location, // Current (duplicate) location
      relatedInformation: [{
        location: existing.location, // Original definition location
        message: `First defined here`
      }],
      suggestions: [`Rename this schema to avoid conflict`, `Remove duplicate definition`]
    };

    return { ok: false, errors: [diagnostic] };
  }

  // Define new symbol
  this.globalSymbols.set(name, {
    name,
    kind: 'schema',
    astNode: node,
    location: node.location
  });

  return { ok: true, value: undefined };
}
```

**Nested Scope Lookup Algorithm:**

```typescript
function lookupInScopes(name: string): Symbol | undefined {
  // Start with current scope
  let scope = this.currentScope;

  // Search up the scope chain
  while (scope !== null) {
    const symbol = scope.symbols.get(name);
    if (symbol) {
      return symbol;
    }
    scope = scope.parent;
  }

  // Not found in any scope
  return undefined;
}
```

### Technical Requirements

**Immutability and Type Safety:**
- Symbol table uses `Map<string, Symbol>` for O(1) lookup performance
- Symbol objects are immutable once created
- All public methods use Result type for error handling
- TypeScript strict mode enforced

**Error Handling:**
- Duplicate definition errors MUST include both locations (original + duplicate)
- Use Diagnostic type with `relatedInformation` field for dual locations
- Error code format: `DUPLICATE_SCHEMA`, `DUPLICATE_FIELD`, `DUPLICATE_CONTEXT`
- All errors accumulated and returned together

**Performance Considerations:**
- Symbol lookup must be O(1) average case using Map
- Scope traversal is O(n) where n = scope depth (typically 1-3)
- Symbol table building is O(m) where m = number of symbols defined

**Testing Strategy:**
- Unit tests for each public method
- Test both success and error paths
- Test scope isolation and hierarchy
- Test duplicate detection with multiple duplicates
- Gherkin tests for integration scenarios
- Use snapshot testing for complex symbol table state

### File Structure Requirements

**Location:** `packages/core/src/analyzer/symbolTable.ts`

**Module Exports:** `packages/core/src/analyzer/index.ts`
```typescript
export { SymbolTable } from './symbolTable';
export type { Symbol, SymbolKind } from './symbolTable';
```

**Test Files:**
- `packages/core/src/analyzer/symbolTable.test.ts` - Unit tests
- `packages/core/tests/features/symbol-table.feature` - Gherkin tests
- `packages/core/tests/support/steps/symbol-table.steps.ts` - Step definitions

### Library & Framework Requirements

**Dependencies (Already Established):**
- TypeScript 5.x with strict mode
- Bun test runner (already configured)
- Gherkin BDD testing infrastructure (Story 1.4)
- Result type from `packages/core/src/common/result.ts` (Story 1.2)
- Diagnostic type from `packages/core/src/common/diagnostic.ts` (Story 1.3)
- AST node types from `packages/core/src/parser/ast.ts` (Story 2.2)
- SourceLocation from scanner (Story 2.1)

**No External Dependencies Required:**
This story uses only existing project infrastructure. No new npm packages needed.

### Architecture Compliance

**Module Boundaries:**
- Symbol table is part of the `analyzer` module in core package
- Must NOT depend on generator or CLI modules
- Can depend on: common utilities, scanner types, parser AST types
- Exports only public API through `packages/core/src/analyzer/index.ts`

**Data Flow:**
```
Parser AST → Symbol Table (define symbols)
            ↓
Symbol Table → Semantic Analyzer (lookup symbols for validation)
```

**Naming Conventions:**
- Class: `SymbolTable` (PascalCase)
- File: `symbolTable.ts` (camelCase)
- Types: `Symbol`, `SymbolKind` (PascalCase)
- Methods: `defineSchema()`, `lookupSchema()` (camelCase)
- Error codes: `DUPLICATE_SCHEMA` (SCREAMING_SNAKE_CASE)

### Previous Work Integration

**Files Created in Previous Stories:**

From Story 1.2 (Result Type):
- `packages/core/src/common/result.ts` - Use for all fallible operations

From Story 1.3 (Diagnostic System):
- `packages/core/src/common/diagnostic.ts` - Use for all errors
- Supports `relatedInformation` field for dual locations

From Story 2.1 (Scanner):
- `packages/core/src/scanner/types.ts` - Import `SourceLocation` type

From Story 2.2 (AST Nodes):
- `packages/core/src/parser/ast.ts` - Import all AST node types
- SchemaNode, FieldNode, ContextNode, ProfileNode

From Story 2.3 (Parser):
- Parser creates AST that symbol table will process
- Error accumulation pattern established

**Code Patterns to Follow:**

```typescript
// Import existing types
import type { Result } from '../common/result';
import type { Diagnostic } from '../common/diagnostic';
import type { SourceLocation } from '../scanner/types';
import type { SchemaNode, FieldNode, ASTNode } from '../parser/ast';

// Follow existing Result type usage
function defineSchema(name: string, node: SchemaNode): Result<void> {
  // ... implementation
  if (error) {
    return { ok: false, errors: [diagnostic] };
  }
  return { ok: true, value: undefined };
}

// Follow existing Diagnostic format
const diagnostic: Diagnostic = {
  level: 'error',
  code: 'DUPLICATE_SCHEMA',
  message: `Schema '${name}' is already defined`,
  location: node.location,
  relatedInformation: [{
    location: existing.location,
    message: 'First defined here'
  }],
  suggestions: ['Rename this schema', 'Remove duplicate']
};
```

### Git Intelligence Summary

**Recent Commit Patterns (Stories 2.1-2.3):**

Based on completed work:
- Feature implementation followed by comprehensive tests
- Unit tests co-located with source files (`.test.ts`)
- Gherkin tests in `packages/core/tests/features/`
- Export updates in module index files
- Lint and format before committing

**Expected File Changes for This Story:**
```
New files:
+ packages/core/src/analyzer/symbolTable.ts
+ packages/core/src/analyzer/symbolTable.test.ts
+ packages/core/src/analyzer/index.ts
+ packages/core/tests/features/symbol-table.feature
+ packages/core/tests/support/steps/symbol-table.steps.ts

Modified files:
~ packages/core/src/index.ts (add analyzer exports)
~ packages/core/src/analyzer/index.ts (create/update with exports)
```

**Testing Standards Established:**
- Minimum 90% code coverage for new modules
- Both unit tests AND Gherkin feature tests required
- Test success paths and error paths
- Use descriptive test names: `test('should detect duplicate schema definition')`
- Group related tests with `describe()` blocks
- Use snapshot testing for complex data structures when appropriate

### Latest Technical Information

**TypeScript 5.x Features to Use:**
- Discriminated unions for `SymbolKind` type
- `satisfies` operator for type checking without widening
- `readonly` modifiers for immutability
- Strict mode type checking enabled in tsconfig.json

**Bun Test Framework:**
- Use `import { describe, test, expect } from 'bun:test'`
- Supports async tests with `await`
- Fast test execution (sub-second for this module)
- No setup needed, tests run directly with Bun

**Map API (Built-in JavaScript):**
- Use `Map<string, Symbol>` for O(1) lookup
- Methods: `set()`, `get()`, `has()`, `delete()`, `clear()`
- Iteration: `map.values()`, `map.keys()`, `map.entries()`
- Size property: `map.size`

**Best Practices for Symbol Tables:**
1. **Separate scope management from symbol storage** - Clear scope stack vs symbol maps
2. **Preserve all location information** - Essential for multi-location error reporting
3. **Use descriptive error messages** - "Symbol 'X' already defined" is better than "Duplicate symbol"
4. **Support iterating all symbols** - Useful for debugging and later analysis phases
5. **Keep symbol table immutable after construction** - No mutation of defined symbols
6. **Fast lookup over memory efficiency** - Use Map not array search

### Project Context Reference

**Full Project Context:** See `_bmad-output/planning-artifacts/product-brief-testdata-ai-2025-12-11.md` and `_bmad-output/planning-artifacts/prd.md`

**Epic Context:** This story is part of Epic 2 (DSL Core - Parse and Validate Schemas), which establishes the foundation for the custom DSL that will be used throughout the project.

**Story Position:** This is story 4 of 6 in Epic 2:
- 2.1: Scanner ✅ Done
- 2.2: AST Node Types ✅ Done
- 2.3: Parser ✅ Done
- **2.4: Symbol Table ← YOU ARE HERE**
- 2.5: Semantic Analysis (depends on 2.4)
- 2.6: End-to-End Validation (depends on 2.5)

**Why This Story Matters:**

The symbol table is the foundation for semantic analysis. Without it:
- Cannot detect duplicate definitions
- Cannot validate that referenced schemas/fields exist
- Cannot perform type checking
- Cannot detect circular dependencies
- Cannot provide helpful "Did you mean?" suggestions

This story enables Story 2.5 (Semantic Analysis) which will use the symbol table to validate all references and relationships in the DSL.

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
