# Story 3.6: End-to-End Generation Pipeline

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate test data from DSL schemas with a simple API call**,
So that **I can quickly create test datasets for my testing scenarios**.

## Acceptance Criteria

**Given** I have a valid DSL schema
**When** I use the generation API
**Then** a public `generateData(source: string, options: GenerateOptions): AsyncIterable<Record>` function exists
**And** the function validates the schema first before generation
**And** validation errors are returned immediately without starting generation
**And** the function generates 1000 records in under 1 minute on standard hardware (NFR1)
**And** the function supports seed parameter for deterministic generation (FR25)
**And** the same schema and seed produce identical data across runs
**And** the API is exported from `packages/core/src/index.ts`
**And** comprehensive Gherkin feature tests cover:
- Valid schema generates correct number of records
- Generated records match schema structure
- Seed parameter produces reproducible results
- Invalid schema returns validation errors
- Performance requirements are met (1000 records < 1 minute)
- Large dataset generation (10k, 100k records) works without memory issues
**And** example usage is documented with code samples

## Tasks / Subtasks

- [ ] Implement generateData() public API function (AC: 1, 2, 3, 6, 7)
  - [ ] Create `generateData()` function in packages/core/src/index.ts
  - [ ] Accept `source: string` (DSL source code) as first parameter
  - [ ] Accept `options: GenerateOptions` as second parameter
  - [ ] Validate schema using validateSchema() BEFORE generation starts
  - [ ] If validation fails, return error result immediately (no AsyncIterable)
  - [ ] If validation succeeds, return AsyncIterable using generate() function
  - [ ] Export function from packages/core/src/index.ts (public API)
  - [ ] Ensure seed parameter flows through to RNG for determinism

- [ ] Design error handling for validation failures (AC: 3)
  - [ ] Design approach: AsyncIterable can't yield errors elegantly
  - [ ] Consider: Throw error with diagnostics for invalid schemas
  - [ ] OR: Return Result<AsyncIterable<Record>, Diagnostic[]> wrapper
  - [ ] Document decision and rationale in code comments
  - [ ] Ensure error includes full diagnostic information with locations

- [ ] Create comprehensive unit tests (AC: 1-8)
  - [ ] Test: Valid schema generates records
  - [ ] Test: Invalid schema returns validation errors immediately
  - [ ] Test: Generated records match schema structure
  - [ ] Test: Seed parameter produces reproducible results (same seed = same data)
  - [ ] Test: Different seeds produce different data
  - [ ] Test: Multiple schemas in one source generate all records
  - [ ] Test: Empty schema source returns errors
  - [ ] Test: Syntax errors caught and reported
  - [ ] Test: Semantic errors caught and reported
  - [ ] Test: Large record count (10k+) works without memory issues

- [ ] Create comprehensive Gherkin BDD tests (AC: 8)
  - [ ] Scenario: Generate small dataset from valid schema
  - [ ] Scenario: Generate dataset with specific seed for reproducibility
  - [ ] Scenario: Invalid schema returns validation errors
  - [ ] Scenario: Performance test - 1000 records in under 1 minute
  - [ ] Scenario: Memory efficiency - 100k records without memory issues
  - [ ] Scenario: Multi-schema source generates all schemas
  - [ ] Scenario: Syntax error in schema returns clear error message
  - [ ] Scenario: Semantic error in schema returns clear error message

- [ ] Create example usage documentation (AC: 9)
  - [ ] Document basic usage in code comments
  - [ ] Create example: Simple schema with basic generation
  - [ ] Create example: Reproducible generation with seed
  - [ ] Create example: Error handling for invalid schemas
  - [ ] Create example: Streaming large datasets
  - [ ] Create example: Using with JSON adapter for file output
  - [ ] Add examples to packages/core/README.md or docs/

- [ ] Performance validation (AC: 4, 8)
  - [ ] Run performance test: 1000 records < 1 minute
  - [ ] Run memory test: 100k records without memory explosion
  - [ ] Document performance results in story completion notes
  - [ ] If performance issues found, optimize before marking complete

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Completes Epic 3: Basic Data Generation**

