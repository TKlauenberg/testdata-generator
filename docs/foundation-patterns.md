# Foundation Patterns Guide

**Last Updated:** 2026-02-10
**Covers:** Epics 1-3 (18 stories)
**Purpose:** Quick reference for core architectural patterns established during foundation work

---

## Quick Reference

| Pattern                                               | When to Use                 | Key Files                          |
| ----------------------------------------------------- | --------------------------- | ---------------------------------- |
| [Result Type](#result-type-pattern)                   | Any operation that can fail | `common/result.ts`                 |
| [Diagnostic System](#diagnostic-system)               | Reporting errors to users   | `common/diagnostic.ts`             |
| [Screenplay BDD](#screenplay-bdd-pattern)             | Writing acceptance tests    | `features/**/*.feature`            |
| [RNG Determinism](#rng-and-determinism)               | Random generation           | `generator/rng.ts`                 |
| [Streaming Generation](#streaming-with-asynciterable) | Large datasets              | `generator/generator.ts`           |
| [Generator Registry](#generator-registry-pattern)     | Extensible generators       | `generator/generators/registry.ts` |

---

## Result Type Pattern

**Purpose:** Type-safe error handling without exceptions. Explicit success/failure states.

### Core Concept

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; errors: E };
```

### When to Use

- **Parser pipeline:** Scanner → Parser → Analyzer → Validation
- **Generation pipeline:** Schema validation → Record generation → Output
- **Any operation that can fail:** File I/O, validation, transformation

### Pattern: Early Return on Error

```typescript
function validateAndGenerate(source: string): Result<Data, Diagnostic[]> {
  // Step 1: Validate schema
  const validated = validateSchema(source);
  if (!validated.ok) {
    return validated; // Early return preserves error type
  }

  // Step 2: Generate data (validated.value is ValidatedProgram)
  const generated = generate(validated.value);
  if (!generated.ok) {
    return generated;
  }

  return ok(generated.value);
}
```

### Pattern: Error Accumulation

```typescript
function analyzeSchema(program: Program): Result<AnalyzedProgram, Diagnostic[]> {
  const errors: Diagnostic[] = [];

  // Collect all errors, don't stop at first
  for (const schema of program.schemas) {
    const result = checkSchema(schema);
    if (!result.ok) {
      errors.push(...result.errors);
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(analyzedProgram);
}
```

### Common Utilities

```typescript
// Create results
const success = ok(42);
const failure = err(['Error message']);

// Transform success values
const doubled = map(result, (x) => x * 2);

// Chain dependent operations
const chained = flatMap(result, (x) => computeSomething(x));
```

### Critical: Type Narrowing

```typescript
if (result.ok) {
  console.log(result.value);  // TypeScript knows: value exists
} else {
  console.log(result.errors); // TypeScript knows: errors exist
}
// NEVER access result.value without checking result.ok first!
```

---

## Diagnostic System

**Purpose:** Rich error messages with source locations, error codes, and suggestions.

### Core Structure

```typescript
interface Diagnostic {
  code: string;          // 'phase.errorType' convention
  message: string;       // Human-readable description
  severity: 'error' | 'warning' | 'info';
  location: SourceLocation;
  suggestion?: string;   // Optional "Did you mean?" or fix hint
}

interface SourceLocation {
  file: string;
  line: number;    // 1-indexed (first line = 1)
  column: number;  // 1-indexed (first column = 1)
  length: number;  // Number of characters
}
```

### Critical: 1-Indexed Line Numbers

```typescript
// ❌ WRONG: 0-indexed
{ line: 0, column: 0 }

// ✅ CORRECT: 1-indexed (matches editors)
{ line: 1, column: 1 }
```

**Why:** User-facing tools (VS Code, vim, etc.) display line 1 as the first line. 0-indexed line numbers confuse users.

### Error Code Convention

| Phase     | Example Codes                                                |
| --------- | ------------------------------------------------------------ |
| Scanner   | `scanner.unterminatedString`, `scanner.invalidCharacter`     |
| Parser    | `parser.unexpectedToken`, `parser.expectedToken`             |
| Analyzer  | `analyzer.undefinedReference`, `analyzer.circularDependency` |
| Generator | `generator.invalidParameter`, `generator.unknownGenerator`   |

### Pattern: Creating Diagnostics

```typescript
// Factory function approach
const diag = createDiagnostic({
  code: 'parser.unexpectedToken',
  message: `Expected '}' but found '${token.value}'`,
  severity: 'error',
  location: token.location,
  suggestion: 'Add closing brace to match opening brace at line 5'
});
```

### Pattern: Levenshtein Suggestions

```typescript
// "Did you mean?" suggestions for typos
function suggestCorrection(input: string, validOptions: string[]): string | undefined {
  const closest = validOptions
    .map(option => ({ option, distance: levenshtein(input, option) }))
    .filter(({ distance }) => distance <= 2)  // Max 2 edits
    .sort((a, b) => a.distance - b.distance)[0];

  return closest ? `Did you mean '${closest.option}'?` : undefined;
}

// Usage in analyzer
const suggestion = suggestCorrection('uuuid', ['uuid', 'int', 'string']);
// Returns: "Did you mean 'uuid'?"
```

---

## Screenplay BDD Pattern

**Purpose:** Maintainable acceptance tests using Actor-Ability-Task-Question architecture.

### Key Concepts

```
Actor (Who)
  └─ Ability (Can)
      └─ Task (Does) or Question (Asks)
```

### Pattern: Screenplay Test Structure

```typescript
// features/step_definitions/scanner.steps.ts
import { Actor } from '@serenity-js/core';
import { ScanTokens } from '../tasks/ScanTokens';
import { TheScannedTokens } from '../questions/TheScannedTokens';

Given('{actor} scans the source code {string}',
  async (actor: Actor, source: string) => {
    await actor.attemptsTo(ScanTokens.from(source));
  }
);

Then('{actor} should see {int} tokens',
  async (actor: Actor, count: number) => {
    await actor.attemptsTo(
      Ensure.that(TheScannedTokens.count(), equals(count))
    );
  }
);
```

### Pattern: Task Implementation

```typescript
// features/tasks/ScanTokens.ts
export class ScanTokens implements Task {
  static from(source: string): ScanTokens {
    return new ScanTokens(source);
  }

  async performAs(actor: Actor): Promise<void> {
    const result = scan(this.source);
    actor.abilityTo(UseDSLScanner).setLastResult(result);
  }
}
```

### Pattern: Question Implementation

```typescript
// features/questions/TheScannedTokens.ts
export class TheScannedTokens {
  static count(): QuestionAdapter<number> {
    return Question.about('token count', actor => {
      const result = actor.abilityTo(UseDSLScanner).getLastResult();
      return result.ok ? result.value.length : 0;
    });
  }
}
```

### When to Use

- **Happy path:** Test expected functionality works correctly
- **Error scenarios:** Test validation catches invalid input
- **Edge cases:** Test boundary conditions (empty input, large input)
- **Integration:** Test full pipeline (scanner → parser → analyzer)

### Testing Layers

1. **Unit Tests:** Test individual functions (fast, isolated)
2. **BDD Scenarios:** Test user-facing behavior (readable, end-to-end)
3. **Example Schemas:** Living documentation that validates successfully

---

## RNG and Determinism

**Purpose:** Pseudo-random generation with reproducible output via seeding.

### Core Principle

**Same seed → identical sequence of random numbers**

```typescript
const rng1 = createRNG(42);
const rng2 = createRNG(42);

rng1.nextInt(1, 100); // 73
rng2.nextInt(1, 100); // 73 (deterministic!)
```

### Pattern: RNG as First Parameter

**ALL generators accept RNG as first parameter:**

```typescript
// ✅ CORRECT: RNG first
function generateInt(rng: RNG, min: number, max: number): number

// ❌ WRONG: RNG not first
function generateInt(min: number, max: number, rng: RNG): number
```

**Why:** Consistent pattern across all generators. Enables currying and composition.

### Pattern: Passing RNG Through Call Stack

```typescript
function generateRecord(rng: RNG, schema: Schema): Record {
  const record: Record = {};

  for (const field of schema.fields) {
    // Pass same RNG to all field generators
    record[field.name] = generateField(rng, field);
  }

  return record;
}

function generateField(rng: RNG, field: Field): any {
  const generator = getGenerator(field.type);
  return generator(rng, ...field.params);
}
```

**Critical:** Use the SAME RNG instance throughout generation. Don't create new RNG instances mid-generation.

### Pattern: Testing Determinism

```typescript
test('generates identical sequences with same seed', () => {
  const records1 = Array.from(generateData(schema, { seed: 999, count: 100 }));
  const records2 = Array.from(generateData(schema, { seed: 999, count: 100 }));

  expect(records1).toEqual(records2); // Byte-for-byte identical
});
```

### Implementation: Xoshiro256**

- **Algorithm:** Xoshiro256** (fast, high-quality PRNG)
- **State:** 256 bits (four 64-bit integers)
- **Operations:** `nextInt()`, `nextFloat()`, `nextBoolean()`
- **Seeding:** SplitMix64 algorithm for initialization

**No Math.random():** Avoid built-in Math.random() - it's not seedable and produces non-deterministic results.

---

## Streaming with AsyncIterable

**Purpose:** Memory-efficient generation of large datasets (1M+ records).

### Core Principle

**Generate records on-demand, not all at once:**

```typescript
async function* generate(program: ValidatedProgram, options: Options): AsyncIterable<Record> {
  const rng = createRNG(options.seed);

  for (let i = 0; i < options.count; i++) {
    yield generateRecord(rng, program.schemas[0]);
    // Record generated, consumed, and garbage collected
    // Memory stays flat regardless of count
  }
}
```

### Pattern: Consuming Stream

```typescript
// ❌ WRONG: Accumulates all records in memory
const records = [];
for await (const record of generateData(schema, { count: 1_000_000 })) {
  records.push(record); // Memory grows unbounded!
}

// ✅ CORRECT: Process and discard
let count = 0;
for await (const record of generateData(schema, { count: 1_000_000 })) {
  await writeToFile(record);  // Write immediately
  count++;
  // Record eligible for GC after this iteration
}
```

### Pattern: Adapters for Output

```typescript
// JSON Adapter (incremental writing)
async function toJsonArray(
  stream: AsyncIterable<Record>,
  outputPath: string
): Promise<void> {
  const file = await openFile(outputPath, 'w');

  await file.write('[\n');

  let first = true;
  for await (const record of stream) {
    if (!first) await file.write(',\n');
    await file.write(JSON.stringify(record, null, 2));
    first = false;
  }

  await file.write('\n]\n');
  await file.close();
}
```

### Performance Characteristics

| Operation             | Memory | Time  |
| --------------------- | ------ | ----- |
| Generate 1k records   | ~5 MB  | 0.03s |
| Generate 100k records | ~5 MB  | 3s    |
| Generate 1M records   | ~5 MB  | 30s   |

**Memory stays constant** because records are generated, written, and garbage collected immediately.

### Pattern: Testing Memory Efficiency

```typescript
test('handles 100k records without memory growth', async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  let count = 0;
  for await (const record of generateData(schema, { count: 100_000 })) {
    count++;
    // Don't accumulate - just count
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const growth = (finalMemory - initialMemory) / 1024 / 1024; // MB

  expect(count).toBe(100_000);
  expect(growth).toBeLessThan(10); // Less than 10MB growth
});
```

---

## Generator Registry Pattern

**Purpose:** Extensible system for field type generators with dynamic dispatch.

### Core Structure

```typescript
type GeneratorFunction = (rng: RNG, ...params: any[]) => any;

const registry = new Map<string, GeneratorFunction>();

// Register primitive generators
registry.set('int', generateInt);
registry.set('float', generateFloat);
registry.set('string', generateString);
registry.set('boolean', generateBoolean);

// Dynamic dispatch
function generateField(rng: RNG, field: Field): any {
  const generator = registry.get(field.type);
  if (!generator) {
    throw new Error(`Unknown generator: ${field.type}`);
  }
  return generator(rng, ...field.params);
}
```

### Pattern: Adding New Generators

```typescript
// packages/core/src/generator/generators/uuid.ts
export function generateUUID(rng: RNG): string {
  // Implementation using rng for determinism
  return formatAsUUID(rng.nextInt(0, 0xffffffff), ...);
}

// Register in registry.ts
import { generateUUID } from './uuid';
registry.set('uuid', generateUUID);
```

### Pattern: Parameter Extraction

```typescript
// DSL: id: int(min=1, max=100)
// Field: { name: 'id', type: 'int', params: [{ name: 'min', value: 1 }, { name: 'max', value: 100 }] }

function extractParams(field: Field): { min: number; max: number } {
  const params = { min: 0, max: 100 }; // Defaults

  for (const param of field.params) {
    if (param.name === 'min') params.min = param.value;
    if (param.name === 'max') params.max = param.value;
  }

  return params;
}

const { min, max } = extractParams(field);
const value = generateInt(rng, min, max);
```

### Extension Points

| Epic   | New Generators                      |
| ------ | ----------------------------------- |
| Epic 3 | int, float, string, boolean         |
| Epic 5 | uuid, email, phone, date, timestamp |
| Epic 6 | template (cross-field references)   |
| Epic 7 | unique variants                     |

---

## Common Patterns Across Epics

### Pattern: TypeScript Immutability

```typescript
// ✅ CORRECT: Readonly properties
interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly location: SourceLocation;
}

// ❌ WRONG: Mutable properties
interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}
```

**Why:** Prevents accidental mutations. TypeScript compiler catches mutation attempts.

### Pattern: Discriminated Unions

```typescript
// AST node types
type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; name: string };

// Type narrowing
function evaluate(expr: Expression): any {
  switch (expr.kind) {
    case 'number':
      return expr.value; // TypeScript knows: value is number
    case 'string':
      return expr.value; // TypeScript knows: value is string
    case 'identifier':
      return lookupVariable(expr.name); // TypeScript knows: name exists
  }
}
```

### Pattern: Type Guards

```typescript
function isNumberLiteral(node: ASTNode): node is NumberLiteral {
  return node.kind === 'numberLiteral';
}

// Usage
if (isNumberLiteral(node)) {
  console.log(node.value); // TypeScript knows node is NumberLiteral
}
```

### Pattern: O(1) Lookups with Maps

```typescript
// ✅ CORRECT: O(1) lookup
const symbolTable = new Map<string, Symbol>();
symbolTable.set('User', userSymbol);
const found = symbolTable.get('User'); // O(1)

// ❌ WRONG: O(n) lookup
const symbols = [userSymbol, orderSymbol, ...];
const found = symbols.find(s => s.name === 'User'); // O(n)
```

### Pattern: Error Recovery

```typescript
function parseSchema(): Result<Schema, Diagnostic[]> {
  try {
    // Attempt to parse
    return ok(schema);
  } catch (error) {
    // Synchronize to next schema keyword
    synchronizeToNextSchema();

    // Continue parsing to find more errors
    // (Don't stop at first error)
  }
}
```

---

## Testing Patterns

### Unit Tests: Fast and Isolated

```typescript
// Test single function in isolation
test('generateInt returns value in range', () => {
  const rng = createRNG(42);
  const value = generateInt(rng, 1, 100);
  expect(value).toBeGreaterThanOrEqual(1);
  expect(value).toBeLessThanOrEqual(100);
});
```

### BDD Scenarios: User-Facing Behavior

```gherkin
Feature: Generate Test Data
  Scenario: Generate records with seed
    Given I have a schema "schema User { id: int }"
    When I generate 100 records with seed 999
    Then I should get 100 records
    And generating again with seed 999 produces identical results
```

### Example Schemas: Living Documentation

```typescript
// docs/examples/basic-schema.td
schema User {
  id: int(min=1, max=1000)
  name: string(length=20)
  active: boolean
}

// Validates successfully (smoke test for DSL)
```

### Performance Tests: Tag with @slow

```typescript
test('generates 1M records in under 60 seconds', async () => {
  const start = performance.now();

  let count = 0;
  for await (const _ of generateData(schema, { count: 1_000_000 })) {
    count++;
  }

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(60_000); // 60 seconds
}, { timeout: 60_000 });
// Tag this test with @slow for selective execution
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Throwing Exceptions for Expected Errors

```typescript
// WRONG: Exceptions for validation errors
function validateSchema(source: string): ValidatedProgram {
  if (hasErrors) {
    throw new Error('Validation failed');
  }
  return program;
}

// CORRECT: Result type for expected errors
function validateSchema(source: string): Result<ValidatedProgram, Diagnostic[]> {
  if (hasErrors) {
    return err(diagnostics);
  }
  return ok(program);
}
```

### ❌ 0-Indexed Line Numbers in Diagnostics

```typescript
// WRONG: 0-indexed (confuses users)
{ line: 0, column: 0 }

// CORRECT: 1-indexed (matches editors)
{ line: 1, column: 1 }
```

### ❌ Using Math.random() for Generation

```typescript
// WRONG: Non-deterministic
function generateInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// CORRECT: Deterministic with RNG
function generateInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng.nextFloat() * (max - min + 1)) + min;
}
```

### ❌ Accumulating Large Datasets in Memory

```typescript
// WRONG: Memory grows unbounded
const records = [];
for await (const record of stream) {
  records.push(record);
}
return records;

// CORRECT: Stream to output
for await (const record of stream) {
  await writeToOutput(record);
}
```

### ❌ Stopping at First Error

```typescript
// WRONG: Only reports one error
if (hasError) {
  return err([diagnostic]);
}

// CORRECT: Accumulate all errors
const errors: Diagnostic[] = [];
// ... collect all errors ...
if (errors.length > 0) {
  return err(errors);
}
```

---

## Quick Decision Tree

**Need to report an error?** → Use Diagnostic + Result type
**Writing a test?** → Unit test (fast) or BDD scenario (readable)?
**Generating random data?** → Pass RNG as first parameter
**Large dataset (100k+ records)?** → Use AsyncIterable streaming
**Adding new field type?** → Add to generator registry
**Line/column number?** → Use 1-indexed (first line = 1)

---

## Additional Resources

- **Epics 1-3 Retrospectives:** Full context and team insights in `_bmad-output/implementation-artifacts/`
- **Example Schemas:** `docs/examples/*.td` (basic-schema.td, user-profile.td, complex-schema.td)
- **Test Examples:** `packages/core/features/**/*.feature` (Gherkin scenarios)
- **Source Code:** `packages/core/src/` (canonical implementation reference)

---

**Pattern Evolution:** This guide covers Epics 1-3. New patterns introduced in Epic 4+ will be added incrementally. Check retro documents for latest updates.
