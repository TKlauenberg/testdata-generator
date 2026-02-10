# Story 3.5: JSON Output Adapter

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to output generated data as JSON files**,
So that **I can use the test data in my applications and test frameworks**.

## Acceptance Criteria

**Given** I have generated test data records
**When** I implement the JSON adapter in `packages/core/src/adapters/jsonAdapter.ts`
**Then** a `JsonAdapter` class exists implementing the adapter interface
**And** the adapter consumes `AsyncIterable<Record>` from the generator
**And** the adapter supports single-file JSON output (array format)
**And** the adapter supports line-delimited JSON output (JSONL format)
**And** the adapter includes generation metadata in the output header
**And** metadata includes: timestamp, sourcePattern, count, seed (if used)
**And** the adapter writes output incrementally to avoid memory issues
**And** the adapter properly handles JSON encoding (escaping special characters)
**And** the module exports through `packages/core/src/adapters/index.ts`
**And** unit tests verify JSON formatting correctness
**And** Gherkin tests verify output format matches specifications

## Tasks / Subtasks

- [x] Define adapter interface for all output formats (AC: 1)
  - [x] Create `IAdapter` interface in `adapters/types.ts`
  - [x] Define `write(records: AsyncIterable<Record>): Promise<void>` method
  - [x] Define metadata structure type
  - [x] Export interface from adapters/index.ts

- [x] Implement JsonAdapter class for array format (AC: 1, 2, 3, 5, 7, 8)
  - [x] Create `JsonAdapter` class implementing `IAdapter`
  - [x] Add constructor accepting output file path and options
  - [x] Add `format?: 'array' | 'jsonl'` option (default: 'array')
  - [x] Implement metadata generation with timestamp, sourcePattern, count, seed
  - [x] Implement `write()` method consuming AsyncIterable
  - [x] Write JSON array incrementally (opening bracket, records with commas, closing bracket)
  - [x] Use Bun's file writing APIs for streaming output
  - [x] Handle JSON string escaping correctly

- [x] Add JSONL format support (AC: 4)
  - [x] Check format option in write() method
  - [x] If 'jsonl', write each record as separate JSON line
  - [x] Include metadata as first line (special format or comment)
  - [x] No commas between records, newline-delimited only

- [x] Ensure incremental writing to avoid memory issues (AC: 7)
  - [x] Write metadata header first
  - [x] For each record from AsyncIterable, write immediately
  - [x] Don't buffer all records in memory
  - [x] Flush writes periodically

- [x] Export through module index (AC: 9)
  - [x] Export `JsonAdapter` class from jsonAdapter.ts
  - [x] Export `IAdapter` interface and types
  - [x] Re-export from packages/core/src/adapters/index.ts
  - [x] Re-export from packages/core/src/index.ts (public API)

- [x] Write comprehensive unit tests (AC: 10)
  - [x] Test: Array format produces valid JSON array
  - [x] Test: JSONL format produces valid newline-delimited JSON
  - [x] Test: Metadata includes all required fields
  - [x] Test: Incremental writing works with large datasets
  - [x] Test: Special characters are properly escaped
  - [x] Test: Empty record set produces valid output
  - [x] Test: Records with nested objects/arrays work correctly
  - [x] Test: File is created if doesn't exist
  - [x] Test: Proper error handling for write failures

- [x] Write Gherkin BDD tests (AC: 11)
  - [x] Scenario: Generate small dataset to JSON array
  - [x] Scenario: Generate dataset to JSONL format
  - [x] Scenario: Verify metadata in output
  - [x] Scenario: Large dataset written incrementally without memory issues
  - [x] Scenario: Output can be parsed by standard JSON parsers

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Continues Epic 3: Basic Data Generation**

Story 3.5 is the **output transformation layer** that converts streaming generated records into usable JSON files for QA testing. This builds directly on Story 3.4's `AsyncIterable<Record>` streaming infrastructure.

**Critical Mission:**
- Implement streaming JSON adapter that consumes AsyncIterable records
- Support both JSON array format (for small datasets) and JSONL format (for large datasets)
- Include generation metadata for traceability and reproducibility
- Write output incrementally to maintain memory efficiency from Story 3.4
- Properly escape JSON strings and handle edge cases
- Build the foundation for future CSV and SQL adapters (Story 10.1-10.2)

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Buffering all records in memory before writing (defeats streaming purpose)
- ❌ Using JSON.stringify() on entire array (memory explosion with large datasets)
- ❌ Not properly escaping special JSON characters (quotes, newlines, backslashes)
- ❌ Writing invalid JSON due to trailing commas or missing brackets
- ❌ Missing metadata or putting it in wrong location
- ❌ Not using Bun's native APIs (using Node.js fs instead)
- ❌ Not testing with large datasets to verify memory efficiency
- ❌ Creating adapters that aren't reusable by future CLI (Story 4.2)