Story 3.6 is the **end-to-end integration** that ties together ALL previous stories in Epic 3:
- Story 3.1: Custom PRNG (deterministic RNG)
- Story 3.2: Primitive field generators
- Story 3.3: Generator engine (record creation)
- Story 3.4: Streaming generation (AsyncIterable)
- Story 3.5: JSON output adapter

This story creates the **public-facing API** that QA testers will use. It must be simple, intuitive, and bulletproof.

**Critical Mission:**
- Create simple public API: `generateData(source, options)` - one function does everything
- Validate schema FIRST before starting generation - fail fast on invalid input
- Return streaming AsyncIterable for memory efficiency (building on 3.4)
- Support deterministic generation via seed parameter (building on 3.1)
- Meet performance requirement: 1000 records in < 1 minute
- Provide excellent error messages for validation failures
- Document usage patterns for QA testers (non-programmers)
- Build the foundation for CLI tool (Epic 4 Story 4.2)

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Not validating schema before generation (generating invalid data!)
- ❌ Returning errors mid-stream instead of fail-fast validation
- ❌ Creating new function signature instead of using existing validate() and generate()
- ❌ Not passing seed through to RNG (breaking determinism)
- ❌ Buffering records instead of streaming (memory explosion)
- ❌ Using exceptions for validation errors (breaking Result pattern)
- ❌ Not testing performance requirements (missing NFR1)
- ❌ Forgetting to export from public API (packages/core/src/index.ts)
- ❌ Using Node.js APIs instead of Bun-specific APIs
- ❌ Not documenting usage examples for QA testers

### 🏗️ Architecture Requirements

**End-to-End Pipeline:**
```
DSL Source String
    ↓
validateSchema() - Epic 2 (Stories 2.1-2.6)
    ↓
[FAIL] → Return validation errors immediately (Result pattern)
    ↓
[SUCCESS] → ValidatedProgram
    ↓
generate() - Epic 3 Story 3.4
    ↓
AsyncIterable<Record> (streaming, lazy evaluation)
    ↓
Consumer (CLI, JsonAdapter, or direct usage)
```

**Public API Function Signature Options:**

**Option 1: Throw on validation error (simpler for users)**
```typescript
/**
 * Generate test data from DSL schema source code.
 *
 * @param source - DSL schema source code (string)
 * @param options - Generation options (count, seed)
 * @returns AsyncIterable yielding generated records
 * @throws {ValidationError} if schema is invalid
 */
export async function* generateData(
  source: string,
  options: GenerateOptions
): AsyncIterable<Record<string, unknown>> {
  // Validate first
  const validationResult = validateSchema(source);
  if (!validationResult.ok) {
    throw new ValidationError(validationResult.errors);
  }

  // Generate and yield records
  yield* generate(validationResult.value, options);
}
```

**Option 2: Result wrapper (consistent with project pattern)**
```typescript
export type GenerateResult = {
  ok: true;
  records: AsyncIterable<Record<string, unknown>>;
} | {
  ok: false;
  errors: Diagnostic[];
};

export function generateData(
  source: string,
  options: GenerateOptions
): GenerateResult {
  const validationResult = validateSchema(source);
  if (!validationResult.ok) {
    return { ok: false, errors: validationResult.errors };
  }

  return {
    ok: true,
    records: generate(validationResult.value, options)
  };
}
```

**DECISION REQUIRED:** Choose Option 1 (simpler) OR Option 2 (consistent with Result pattern)
- Option 1: Better for QA testers (standard exception handling)
- Option 2: Consistent with existing codebase patterns
- **Recommendation:** Option 1 for public API simplicity

**Function Behavior:**
1. Accept DSL source string and generation options
2. Validate schema using validateSchema() from validate.ts
3. If invalid, return/throw errors immediately (FAIL FAST)
4. If valid, pass ValidatedProgram to generate()
5. Return AsyncIterable that streams records
6. Ensure seed parameter flows to RNG

