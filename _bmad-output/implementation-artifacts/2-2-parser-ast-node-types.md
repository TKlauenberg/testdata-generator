# Story 2.2: Parser - AST Node Types

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **immutable AST node type definitions for all DSL constructs**,
So that **the parser can build a type-safe abstract syntax tree**.

## Acceptance Criteria

**Given** I need to represent parsed DSL structures
**When** I define AST node types in `packages/core/src/parser/ast.ts`
**Then** a discriminated union type exists for all AST node kinds
**And** a `Program` node type exists as the root containing multiple declarations
**And** a `SchemaNode` type exists with `readonly` fields: `kind`, `name`, `fields`, `location`
**And** a `FieldNode` type exists with `readonly` fields: `kind`, `name`, `type`, `generator`, `constraints`, `location`
**And** a `ProfileNode` type exists for generation profiles (future use)
**And** all node types use `readonly` arrays and properties for immutability
**And** all node types include `SourceLocation` for error reporting
**And** node types use PascalCase with "Node" suffix (e.g., `SchemaNode`, `FieldNode`)
**And** the module exports through `packages/core/src/parser/index.ts`
**And** TypeScript strict mode enforces immutability
**And** comprehensive type documentation explains each node's purpose

## Tasks / Subtasks

- [x] Define base AST node structures (AC: 1, 7, 8, 11)
  - [x] Create `packages/core/src/parser/ast.ts`
  - [x] Define base `ASTNode` interface with common properties
  - [x] Define `NodeKind` enum or type union for all node types
  - [x] Ensure all nodes include `kind` discriminator and `location: SourceLocation`
  - [x] Use `readonly` modifier for all properties
  - [x] Add JSDoc documentation for each node type

- [x] Define Program node (AC: 2)
  - [x] Create `Program` interface as root AST node
  - [x] Include `readonly kind: 'program'` discriminator
  - [x] Include `readonly declarations: readonly Declaration[]` array
  - [x] Include `readonly location: SourceLocation`
  - [x] Document: "Root node containing all top-level declarations in DSL file"

- [x] Define SchemaNode type (AC: 3)
  - [x] Create `SchemaNode` interface for schema declarations
  - [x] Include `readonly kind: 'schema'` discriminator
  - [x] Include `readonly name: string` for schema identifier
  - [x] Include `readonly fields: readonly FieldNode[]` for field definitions
  - [x] Include `readonly location: SourceLocation`
  - [x] Document: "Schema declaration defining a data structure with named fields"

- [x] Define FieldNode type (AC: 4)
  - [x] Create `FieldNode` interface for field definitions within schemas
  - [x] Include `readonly kind: 'field'` discriminator
  - [x] Include `readonly name: string` for field name
  - [x] Include `readonly type: string` for field type
  - [x] Include `readonly generator?: GeneratorSpec` for optional generator configuration
  - [x] Include `readonly constraints?: FieldConstraints` for uniqueness/validation rules
  - [x] Include `readonly location: SourceLocation`
  - [x] Document: "Field definition within a schema"

- [x] Define GeneratorSpec type (AC: 4)
  - [x] Create `GeneratorSpec` interface for generator configurations
  - [x] Include `readonly name: string` for generator name (e.g., 'uuid', 'randomInt')
  - [x] Include `readonly parameters?: readonly GeneratorParameter[]` for generator args
  - [x] Document: "Specification of generator function and its parameters"

- [x] Define GeneratorParameter type (AC: 4)
  - [x] Create `GeneratorParameter` interface for generator arguments
  - [x] Include `readonly name: string` for parameter name
  - [x] Include `readonly value: LiteralValue` for parameter value
  - [x] Document: "Named parameter passed to a generator function"

- [x] Define LiteralValue type (AC: 4)
  - [x] Create `LiteralValue` type union for primitive values
  - [x] Support: string, number, boolean
  - [x] Document: "Literal value types that can appear in DSL"