### 🏗️ Architecture Requirements

**Output Format Requirements:**

**JSON Array Format (default):**
```json
{
  "metadata": {
    "timestamp": "2026-02-05T14:32:01.234Z",
    "sourcePattern": "User.td",
    "count": 1000,
    "seed": 12345,
    "version": "1.0.0"
  },
  "data": [
    {"id": 1, "name": "John Doe", "email": "john@test.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@test.com"}
  ]
}
```

**JSONL Format (for large datasets):**
```jsonl
{"_metadata":{"timestamp":"2026-02-05T14:32:01.234Z","sourcePattern":"User.td","count":1000,"seed":12345}}
{"id":1,"name":"John Doe","email":"john@test.com"}
{"id":2,"name":"Jane Smith","email":"jane@test.com"}
```

**Adapter Interface Pattern:**
```typescript
interface IAdapter {
  write(records: AsyncIterable<Record<string, unknown>>): Promise<void>;
}

interface AdapterMetadata {
  timestamp: string;          // ISO 8601 format
  sourcePattern?: string;     // Source schema file name
  count?: number;             // Expected record count (if known)
  seed?: number;              // RNG seed (if used)
  version: string;            // Generator version
}

interface JsonAdapterOptions {
  outputPath: string;
  format?: 'array' | 'jsonl';  // Default: 'array'
  metadata?: Partial<AdapterMetadata>;
}
```

**Streaming Write Pattern (CRITICAL for memory efficiency):**
```typescript
// ✅ CORRECT - Incremental writing
async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
  const file = await Bun.file(this.outputPath).writer();

  // Write opening for array format
  if (this.format === 'array') {
    await file.write('{"metadata":' + JSON.stringify(this.metadata) + ',"data":[');
  }

  let isFirst = true;
  for await (const record of records) {
    if (this.format === 'array') {
      if (!isFirst) await file.write(',');
      await file.write(JSON.stringify(record));
      isFirst = false;
    } else {
      // JSONL format
      await file.write(JSON.stringify(record) + '\n');
    }
  }

  // Write closing for array format
  if (this.format === 'array') {
    await file.write(']}');
  }

  await file.end();
}

// ❌ WRONG - Memory explosion
async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
  const allRecords = [];
  for await (const record of records) {
    allRecords.push(record);  // BAD: Accumulates all in memory!
  }
  await Bun.write(this.outputPath, JSON.stringify({
    metadata: this.metadata,
    data: allRecords  // BAD: Entire array in memory!
  }));
}
```

### Previous Story Intelligence

**From Story 3.4 (Streaming Generation) - COMPLETED:**

✅ **AsyncIterable Generator Available:**
```typescript
import { generate, type GenerateOptions } from '../generator';

/**
 * Streaming generator function - yields records lazily
 *
 * CRITICAL: Returns AsyncIterable<Record<string, unknown>>
 * CRITICAL: Records are NOT buffered - consumer must handle streaming
 *
 * @param program - Validated program from analyzer
 * @param options - Generation options (count, seed)
 * @returns AsyncIterable that yields records one at a time
 */
async function* generate(
  program: ValidatedProgram,
  options: GenerateOptions
): AsyncIterable<Record<string, unknown>>
```

✅ **Usage Pattern from Story 3.4:**
```typescript
const program: ValidatedProgram = /* from analyzer */;
const options: GenerateOptions = { count: 1000, seed: 12345 };

// Consume with for-await-of
for await (const record of generate(program, options)) {
  // Process record immediately, don't accumulate
  console.log(record);  // { id: 42, name: "AbCdEfGhIj", active: true }
}
```

✅ **Key Insights:**
- Generator yields records lazily (memory-efficient)
- Consumer MUST process records incrementally
- Perfect for adapter pattern: consume from generator, write to file immediately
- Don't accumulate records in array

**From Story 3.3 (Generator Engine) - COMPLETED:**

✅ **Record Structure:**
```typescript
type GeneratedRecord = Record<string, unknown>;

// Records are plain JavaScript objects
const record = {
  id: 42,
  name: "John Doe",
  email: "john@test.com",
  active: true,
  metadata: { created: "2026-02-05" }
};

// Nested objects and arrays are supported
const complexRecord = {
  user: { id: 1, name: "Jane" },
  orders: [
    { orderId: 101, total: 99.99 },
    { orderId: 102, total: 149.50 }
  ]
};
```