**Performance Targets (NFR1):**
- Generate 1000 records in < 60 seconds on standard hardware
- Memory usage remains constant regardless of count (streaming)
- No buffering of records in memory

### 📦 Existing Components Available

**From Story 2.6 (End-to-End Schema Validation) - COMPLETED:**

✅ **validateSchema() Function Available:**
```typescript
import { validateSchema } from './validate';

/**
 * End-to-end schema validation pipeline.
 *
 * Runs: Scanner → Parser → Analyzer
 * Returns: Result<ValidatedProgram, Diagnostic[]>
 *
 * CRITICAL: This is the entry point for validation before generation
 */
export function validateSchema(source: string): Result<ValidatedProgram, Diagnostic[]>;
```

✅ **Usage Pattern:**
```typescript
const result = validateSchema(source);
if (!result.ok) {
  // result.errors contains Diagnostic[]
  console.error('Validation failed:', result.errors);
  return;
}

// result.value is ValidatedProgram - ready for generation
const program = result.value;
```

**From Story 3.4 (Streaming Generation) - COMPLETED:**

✅ **generate() Function Available:**
```typescript
import { generate, type GenerateOptions } from './generator';

/**
 * Streaming generator function.
 *
 * @param program - ValidatedProgram from analyzer
 * @param options - { count: number, seed?: number }
 * @returns AsyncIterable<Record<string, unknown>>
 *
 * CRITICAL: Yields records lazily, memory-efficient
 */
export async function* generate(
  program: ValidatedProgram,
  options: GenerateOptions
): AsyncIterable<Record<string, unknown>>;
```

✅ **Usage Pattern:**
```typescript
const program: ValidatedProgram = /* from validateSchema */;
const options = { count: 1000, seed: 12345 };

for await (const record of generate(program, options)) {
  console.log(record); // Process each record as generated
  // Do NOT accumulate in array - defeats streaming purpose
}
```

**From Story 3.5 (JSON Output Adapter) - COMPLETED:**

✅ **JsonAdapter Available for Documentation Examples:**
```typescript
import { JsonAdapter } from './adapters';

const adapter = new JsonAdapter({
  outputPath: 'output.json',
  format: 'array', // or 'jsonl'
  metadata: { sourcePattern: 'User.td', count: 1000, seed: 42 }
});

await adapter.write(generateData(source, { count: 1000, seed: 42 }));
```

### 🔬 Technology Stack Requirements

**Bun-Specific Requirements:**
- Use Bun's built-in test runner for tests
- Use Bun's native file APIs in examples
- Performance testing should use Bun.nanoseconds() for accurate timing

**TypeScript Strict Mode:**
- Explicit return types required
- No `any` types allowed
- Result pattern for expected errors

**Testing Requirements:**
- Bun test runner: `describe`, `test`, `expect`
- Gherkin BDD tests in .feature file
- Performance tests must verify < 60 seconds for 1000 records
- Memory tests must verify 100k records don't explode memory

### 📋 Implementation Checklist

**Phase 1: API Design and Implementation**
- [ ] Choose error handling approach (throw vs Result wrapper)
- [ ] Implement generateData() function
- [ ] Validate schema first using validateSchema()
- [ ] Return/throw errors immediately if validation fails
- [ ] Pass ValidatedProgram to generate() if validation succeeds
- [ ] Ensure seed parameter flows through to RNG
- [ ] Export from packages/core/src/index.ts

**Phase 2: Testing**
- [ ] Write unit tests covering all AC
- [ ] Write Gherkin BDD tests in features/ directory
- [ ] Test performance: 1000 records < 60 seconds
- [ ] Test memory: 100k records works without issues
- [ ] Test determinism: same seed = same data
- [ ] Test error handling: invalid schema returns clear errors

**Phase 3: Documentation**
- [ ] Add comprehensive JSDoc comments
- [ ] Create usage examples in code comments
- [ ] Document error handling patterns
- [ ] Add examples to README or docs/
- [ ] Include example of using with JsonAdapter

