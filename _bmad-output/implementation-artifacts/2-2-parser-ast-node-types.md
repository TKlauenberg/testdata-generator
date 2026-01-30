# Story 2.2: Parser - AST Node Types

Status: ready-for-dev

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

- [ ] Define base AST node structures (AC: 1, 7, 8, 11)
  - [ ] Create `packages/core/src/parser/ast.ts`
  - [ ] Define base `ASTNode` interface with common properties
  - [ ] Define `NodeKind` enum or type union for all node types
  - [ ] Ensure all nodes include `kind` discriminator and `location: SourceLocation`
  - [ ] Use `readonly` modifier for all properties
  - [ ] Add JSDoc documentation for each node type

- [ ] Define Program node (AC: 2)
  - [ ] Create `Program` interface as root AST node
  - [ ] Include `readonly kind: 'program'` discriminator
  - [ ] Include `readonly declarations: readonly Declaration[]` array
  - [ ] Include `readonly location: SourceLocation`
  - [ ] Document: "Root node containing all top-level declarations in DSL file"

- [ ] Define SchemaNode type (AC: 3)
  - [ ] Create `SchemaNode` interface for schema declarations
  - [ ] Include `readonly kind: 'schema'` discriminator
  - [ ] Include `readonly name: string` for schema identifier
  - [ ] Include `readonly fields: readonly FieldNode[]` for field definitions
  - [ ] Include `readonly location: SourceLocation`
  - [ ] Document: "Schema declaration defining a data structure with named fields"

- [ ] Define FieldNode type (AC: 4)
  - [ ] Create `FieldNode` interface for field definitions within schemas
  - [ ] Include `readonly kind: 'field'` discriminator
  - [ ] Include `readonly name: string` for field name
  - [ ] Include `readonly type: string` for field type
  - [ ] Include `readonly generator?: GeneratorSpec` for optional generator configuration
  - [ ] Include `readonly constraints?: FieldConstraints` for uniqueness/validation rules
  - [ ] Include `readonly location: SourceLocation`
  - [ ] Document: "Field definition within a schema"

- [ ] Define GeneratorSpec type (AC: 4)
  - [ ] Create `GeneratorSpec` interface for generator configurations
  - [ ] Include `readonly name: string` for generator name (e.g., 'uuid', 'randomInt')
  - [ ] Include `readonly parameters?: readonly GeneratorParameter[]` for generator args
  - [ ] Document: "Specification of generator function and its parameters"

- [ ] Define GeneratorParameter type (AC: 4)
  - [ ] Create `GeneratorParameter` interface for generator arguments
  - [ ] Include `readonly name: string` for parameter name
  - [ ] Include `readonly value: LiteralValue` for parameter value
  - [ ] Document: "Named parameter passed to a generator function"

- [ ] Define LiteralValue type (AC: 4)
  - [ ] Create `LiteralValue` type union for primitive values
  - [ ] Support: string, number, boolean
  - [ ] Document: "Literal value types that can appear in DSL"

- [ ] Define FieldConstraints type (AC: 4)
  - [ ] Create `FieldConstraints` interface for field validation rules
  - [ ] Include `readonly unique?: boolean` for single-field uniqueness
  - [ ] Include optional future constraints (min, max, pattern, etc.)
  - [ ] Document: "Constraints and validation rules for a field"

- [ ] Define ProfileNode type (AC: 5)
  - [ ] Create `ProfileNode` interface for generation profiles
  - [ ] Include `readonly kind: 'profile'` discriminator
  - [ ] Include `readonly name: string` for profile identifier
  - [ ] Include `readonly defaults: readonly DefaultSpec[]` for default settings
  - [ ] Include `readonly location: SourceLocation`
  - [ ] Document: "Generation profile defining default settings (future use)"

- [ ] Define DefaultSpec type (AC: 5)
  - [ ] Create `DefaultSpec` interface for profile defaults
  - [ ] Include `readonly fieldType: string` for type pattern
  - [ ] Include `readonly generator: GeneratorSpec` for default generator
  - [ ] Document: "Default generator specification for a field type pattern"

- [ ] Define Declaration discriminated union (AC: 1)
  - [ ] Create `Declaration` type as union of all top-level declaration types
  - [ ] Include: `SchemaNode | ProfileNode | ContextNode` (ContextNode reserved for future)
  - [ ] Ensure discriminated by `kind` property for type-safe handling
  - [ ] Document: "Top-level declarations that can appear in a DSL file"

- [ ] Define helper types and utilities
  - [ ] Create `NodeVisitor` interface for traversing AST (future use)
  - [ ] Create type guards: `isSchemaNode()`, `isFieldNode()`, `isProfileNode()`
  - [ ] Document all type guards with examples

- [ ] Create comprehensive type exports (AC: 9)
  - [ ] Create `packages/core/src/parser/index.ts`
  - [ ] Export all node types: `Program`, `SchemaNode`, `FieldNode`, etc.
  - [ ] Export all supporting types: `GeneratorSpec`, `FieldConstraints`, etc.
  - [ ] Export type guards and utilities
  - [ ] Do NOT export internal implementation details

- [ ] Write unit tests (AC: 11)
  - [ ] Create `packages/core/src/parser/ast.test.ts`
  - [ ] Test: type guards correctly identify node types
  - [ ] Test: TypeScript enforces immutability (attempt to modify should fail to compile)
  - [ ] Test: discriminated unions work correctly (exhaustive switch checks)
  - [ ] Test: all required properties are present in node definitions
  - [ ] Test: readonly arrays prevent mutation
  - [ ] Test: example AST construction validates structure

- [ ] Write documentation and examples (AC: 11)
  - [ ] Add comprehensive JSDoc to all types
  - [ ] Create example AST structures in comments
  - [ ] Document the AST design philosophy (immutable data + pure functions)
  - [ ] Document relationship to architecture patterns
  - [ ] Include example of constructing a simple AST manually

- [ ] Integration and validation
  - [ ] Verify SourceLocation import from `packages/core/src/common/diagnostic.ts`
  - [ ] Ensure all types use `readonly` consistently
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Run `bun run lint` and fix any violations
  - [ ] Run `bun run format` to format code
  - [ ] Update exports in `packages/core/src/index.ts` if needed
  - [ ] Verify TypeScript strict mode catches mutation attempts

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

- [Epic Definition: packages/core/src/parser/ast.ts](/_bmad-output/planning-artifacts/epics.md#story-22-parser-ast-node-types) - Complete story requirements
- [Architecture - AST Design](/_bmad-output/planning-artifacts/architecture.md#ast-design-immutable-data--pure-functions) - Immutable data pattern, pure functions philosophy
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

*To be filled by dev agent*

### Debug Log References

*To be filled by dev agent*

### Completion Notes List

*To be filled by dev agent*

### File List

*To be filled by dev agent*