**From Story 2.5 (Semantic Analyzer) - COMPLETED:**

✅ **ValidatedProgram Structure:**
```typescript
interface ValidatedProgram {
  readonly node: ProgramNode;           // Original AST
  readonly schemas: ValidatedSchema[];  // Multiple schemas possible
  readonly sortedSchemas: ValidatedSchema[];
}

// For this story, focus on single schema generation
// CLI will handle multi-schema scenarios (Story 4.2)
```

### 🔬 Technology Stack Requirements

**Bun-Specific APIs (MUST USE):**

```typescript
// ✅ CORRECT - Use Bun's native file APIs
import { write } from 'bun';

// Streaming writer (preferred for large files)
const file = Bun.file('output.json').writer();
await file.write('some data');
await file.end();

// Simple write (ok for small files)
await Bun.write('output.json', 'content');

// ❌ WRONG - Don't use Node.js fs module
import * as fs from 'node:fs';  // AVOID THIS
```

**JSON Encoding Requirements:**
- Use `JSON.stringify()` for proper escaping
- No manual string escaping (error-prone)
- Handle nested objects/arrays correctly
- Test with special characters: quotes, newlines, backslashes, unicode

**TypeScript Requirements:**
- Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- Explicit return types for all public methods
- Use `readonly` for interface properties where appropriate
- Export types alongside implementations

### 📁 File Structure Requirements

**Create These Files:**
```
packages/core/src/adapters/
├── index.ts                 # Export IAdapter, JsonAdapter, types
├── types.ts                 # IAdapter interface, AdapterMetadata, options types
├── jsonAdapter.ts           # JsonAdapter implementation
└── jsonAdapter.test.ts      # Unit tests (co-located)
```

**Module Exports Pattern:**
```typescript
// packages/core/src/adapters/index.ts
export { JsonAdapter } from './jsonAdapter';
export type { IAdapter, AdapterMetadata, JsonAdapterOptions } from './types';

// packages/core/src/index.ts (public API)
export { JsonAdapter } from './adapters';
export type { IAdapter, AdapterMetadata, JsonAdapterOptions } from './adapters';
```

### 🧪 Testing Requirements

**Unit Test Coverage:**
- JSON array format produces valid JSON
- JSONL format produces valid newline-delimited JSON
- Metadata includes all fields (timestamp, sourcePattern, count, seed, version)
- Large datasets (100k records) write without memory issues
- Special characters are properly escaped (quotes, newlines, backslashes)
- Empty datasets produce valid output
- Nested objects and arrays are handled correctly
- File creation if doesn't exist
- Error handling for write failures

**Gherkin BDD Tests (MANDATORY):**
Create scenarios in `packages/core/features/data-generation.feature`:
- Generate small dataset to JSON array format
- Generate dataset to JSONL format
- Verify metadata presence and correctness
- Large dataset generation (10k+ records) without memory issues
- Output files can be parsed by standard JSON parsers

**Gherkin Test Pattern (Screenplay Architecture):**
```gherkin
Scenario: Generate test data to JSON file
  Given QA Tester has a validated schema for User records
  And QA Tester wants to generate 100 records
  When QA Tester generates data to JSON file "users.json"
  Then QA Tester should see JSON file "users.json" created
  And the JSON file should contain metadata
  And the JSON file should contain 100 user records
  And the JSON should be parsable by standard JSON parser
```

### 🎓 Learning from Recent Work

**Git Intelligence (Recent Commits):**

✅ **Commit ff116b8 (Story 3.3):** Established co-located test pattern
- Tests are in `*.test.ts` files alongside implementation
- ~223 unit tests for comprehensive coverage
- Good balance of happy path and edge cases

✅ **Commit d4a2c19 (Story 3.4):** Demonstrated streaming pattern
- Used `async function*` generators correctly
- Consumed with `for await (const record of generator)`
- Memory-efficient loop without buffering

✅ **Testing Pattern:**
- Unit tests use Bun's test framework (`describe`, `test`, `expect`)
- No imports needed for test functions (Bun provides them)
- BDD tests use Screenplay pattern (Abilities, Tasks, Questions)

### 🚀 Implementation Sequence

**Step 1: Define Types and Interface (Foundation)**
- Create `adapters/types.ts` with `IAdapter` interface
- Define `AdapterMetadata` type
- Define `JsonAdapterOptions` type
- Export from `adapters/index.ts`

