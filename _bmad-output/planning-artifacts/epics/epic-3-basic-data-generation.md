# Epic 3: Basic Data Generation

QA testers can generate simple test data from validated schemas with primitive field types and basic generators.

## Story 3.1: Custom PRNG - Xoshiro256\*\* Implementation

As a **developer**,
I want **a custom seeded pseudo-random number generator**,
So that **data generation is deterministic and independent of external libraries**.

**Acceptance Criteria:**

**Given** I need reproducible random number generation
**When** I implement Xoshiro256** in `packages/core/src/generator/rng.ts`
**Then** a `createRNG(seed?: number): RNG` function exists that initializes the PRNG
**And** the RNG instance provides `nextInt(): number` for 32-bit integers
**And** the RNG instance provides `nextFloat(): number` for values in [0, 1)
**And** the RNG instance provides `nextIntRange(min: number, max: number): number`
**And** the RNG instance provides `nextFloatRange(min: number, max: number): number`
**And** the same seed produces identical sequences across runs
**And** different seeds produce different sequences
**And** the implementation uses no external dependencies (no Faker.js)
**And** the algorithm follows the standard Xoshiro256** specification
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify deterministic behavior with specific seeds
**And** Gherkin tests verify reproducibility across multiple runs

## Story 3.2: Primitive Field Generators

As a **QA tester**,
I want **basic field generators for primitive data types**,
So that **I can generate integers, floats, strings, and booleans in my schemas**.

**Acceptance Criteria:**

**Given** I am defining fields in a DSL schema
**When** I implement primitive generators in `packages/core/src/generator/generators/primitives.ts`
**Then** a `randomInt(rng: RNG, min: number, max: number): number` generator exists
**And** a `randomFloat(rng: RNG, min: number, max: number): number` generator exists
**And** a `randomString(rng: RNG, length: number, charset?: string): string` generator exists
**And** a `randomBoolean(rng: RNG): boolean` generator exists
**And** all generators accept the RNG instance as first parameter for determinism
**And** generators validate input parameters (e.g., min <= max)
**And** string generator supports custom character sets (alpha, numeric, alphanumeric)
**And** default character set is alphanumeric
**And** a generator registry maps generator names to functions
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify each generator produces valid output
**And** Gherkin tests verify generators work with seeded RNG

## Story 3.3: Generator Engine - Record Creation

As a **developer**,
I want **an engine that generates complete records from validated schemas**,
So that **all fields are populated according to their generator definitions**.

**Acceptance Criteria:**

**Given** I have a validated schema with field definitions
**When** I implement the generator engine in `packages/core/src/generator/generator.ts`
**Then** a `generateRecord(schema: ValidatedSchema, rng: RNG): Record` function exists
**And** the function iterates through all fields in the schema
**And** for each field, the appropriate generator is invoked based on field type
**And** generator parameters from the schema are passed to the generator function
**And** generated values are assigned to the corresponding field in the output record
**And** the record is a plain JavaScript object with field names as keys
**And** all fields in the schema are present in the generated record
**And** the function handles generator errors gracefully with clear messages
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify record structure matches schema
**And** Gherkin tests verify field values are generated correctly

## Story 3.4: Streaming Generation with AsyncIterable

As a **QA tester**,
I want **to generate large datasets without running out of memory**,
So that **I can create millions of test records efficiently**.

**Acceptance Criteria:**

**Given** I need to generate a large number of records
**When** I implement streaming generation in `packages/core/src/generator/generator.ts`
**Then** an `async function* generate(schema: ValidatedProgram, options: GenerateOptions): AsyncIterable<Record>` function exists
**And** `GenerateOptions` includes `count: number` and `seed?: number` fields
**And** the function yields records one at a time using `yield`
**And** records are generated lazily (not all at once)
**And** the generator uses minimal memory regardless of count
**And** the function initializes RNG from the seed option
**And** the same seed produces identical sequences
**And** the function can generate 1 million+ records without memory issues (NFR3)
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify streaming behavior and memory efficiency
**And** Gherkin tests verify large-scale generation scenarios

## Story 3.5: JSON Output Adapter

As a **QA tester**,
I want **to output generated data as JSON files**,
So that **I can use the test data in my applications and test frameworks**.

**Acceptance Criteria:**

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

## Story 3.6: End-to-End Generation Pipeline

As a **QA tester**,
I want **to generate test data from DSL schemas with a simple API call**,
So that **I can quickly create test datasets for my testing scenarios**.

**Acceptance Criteria:**

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

---