- [x] Define FieldConstraints type (AC: 4)
  - [x] Create `FieldConstraints` interface for field validation rules
  - [x] Include `readonly unique?: boolean` for single-field uniqueness
  - [x] Include optional future constraints (min, max, pattern, etc.)
  - [x] Document: "Constraints and validation rules for a field"

- [x] Define ProfileNode type (AC: 5)
  - [x] Create `ProfileNode` interface for generation profiles
  - [x] Include `readonly kind: 'profile'` discriminator
  - [x] Include `readonly name: string` for profile identifier
  - [x] Include `readonly defaults: readonly DefaultSpec[]` for default settings
  - [x] Include `readonly location: SourceLocation`
  - [x] Document: "Generation profile defining default settings (future use)"

- [x] Define DefaultSpec type (AC: 5)
  - [x] Create `DefaultSpec` interface for profile defaults
  - [x] Include `readonly fieldType: string` for type pattern
  - [x] Include `readonly generator: GeneratorSpec` for default generator
  - [x] Document: "Default generator specification for a field type pattern"

- [x] Define Declaration discriminated union (AC: 1)
  - [x] Create `Declaration` type as union of all top-level declaration types
  - [x] Include: `SchemaNode | ProfileNode | ContextNode` (ContextNode reserved for future)
  - [x] Ensure discriminated by `kind` property for type-safe handling
  - [x] Document: "Top-level declarations that can appear in a DSL file"

- [x] Define helper types and utilities
  - [x] Create `NodeVisitor` interface for traversing AST (future use)
  - [x] Create type guards: `isSchemaNode()`, `isFieldNode()`, `isProfileNode()`
  - [x] Document all type guards with examples

- [x] Create comprehensive type exports (AC: 9)
  - [x] Create `packages/core/src/parser/index.ts`
  - [x] Export all node types: `Program`, `SchemaNode`, `FieldNode`, etc.
  - [x] Export all supporting types: `GeneratorSpec`, `FieldConstraints`, etc.
  - [x] Export type guards and utilities
  - [x] Do NOT export internal implementation details

- [x] Write unit tests (AC: 11)
  - [x] Create `packages/core/src/parser/ast.test.ts`
  - [x] Test: type guards correctly identify node types
  - [x] Test: TypeScript enforces immutability (attempt to modify should fail to compile)
  - [x] Test: discriminated unions work correctly (exhaustive switch checks)
  - [x] Test: all required properties are present in node definitions
  - [x] Test: readonly arrays prevent mutation
  - [x] Test: example AST construction validates structure

- [x] Write documentation and examples (AC: 11)
  - [x] Add comprehensive JSDoc to all types
  - [x] Create example AST structures in comments
  - [x] Document the AST design philosophy (immutable data + pure functions)
  - [x] Document relationship to architecture patterns
  - [x] Include example of constructing a simple AST manually

- [x] Integration and validation
  - [x] Verify SourceLocation import from `packages/core/src/common/diagnostic.ts`
  - [x] Ensure all types use `readonly` consistently
  - [x] Run `bun test` and verify all tests pass
  - [x] Run `bun run lint` and fix any violations
  - [x] Run `bun run format` to format code
  - [x] Update exports in `packages/core/src/index.ts` if needed
  - [x] Verify TypeScript strict mode catches mutation attempts

## Dev Notes

### Architecture Requirements

**Immutable AST Design Pattern:**

- AST nodes are **pure data structures** (no methods, no behavior)
- All transformations are **pure functions** operating on AST
- Philosophy: "Data and behavior are separate"
- Multi-pass architecture: Scanner → Parser → Analyzer → Generator
- Each phase takes immutable AST input and produces new immutable output

**Discriminated Union Pattern:**

```typescript
type Declaration = SchemaNode | ProfileNode | ContextNode;

type SchemaNode = {
  readonly kind: 'schema'; // Discriminator property
  readonly name: string;
  readonly fields: readonly FieldNode[];
  readonly location: SourceLocation;
};

// TypeScript ensures exhaustive checking
function analyzeDeclaration(decl: Declaration) {
  switch (decl.kind) {
    case 'schema':
      return analyzeSchema(decl);
    case 'profile':
      return analyzeProfile(decl);
    case 'context':
      return analyzeContext(decl);
    // TypeScript error if case missing!
  }
}
```