**Phase 4: Validation**
- [ ] Run all tests and verify they pass
- [ ] Run performance tests and verify requirements met
- [ ] Review error messages for clarity
- [ ] Ensure API is simple and intuitive for QA testers

### 🎓 Previous Story Intelligence

**From Story 3.5 (JSON Output Adapter) - COMPLETED:**

✅ **Key Implementation Patterns:**
- Streaming write implementation using Bun.file().writer()
- Metadata structure: timestamp, sourcePattern, count, seed
- Array format vs JSONL format support
- Incremental writing to avoid memory issues

✅ **Integration Example for Documentation:**
```typescript
// Complete example: DSL source → Generated data → JSON file
import { generateData } from '@testdata-ai/core';
import { JsonAdapter } from '@testdata-ai/core/adapters';

const source = `
schema User {
  id: number @generate(randomInt, min: 1, max: 1000000)
  name: string @generate(randomString, length: 10)
  email: string @generate(email)
  active: boolean @generate(randomBoolean)
}
`;

const adapter = new JsonAdapter({
  outputPath: 'users.json',
  format: 'array',
  metadata: { sourcePattern: 'User.td', count: 1000, seed: 42 }
});

// Generate and write in one pipeline
await adapter.write(generateData(source, { count: 1000, seed: 42 }));
```

**From Story 3.4 (Streaming Generation) - COMPLETED:**

✅ **Critical Insights:**
- AsyncIterable MUST be consumed with for-await-of
- Do NOT buffer records in array (defeats streaming purpose)
- Same RNG instance used throughout for determinism
- Performance is fast: 10k+ records per second typical

✅ **Common Usage Patterns:**
```typescript
// Pattern 1: Direct consumption
for await (const record of generateData(source, { count: 100 })) {
  processRecord(record);
}

// Pattern 2: Adapter consumption
await jsonAdapter.write(generateData(source, { count: 1000 }));

// Pattern 3: Counting records (testing)
let count = 0;
for await (const record of generateData(source, { count: 50 })) {
  count++;
}
expect(count).toBe(50);

// Pattern 4: Collecting samples (testing only! small datasets)
const records = [];
for await (const record of generateData(source, { count: 10 })) {
  records.push(record);
}
```

**From Story 3.1 (Custom PRNG) - COMPLETED:**

✅ **Determinism Requirements:**
- Same seed must produce identical sequences
- Seed parameter MUST flow through: API → generate() → createRNG()
- Test determinism: generate twice with same seed, compare output

**From Story 2.6 (End-to-End Validation) - COMPLETED:**

✅ **Validation Error Handling:**
```typescript
const result = validateSchema('invalid schema');
if (!result.ok) {
  // result.errors: Diagnostic[]
  // Each diagnostic has: kind, message, location
  for (const error of result.errors) {
    console.error(`${error.kind}: ${error.message} at ${error.location.line}:${error.location.column}`);
  }
}
```

✅ **Error Categories:**
- Syntax errors: malformed DSL syntax
- Semantic errors: type mismatches, unknown generators, invalid parameters

### 🚧 Potential Challenges and Solutions

**Challenge 1: Error Handling Design**
- Problem: AsyncIterable can't elegantly return errors mid-stream
- Solution: Validate BEFORE returning AsyncIterable (fail fast)
- Implementation: Check validateSchema() result, return/throw before streaming starts

**Challenge 2: Performance Testing**
- Problem: Need to verify 1000 records < 60 seconds without flakiness
- Solution: Run performance test with sufficient margin (e.g., expect < 30 seconds)
- Implementation: Use Bun.nanoseconds() for accurate timing, run multiple times

**Challenge 3: Memory Testing**
- Problem: Need to verify 100k records don't explode memory
- Solution: Run generation, monitor process.memoryUsage() before/after
- Implementation: Expect memory growth to be < 100MB (constant, not proportional to count)

**Challenge 4: Multi-Schema Generation**
- Problem: Program can have multiple schemas, how many records generated?
- Solution: Current generate() yields count records PER schema (not total)
- Implementation: Document this behavior clearly, test with multi-schema source