**Step 2: Implement JsonAdapter for Array Format**
- Create `adapters/jsonAdapter.ts` with `JsonAdapter` class
- Implement constructor accepting options
- Implement metadata generation
- Implement `write()` method for array format
- Use Bun's streaming writer APIs
- Handle record iteration with for-await-of
- Write opening: `{"metadata":{...},"data":[`
- Write records with commas between (but not after last)
- Write closing: `]}`

**Step 3: Add JSONL Format Support**
- Check `format` option in constructor
- If 'jsonl', write metadata as first line
- Write each record as separate line (no commas)
- No opening/closing brackets needed

**Step 4: Export Through Module Hierarchy**
- Export class from jsonAdapter.ts
- Re-export from adapters/index.ts
- Re-export from packages/core/src/index.ts

**Step 5: Write Comprehensive Unit Tests**
- Create `adapters/jsonAdapter.test.ts`
- Test both array and JSONL formats
- Test metadata inclusion
- Test special character escaping
- Test large dataset streaming
- Test error cases

**Step 6: Write Gherkin BDD Tests**
- Add scenarios to `features/data-generation.feature`
- Use Screenplay pattern (Abilities, Tasks, Questions)
- Create step definitions (if needed)
- Verify acceptance criteria coverage

### 📚 Reference Sources

**Key Architecture Documents:**
- [Source: planning-artifacts/architecture/core-architectural-decisions.md#Output Streaming]
- [Source: planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Testing Patterns]
- [Source: planning-artifacts/project-context.md#Technology Stack]

**Related Stories:**
- [Source: implementation-artifacts/3-4-streaming-generation-with-asynciterable.md] - AsyncIterable pattern
- [Source: implementation-artifacts/3-3-generator-engine-record-creation.md] - Record structure

**Epic Context:**
- [Source: planning-artifacts/epics/epic-3-basic-data-generation.md#Story 3.5]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

- No critical issues encountered
- All tests passing (17 new unit tests, 6 type tests)
- Bun API usage corrected (file.write() not awaited, file.end() awaited)

### Completion Notes List

**Task 1: Adapter Interface**
✅ Created IAdapter interface with write() method accepting AsyncIterable<Record>
✅ Defined AdapterMetadata type with timestamp, sourcePattern, count, seed, version
✅ Defined JsonAdapterOptions type with outputPath, format, metadata
✅ All types properly exported through adapters/index.ts

**Task 2-4: JsonAdapter Implementation**
✅ Implemented JsonAdapter class with both array and JSONL formats
✅ Constructor with JsonAdapterOptions parameter, defaults to array format
✅ Metadata generation with ISO timestamp and version
✅ Incremental streaming write using Bun.file().writer() - NO memory buffering
✅ Proper JSON escaping via JSON.stringify()
✅ Array format: {"metadata":{...},"data":[...]} structure
✅ JSONL format: Metadata first line, then one record per line

**Task 5: Module Exports**
✅ Exported through packages/core/src/adapters/index.ts
✅ Re-exported through packages/core/src/index.ts (public API)

**Task 6: Unit Tests**
✅ 17 comprehensive unit tests covering:
  - Array format validation
  - JSONL format validation
  - Metadata inclusion and structure
  - Large dataset streaming (10k records)
  - Special character escaping (quotes, newlines, backslashes)
  - Empty datasets
  - Nested objects and arrays
  - Error handling
✅ All tests passing

**Task 7: Gherkin BDD Tests**
✅ Added 5 scenarios to data-generation.feature
✅ Created Screenplay pattern support:
  - UseJsonAdapter ability
  - WriteRecordsToJson, ConfigureGeneration tasks
  - JsonFileExists, JsonFileContent, JsonMetadata, JsonIsParsable questions
✅ Scenarios cover all AC requirements

### File List

**Created Files:**
- packages/core/src/adapters/types.ts
- packages/core/src/adapters/types.test.ts
- packages/core/src/adapters/jsonAdapter.ts
- packages/core/src/adapters/jsonAdapter.test.ts
- packages/core/src/adapters/index.ts
- packages/core/features/support/abilities/UseJsonAdapter.ts
- packages/core/features/support/tasks/JsonAdapterTasks.ts
- packages/core/features/support/questions/JsonAdapterQuestions.ts

**Modified Files:**
- packages/core/src/index.ts (added adapters export)
- packages/core/features/data-generation.feature (added 5 scenarios)
- _bmad-output/implementation-artifacts/sprint-status.yaml (updated story status to review)