**Immutability Enforcement:**

- Use `readonly` on ALL properties
- Use `readonly` on ALL array types: `readonly FieldNode[]`
- Use `ReadonlyArray<T>` if preferred
- TypeScript strict mode prevents accidental mutations
- No `const` needed for types (types are always immutable at runtime)

**Source Location Tracking:**

- EVERY node must include `location: SourceLocation`
- Used for error reporting in semantic analysis phase
- Format: `{ file: string, line: number, column: number, length: number }`
- Enables "point to exact problem" error messages for QA testers

### Project Structure Alignment

**File Organization:**

```
packages/core/src/parser/
├── index.ts           # Public exports only
├── ast.ts             # AST node type definitions (THIS STORY)
├── parser.ts          # Parser implementation (Story 2.3)
└── ast.test.ts        # Co-located unit tests
```

**Naming Conventions:**

- Node types: `PascalCase` with `Node` suffix (`SchemaNode`, `FieldNode`)
- Type unions: `PascalCase` (`Declaration`, `LiteralValue`)
- Type guards: `camelCase` with `is` prefix (`isSchemaNode()`, `isFieldNode()`)
- Properties: `camelCase` (`name`, `fields`, `generator`)
- Constants: `UPPER_SNAKE_CASE` if needed

**Module Exports:**

- Export ALL node types through `index.ts`
- Export type guards for convenience
- Do NOT export internal helpers or test utilities
- Public API: Types are the primary export (no classes)

### AST Node Design

**Program Node (Root):**

```typescript
interface Program {
  readonly kind: 'program';
  readonly declarations: readonly Declaration[];
  readonly location: SourceLocation;
}
```

- Root of entire AST
- Contains top-level declarations (schemas, profiles, contexts)
- Parser produces this as final output

**SchemaNode (Data Structure Definition):**

```typescript
interface SchemaNode {
  readonly kind: 'schema';
  readonly name: string;
  readonly fields: readonly FieldNode[];
  readonly location: SourceLocation;
}
```

- Defines a record structure with named fields
- Example DSL: `schema User { ... }`
- Will be referenced by generator in generation phase

**FieldNode (Field Definition):**

```typescript
interface FieldNode {
  readonly kind: 'field';
  readonly name: string;
  readonly type: string; // "string", "number", "boolean", "email", etc.
  readonly generator?: GeneratorSpec;
  readonly constraints?: FieldConstraints;
  readonly location: SourceLocation;
}
```

- Defines a single field within a schema
- Example DSL: `email: string generator=email unique`
- Type and generator are separate (type describes, generator creates)

**GeneratorSpec (Generator Configuration):**

```typescript
interface GeneratorSpec {
  readonly name: string; // "randomInt", "email", "uuid"
  readonly parameters?: readonly GeneratorParameter[];
}

interface GeneratorParameter {
  readonly name: string;
  readonly value: LiteralValue;
}

type LiteralValue = string | number | boolean;
```

- Specifies which generator to use and its parameters
- Example DSL: `generator=randomInt(min=1, max=100)`
- Parameters parsed into structured format

**FieldConstraints (Validation Rules):**

```typescript
interface FieldConstraints {
  readonly unique?: boolean;
  // Future: min?, max?, pattern?, etc.
}
```

- Validation and constraint rules for a field
- Example DSL: `email: string unique`
- Enforced during generation phase

**ProfileNode (Generation Defaults - Future):**

```typescript
interface ProfileNode {
  readonly kind: 'profile';
  readonly name: string;
  readonly defaults: readonly DefaultSpec[];
  readonly location: SourceLocation;
}

interface DefaultSpec {
  readonly fieldType: string;
  readonly generator: GeneratorSpec;
}
```

- Defines default generator mappings for types
- Example DSL: `profile Standard { string -> randomString(length=20) }`
- Story 2.2 defines structure, implementation deferred to later epic