**Challenge 5: API Simplicity**
- Problem: Result wrapper might confuse QA testers
- Solution: Consider throwing ValidationError for simpler usage
- Implementation: Create ValidationError class extending Error with diagnostics property

### 📝 Example Usage Scenarios

**Scenario 1: Basic Usage**
```typescript
import { generateData } from '@testdata-ai/core';

const schema = `
schema User {
  id: number @generate(randomInt, min: 1, max: 1000)
  name: string @generate(randomString, length: 8)
}
`;

for await (const record of generateData(schema, { count: 10 })) {
  console.log(record);
  // { id: 742, name: "AbCdEfGh" }
}
```

**Scenario 2: Deterministic Generation**
```typescript
// Generate same data twice for testing
const records1 = [];
for await (const record of generateData(schema, { count: 5, seed: 42 })) {
  records1.push(record);
}

const records2 = [];
for await (const record of generateData(schema, { count: 5, seed: 42 })) {
  records2.push(record);
}

// records1 and records2 are identical
console.assert(JSON.stringify(records1) === JSON.stringify(records2));
```

**Scenario 3: Error Handling**
```typescript
import { generateData } from '@testdata-ai/core';

const invalidSchema = `schema User { id: whoops }`;

try {
  for await (const record of generateData(invalidSchema, { count: 10 })) {
    console.log(record);
  }
} catch (error) {
  // ValidationError with diagnostics
  console.error('Schema validation failed:', error.diagnostics);
}
```

**Scenario 4: Large Dataset with Adapter**
```typescript
import { generateData, JsonAdapter } from '@testdata-ai/core';

const schema = `
schema Transaction {
  id: number @generate(randomInt, min: 1, max: 1000000)
  amount: number @generate(randomFloat, min: 0.01, max: 9999.99)
  timestamp: string @generate(randomString, length: 24)
}
`;

const adapter = new JsonAdapter({
  outputPath: 'transactions.json',
  format: 'jsonl', // Line-delimited for large datasets
  metadata: { sourcePattern: 'Transaction.td', count: 100000, seed: 999 }
});

// Generate 100k records and stream to file
await adapter.write(generateData(schema, { count: 100000, seed: 999 }));
console.log('Generated 100,000 records to transactions.json');
```

### 🔗 References

- [Project Context](file:///run/media/tobi/Data/testdata/testdata-ai/_bmad-output/planning-artifacts/project-context.md) - 45 critical implementation rules
- [Epic 3: Basic Data Generation](file:///run/media/tobi/Data/testdata/testdata-ai/_bmad-output/planning-artifacts/epics/epic-3-basic-data-generation.md) - Full epic context with all 6 stories
- [Previous Story 3.5](file:///run/media/tobi/Data/testdata/testdata-ai/_bmad-output/implementation-artifacts/3-5-json-output-adapter.md) - JSON Output Adapter implementation
- [Architecture: Core Decisions](file:///run/media/tobi/Data/testdata/testdata-ai/_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md) - Multi-pass pipeline, Result pattern
- [PRD](file:///run/media/tobi/Data/testdata/testdata-ai/_bmad-output/planning-artifacts/prd.md) - Product requirements and success criteria

### 🎯 Story Success Criteria

This story is complete when:
- [x] Public API `generateData(source, options)` exists and is exported
- [x] Function validates schema before generation (fail fast)
- [x] Invalid schemas return clear validation errors
- [x] Valid schemas generate records via AsyncIterable
- [x] Seed parameter supports deterministic generation
- [x] 1000 records generated in < 60 seconds (performance test passes)
- [x] 100k records work without memory issues (memory test passes)
- [x] Unit tests cover all acceptance criteria
- [x] Gherkin BDD tests cover all scenarios
- [x] Usage examples documented with code samples
- [x] Function exported from packages/core/src/index.ts

---

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

(To be filled by dev agent)

### Completion Notes List

(To be filled by dev agent)

### File List

(To be filled by dev agent)
