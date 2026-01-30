# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Token representation strategy
- AST node design pattern
- Error handling approach
- Random number generation strategy
- Output streaming approach

**Important Decisions (Shape Architecture):**

- Context storage format

**Deferred Decisions (Post-MVP):**

- Plugin/extension API design - DSL should stabilize first before defining extension points

## DSL Parser Architecture

### Token Representation: Discriminated Union Types

**Decision:** Use TypeScript discriminated union types for token representation

```typescript
type Token =
  | { kind: 'keyword'; value: KeywordType; location: SourceLocation }
  | { kind: 'identifier'; value: string; location: SourceLocation }
  | { kind: 'string'; value: string; location: SourceLocation }
  | { kind: 'number'; value: number; location: SourceLocation }
  | { kind: 'operator'; value: OperatorType; location: SourceLocation }
  | { kind: 'eof'; location: SourceLocation };
```

**Rationale:**

- Type-safe discriminated unions with exhaustive `switch` checking
- Excellent TypeScript autocomplete during parser development
- Pattern matching becomes compile-time verified
- Clean serialization for debugging/testing

### AST Design: Immutable Data + Pure Functions

**Decision:** AST nodes are pure immutable data structures; transformations are pure functions

```typescript
// Pure data structures
interface SchemaNode {
  readonly kind: 'schema';
  readonly name: string;
  readonly fields: readonly FieldNode[];
  readonly location: SourceLocation;
}

// Pure transformation functions
function analyze(ast: Program): Result<ValidatedProgram, Diagnostic[]>;
function generate(validated: ValidatedProgram, options: GenerateOptions): AsyncIterable<Record>;
```

**Rationale:**

- Clear separation between data and behavior
- Each compilation phase is independently testable
- Easier to reason about transformations
- Aligns with multi-pass architecture (Scanner → Parser → Analyzer → Generator)
- Facilitates potential future language migration

## Error Handling Architecture

### Error Accumulation: Result Type Pattern

**Decision:** Use `Result<T, Diagnostic[]>` for explicit success/failure with error accumulation

```typescript
type Result<T, E = Diagnostic[]> = { ok: true; value: T } | { ok: false; errors: E };

// Each phase returns Result
function scan(source: string): Result<Token[]>;
function parse(tokens: Token[]): Result<Program>;
function analyze(ast: Program): Result<ValidatedProgram>;
```

**Rationale:**

- Rust-inspired explicit error handling without exceptions
- Errors naturally accumulate (show all syntax errors at once)
- No hidden control flow from thrown exceptions
- Type system enforces error handling
- Aligns with "fail-fast before generation" requirement

## Generator Architecture

### Random Number Generation: Custom PRNG Implementation

**Decision:** Implement custom seeded PRNG (e.g., Xoshiro256\*\*) rather than using Faker.js

**Rationale:**

- **Independence**: No external dependencies for core generation logic
- **Portability**: Enables future migration to other languages (Rust, Go) with identical output
- **Backwards Compatibility**: Same seed produces identical data across versions and runtimes
- **Control**: Full control over distribution algorithms and generator behavior
- **Performance**: Can optimize for specific use cases

**Implementation Approach:**

- Implement Xoshiro256\*\* or similar well-documented PRNG algorithm
- Build data generators on top: `randomInt()`, `randomFloat()`, `randomElement()`, `randomString()`
- Create higher-level generators: `email()`, `name()`, `date()`, `uuid()` using primitive generators
- All generators accept seed parameter for reproducibility

**Generator Categories (Built-in):**

- **Primitives**: integers, floats, booleans, strings
- **Identity**: UUIDs, sequential IDs
- **Personal**: names, emails (templated), phone numbers
- **Temporal**: dates, timestamps, date ranges
- **Text**: words, sentences, paragraphs
- **Selection**: pick from array, weighted selection

### Output Streaming: Generator Functions

**Decision:** Use `function*` generators and `AsyncIterable` for lazy record generation

```typescript
async function* generateRecords(
  schema: ValidatedSchema,
  options: GenerateOptions,
): AsyncIterable<Record> {
  const rng = createRNG(options.seed);
  for (let i = 0; i < options.count; i++) {
    yield generateRecord(schema, rng);
  }
}
```

**Rationale:**

- Memory-efficient for large datasets (1M+ records)
- Records streamed as generated, not buffered
- Adapters can consume incrementally (write to file as records arrive)
- Works well with Bun's fast I/O
- Backpressure handling possible with async iteration

## Context & Data Loading

### Context Storage: JSON Files

**Decision:** Use JSON files for context storage in MVP

```typescript
interface ContextFile {
  metadata: {
    createdAt: string;
    sourcePattern: string;
    version: string;
  };
  data: Record<string, unknown>[];
}
```

**Rationale:**

- Simple, human-readable format
- Can be version controlled alongside DSL patterns
- Easy to inspect and debug
- Portable across tools and languages
- Future: May evolve to different backend (SQLite, API) without changing DSL semantics

## Plugin & Extension Architecture

### Custom Generators: Deferred to Post-MVP

**Decision:** Plugin architecture deferred until DSL stabilizes

**Rationale:**

- Core DSL syntax and semantics should stabilize first
- Built-in generators cover MVP use cases
- Extension API design depends on real-world usage patterns
- Avoids premature abstraction

**Future Considerations (when implemented):**

- Function registration mechanism
- Plugin discovery and loading
- Sandboxed execution for security
- Type definitions for custom generators

## Decision Impact Analysis

**Implementation Sequence:**

1. **Token types** → Define discriminated unions first (foundation for scanner)
2. **AST nodes** → Define immutable node types (foundation for parser)
3. **Result type** → Implement error handling utilities
4. **PRNG core** → Implement seeded random number generator
5. **Primitive generators** → Build on PRNG (ints, floats, strings)
6. **High-level generators** → Build on primitives (names, emails, etc.)
7. **Streaming infrastructure** → Generator functions and async iteration
8. **Context loading** → JSON file loading/saving

**Cross-Component Dependencies:**

```
Scanner ──→ Token (union types)
Parser ──→ AST (immutable nodes) + Result type
Analyzer ──→ AST + Result type + Symbol table
Generator ──→ Validated AST + PRNG + Streaming
Adapters ──→ AsyncIterable<Record> consumption
Context ──→ JSON files + Generator output
```

**Key Architectural Principles Established:**

1. **Functional core**: Pure functions, immutable data, explicit error handling
2. **Independence**: No heavy external dependencies in core logic
3. **Portability**: Design choices that enable future language migration
4. **Testability**: Each phase independently testable with clear inputs/outputs
5. **Streaming-first**: Memory-efficient by default for large datasets