### Technical Implementation Guidance

**Type Guard Pattern:**

```typescript
export function isSchemaNode(node: Declaration): node is SchemaNode {
  return node.kind === 'schema';
}

export function isFieldNode(node: ASTNode): node is FieldNode {
  return node.kind === 'field';
}
```

- Use TypeScript's `is` type predicate
- Enables type narrowing in conditional blocks
- Provides safe casting without `as` assertions

**Readonly Array Syntax:**

```typescript
// Option 1: readonly modifier
readonly fields: readonly FieldNode[];

// Option 2: ReadonlyArray utility type
readonly fields: ReadonlyArray<FieldNode>;
```

- Both are equivalent, choose consistent style
- Prevents `.push()`, `.pop()`, mutation methods
- Still allows immutable operations: `.map()`, `.filter()`, `.slice()`

**JSDoc Documentation Pattern:**

```typescript
/**
 * Represents a schema declaration in the DSL.
 *
 * A schema defines a data structure with named fields, each having
 * a type and optional generator specification.
 *
 * @example
 * ```typescript
 * const userSchema: SchemaNode = {
 *   kind: 'schema',
 *   name: 'User',
 *   fields: [
 *     { kind: 'field', name: 'id', type: 'string', generator: { name: 'uuid' }, ... },
 *     { kind: 'field', name: 'email', type: 'string', generator: { name: 'email' }, ... }
 *   ],
 *   location: { file: 'users.td', line: 1, column: 1, length: 50 }
 * };
 * ```
 */
interface SchemaNode {
  readonly kind: 'schema';
  readonly name: string;
  readonly fields: readonly FieldNode[];
  readonly location: SourceLocation;
}
```

### Testing Strategy

**Unit Tests (Bun Test Runner):**

- Test type guards work correctly
- Test example AST construction (no runtime errors)
- Test TypeScript compilation enforces immutability (compile-time test)
- Test discriminated union exhaustiveness (switch without default compiles)

**Compile-Time Tests:**

```typescript
// This test should FAIL to compile (good!)
test('immutability enforced', () => {
  const schema: SchemaNode = createTestSchema();
  // @ts-expect-error - should not allow mutation
  schema.name = 'Modified'; // TypeScript error expected
});
```

**Example AST Tests:**

```typescript
test('construct valid Program AST', () => {
  const program: Program = {
    kind: 'program',
    declarations: [
      {
        kind: 'schema',
        name: 'User',
        fields: [
          {
            kind: 'field',
            name: 'id',
            type: 'string',
            generator: { name: 'uuid', parameters: [] },
            constraints: undefined,
            location: { file: 'test.td', line: 2, column: 3, length: 10 },
          },
        ],
        location: { file: 'test.td', line: 1, column: 1, length: 50 },
      },
    ],
    location: { file: 'test.td', line: 1, column: 1, length: 100 },
  };

  expect(program.kind).toBe('program');
  expect(program.declarations.length).toBe(1);
  expect(isSchemaNode(program.declarations[0])).toBe(true);
});
```

### Common Pitfalls to Avoid

❌ **DON'T:**

- Add methods to node types (nodes are data, not classes)
- Forget `readonly` on properties
- Forget `readonly` on array types
- Use mutable arrays (`FieldNode[]` without `readonly`)
- Export test utilities through `index.ts`
- Use `any` or `unknown` for node properties
- Skip JSDoc documentation
- Forget `location` property on any node
- Use classes instead of interfaces (prefer interfaces)
- Add behavior/logic to AST (transformations are separate functions)

✅ **DO:**

- Use interfaces for all node types
- Include `readonly` on EVERY property
- Use discriminated unions with `kind` property
- Include `SourceLocation` on ALL nodes
- Add comprehensive JSDoc with examples
- Export all types through `index.ts`
- Create type guards for common node types
- Use strict TypeScript mode
- Keep nodes as pure data (no methods)
- Think of AST as JSON-serializable data

### Dependencies and Imports

**Required Imports:**

- `SourceLocation` from `packages/core/src/common/diagnostic.ts`

**No External Dependencies:**

- Pure TypeScript types (no runtime dependencies)
- No libraries needed for AST node definitions

### Design Philosophy

**Why Immutable Data + Pure Functions?**

1. **Predictability**: No hidden state changes, no side effects
2. **Testability**: Pure data can be easily constructed and inspected
3. **Debuggability**: AST can be JSON.stringify'd and examined
4. **Parallelism**: Immutable data is thread-safe (future optimization)
5. **Language Agnostic**: Pure data translates easily to other languages

**Multi-Pass Pipeline:**

```
Source Code (string)
  ↓ Scanner (Story 2.1)
Tokens (Token[])
  ↓ Parser (Story 2.3 - uses types from THIS story)
AST (Program)
  ↓ Semantic Analyzer (Story 2.4-2.5)
Validated AST (ValidatedProgram)
  ↓ Generator (Epic 3)
Data Records (Record[])
```

Story 2.2 defines the **AST data structures** used between Parser → Analyzer → Generator.

### References

**Source Documents:**

- [Epic Definition: Story 2.2](/_bmad-output/planning-artifacts/epics.md#story-22-parser-ast-node-types) - Complete story requirements
- [Architecture - AST Design: Immutable Data + Pure Functions](/_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ast-design-immutable-data-pure-functions) - Architectural decision and rationale
- [Architecture - Token Representation](/_bmad-output/planning-artifacts/architecture.md#token-representation-discriminated-union-types) - Discriminated union pattern (same pattern for AST)
- [Architecture - Multi-Pass Compilation](/_bmad-output/planning-artifacts/architecture.md#dsl-parser-architecture) - Scanner → Parser → Analyzer → Generator pipeline
- [Project Context - TypeScript Patterns](/_bmad-output/planning-artifacts/project-context.md#typescript-strict-mode-requirements) - TypeScript strict mode, immutability requirements
- [Story 1.3 - Diagnostic System](/_bmad-output/implementation-artifacts/1-3-common-utilities-diagnostic-system.md) - SourceLocation type definition

### Previous Story Learnings

**From Story 2.1 (Scanner):**

- Discriminated unions work excellently for token types
- `readonly` properties prevent accidental mutations
- TypeScript exhaustive checking catches missing cases
- Co-located tests improve discoverability
- Comprehensive JSDoc helps during implementation
- SourceLocation tracking is critical for error messages

**Patterns to Follow:**

- Use same discriminated union pattern for AST nodes
- Include `location: SourceLocation` on every node
- Export through `index.ts` for clean API
- Write unit tests that construct example nodes
- Document with JSDoc including examples

**Integration Points:**

- Parser (Story 2.3) will construct these node types
- Semantic Analyzer (Stories 2.4-2.5) will traverse and validate these nodes
- Generator (Epic 3) will interpret these nodes to create data

### Architecture Compliance

**From Architecture Document:**

> "AST nodes are pure immutable data structures; transformations are pure functions"

This story establishes:

✅ Pure data structures (interfaces, no methods)
✅ Immutability enforcement (`readonly` everywhere)
✅ Discriminated unions for type safety
✅ Source location tracking for errors
✅ Clear node hierarchy (Program → Declaration → SchemaNode/ProfileNode)

**Multi-Pass Compilation Alignment:**

- Scanner produces: `Token[]` (Story 2.1 ✅)
- Parser produces: `Program` (Story 2.3, uses types from Story 2.2 ✅)
- Analyzer produces: `ValidatedProgram` (Stories 2.4-2.5)
- Generator produces: `Record[]` (Epic 3)

### Next Steps After This Story

1. **Story 2.3** will implement the parser that **constructs** these AST nodes
2. **Stories 2.4-2.5** will implement semantic analysis that **validates** these AST nodes
3. **Epic 3** will implement the generator that **interprets** these AST nodes

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

No debugging required - implementation proceeded smoothly following architecture patterns.

### Completion Notes List

✅ **Implementation Complete (2026-01-30)**

**Created Files:**
- [packages/core/src/parser/ast.ts](packages/core/src/parser/ast.ts) - Complete AST node type definitions with immutability enforcement
- [packages/core/src/parser/ast.test.ts](packages/core/src/parser/ast.test.ts) - 24 unit tests covering all node types, type guards, and immutability
- [packages/core/src/parser/index.ts](packages/core/src/parser/index.ts) - Public API exports

**Key Implementation Decisions:**
1. Used TypeScript interfaces (not classes) for pure data structures following architecture
2. Applied `readonly` modifier to ALL properties and arrays for immutability enforcement
3. Implemented discriminated union pattern with `kind` property for type-safe exhaustive checking
4. Added comprehensive JSDoc documentation with examples for all types
5. Created 5 type guard functions for safe type narrowing
6. Included SourceLocation on every node for error reporting capability

**Testing Coverage:**
- 24 unit tests written covering:
  - Node construction for all types
  - Type guard functionality
  - Discriminated union exhaustiveness
  - Immutability enforcement (compile-time tests)
  - Example AST structures
- **BDD Tests (added 2026-01-31):**
  - 11 Gherkin scenarios in [packages/core/features/ast-nodes.feature](packages/core/features/ast-nodes.feature)
  - 128 BDD test steps using Cucumber + SerenityJS Screenplay pattern
  - Screenplay support files:
    - [packages/core/features/support/abilities/ConstructASTNodes.ts](packages/core/features/support/abilities/ConstructASTNodes.ts) - Ability to construct AST nodes
    - [packages/core/features/support/tasks/ASTTasks.ts](packages/core/features/support/tasks/ASTTasks.ts) - High-level Tasks using Interaction.where()
    - [packages/core/features/support/questions/ASTQuestions.ts](packages/core/features/support/questions/ASTQuestions.ts) - Questions for querying node state
    - [packages/core/features/step_definitions/ast.steps.ts](packages/core/features/step_definitions/ast.steps.ts) - Step definitions with actorCalled() pattern
  - Tests verify: Program/Schema/Field/Profile node construction, type guards, location tracking, immutability operations
- All tests pass (158 total including 26 BDD scenarios with 128 steps)
- Linter passes with no violations
- Code formatted with Prettier

**Code Review Completed (2026-01-31):**
- ContextNode enhanced with name property for consistency with other declaration types
- Type guard parameters narrowed for better type precision (Declaration instead of ASTNode | Declaration)
- Architecture documentation links validated and updated
- All 158 tests passing after review fixes

**Architecture Compliance:**
- ✅ Pure data structures (no methods/behavior)
- ✅ Immutability enforced via readonly
- ✅ Discriminated unions for type safety
- ✅ Source location tracking for errors
- ✅ Clear node hierarchy (Program → Declaration → SchemaNode/ProfileNode)
- ✅ Multi-pass compilation alignment (Scanner → Parser → Analyzer → Generator)

**Fixed Pre-existing Issue:**
- Removed unused `OperatorType` import from [packages/core/src/scanner/scanner.ts](packages/core/src/scanner/scanner.ts#L20)

### File List

**New Files:**
- packages/core/src/parser/ast.ts
- packages/core/src/parser/ast.test.ts
- packages/core/src/parser/index.ts
- packages/core/features/ast-nodes.feature (added 2026-01-31)
- packages/core/features/support/abilities/ConstructASTNodes.ts (added 2026-01-31)
- packages/core/features/support/tasks/ASTTasks.ts (added 2026-01-31)
- packages/core/features/support/questions/ASTQuestions.ts (added 2026-01-31)
- packages/core/features/step_definitions/ast.steps.ts (added 2026-01-31)

**Modified Files:**
- packages/core/src/index.ts (added parser exports)
- packages/core/src/scanner/scanner.ts (removed unused import)
- packages/core/tests/cucumber.runner.test.ts (increased timeout to 30s for BDD tests)
- .prettierignore (added _bmad and _bmad-output folders to ignore list)
