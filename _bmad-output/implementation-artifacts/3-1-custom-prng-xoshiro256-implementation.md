# Story 3.1: Custom PRNG - Xoshiro256** Implementation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a custom seeded pseudo-random number generator**,
So that **data generation is deterministic and independent of external libraries**.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Implement Xoshiro256** core algorithm (AC: 1, 2, 3, 9, 10)
  - [x] Create `packages/core/src/generator/rng.ts` file
  - [x] Define RNG interface with required methods
  - [x] Implement SplitMix64 seeding algorithm for state initialization
  - [x] Implement Xoshiro256** state transition with rotl helper
  - [x] Add state management with BigUint64Array (4x 64-bit values)

- [x] Implement RNG factory function (AC: 1)
  - [x] Create `createRNG(seed?: number): RNG` factory
  - [x] Handle optional seed parameter (generate default if not provided)
  - [x] Convert number seed to bigint for internal use
  - [x] Return configured RNG instance

- [x] Implement core random methods (AC: 2, 3, 4, 5)
  - [x] Implement `nextInt(): number` returning 32-bit integers
  - [x] Implement `nextFloat(): number` using upper 53 bits for IEEE 754 precision
  - [x] Implement `nextIntRange(min: number, max: number): number` with rejection sampling
  - [x] Implement `nextFloatRange(min: number, max: number): number` for floating ranges
  - [x] Validate input parameters (min <= max, finite numbers)

- [x] Export through module index (AC: 11)
  - [x] Create/update `packages/core/src/generator/index.ts`
  - [x] Export `createRNG` function
  - [x] Export `RNG` interface type
  - [x] Follow project barrel export patterns

- [x] Write comprehensive unit tests (AC: 12)
  - [x] Create `packages/core/src/generator/rng.test.ts`
  - [x] Test: Same seed produces identical sequences (10+ values)
  - [x] Test: Different seeds produce different sequences
  - [x] Test: nextFloat() returns values in [0, 1) range
  - [x] Test: nextIntRange() respects min/max bounds
  - [x] Test: nextFloatRange() respects min/max bounds
  - [x] Test: Parameter validation (min > max throws/returns error)
  - [x] Test: Default seed generation when seed omitted
  - [x] Test: State transitions follow Xoshiro256** spec

- [x] Write Gherkin BDD tests (AC: 13)
  - [x] Create `packages/core/features/prng-determinism.feature`
  - [x] Scenario: Same seed produces identical random sequences
  - [x] Scenario: Different seeds produce different sequences
  - [x] Scenario: Random floats distributed uniformly in [0, 1)
  - [x] Scenario: Random integers respect specified ranges
  - [x] Scenario: Large sequence generation maintains determinism
  - [x] Implement step definitions using Screenplay pattern
  - [x] Create appropriate Abilities/Tasks/Questions components

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Begins Epic 3: Basic Data Generation**

This is the **foundation story** for the entire data generation subsystem. It implements the custom PRNG that ensures:
- Deterministic, reproducible test data generation
- Zero external dependencies for core generation logic
- Cross-platform and cross-runtime compatibility
- Foundation for all future field generators in stories 3.2-3.6

**Critical Mission:**
- Implement Xoshiro256** PRNG algorithm correctly from specification
- Ensure perfect determinism (same seed = identical output always)
- Provide clean, testable API for all generator functions
- NO external libraries (Math.random, Faker.js, etc.)
- Build the bedrock for Epic 3's generator ecosystem

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Using Math.random() or any non-deterministic sources
- ❌ Incorrect bitwise operations causing non-standard behavior
- ❌ Not using rejection sampling (modulo bias in range generation)
- ❌ Losing precision in float generation (not using upper 53 bits)
- ❌ Forgetting to mask/truncate to 64-bit bounds (JavaScript number limitations)
- ❌ Not validating that sequences match reference implementation
- ❌ Mixing up seed initialization (must use SplitMix64, not direct state setting)

### Previous Story Intelligence

**From Story 2.6 (End-to-End Schema Validation) - COMPLETED:**

✅ **Validation Pipeline Established:**
```typescript
// Public API we'll eventually integrate with
export function validateSchema(source: string, filename: string): Result<ValidatedProgram>;

// Result type pattern - WE MUST USE THIS
type Result<T> = { ok: true; value: T } | { ok: false; errors: Diagnostic[] };
```

✅ **Key Patterns to Follow:**
- Result type for all fallible operations
- Pure functions with no side effects
- Comprehensive error handling with clear messages
- Co-located test files (rng.test.ts alongside rng.ts)
- Export through index.ts barrel exports

✅ **Testing Standards:**
- Unit tests verify correctness and edge cases
- Gherkin tests verify acceptance criteria and user scenarios
- Performance testing for scale requirements
- Determinism testing with multiple runs

**From Epic 2 Retrospective - Key Learnings:**

✅ **What Worked Well:**
- Clear separation of concerns (scanner/parser/analyzer)
- Result type pattern eliminated exception chaos
- Co-located tests improved discoverability
- Immutable data structures simplified reasoning

✅ **Patterns to Continue:**
- Start with type definitions (RNG interface first)
- Implement core algorithm before convenience methods
- Test determinism exhaustively (it's our core promise)
- Document algorithm sources and specifications

**Git Intelligence - Recent Work Patterns:**

Recent commits show focus on validation infrastructure:
- Completed all of Epic 2 (DSL parsing and validation)
- Strong emphasis on comprehensive error handling
- Pattern of pure functions with Result returns
- Consistent use of readonly/immutable patterns

**No generator/ directory exists yet** - we're creating the foundation module structure.

### Architecture Compliance Requirements

**From Core Architectural Decisions:**

**🏗️ Generator Architecture - Random Number Generation:**

**Decision:** Custom PRNG (Xoshiro256**) - No External Dependencies

**Critical Implementation Requirements:**

1. **Algorithm Specification:**
```typescript
/**
 * Xoshiro256** PRNG
 * Reference: https://prng.di.unimi.it/xoshiro256starstar.c
 *
 * State: 4x 64-bit unsigned integers (256 bits total)
 * Output: 64-bit unsigned integer
 * Period: 2^256 - 1
 */

// State transition (THIS MUST BE EXACT):
result = rotl(s[1] * 5, 7) * 9
t = s[1] << 17
s[2] ^= s[0]
s[3] ^= s[1]
s[1] ^= s[2]
s[0] ^= s[3]
s[2] ^= t
s[3] = rotl(s[3], 45)
return result

// Rotation function:
rotl(x, k) = (x << k) | (x >> (64 - k))
```

2. **Seed Initialization (SplitMix64):**
```typescript
/**
 * MUST use SplitMix64 to generate initial state from seed
 * This ensures seed -> deterministic state mapping
 *
 * Algorithm:
 * For each of 4 state values:
 *   s += 0x9e3779b97f4a7c15
 *   z = s
 *   z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9
 *   z = (z ^ (z >> 27)) * 0x94d049bb133111eb
 *   state[i] = z ^ (z >> 31)
 */
```

3. **JavaScript BigInt Requirements:**
```typescript
// CRITICAL: JavaScript numbers are 64-bit floats, NOT 64-bit integers
// MUST use BigInt for all state operations
private state: BigUint64Array;  // Use typed array for efficiency

// All arithmetic operations need BigInt literals and masking:
const result = (this.state[1] * 5n) & 0xFFFFFFFFFFFFFFFFn;
```

4. **Float Generation (IEEE 754 Precision):**
```typescript
/**
 * Generate float in [0, 1) with proper precision
 *
 * CRITICAL: Use upper 53 bits (IEEE 754 double precision mantissa)
 * DO NOT use: value / MAX_UINT64 (loses precision)
 * DO USE: (value >> 11) * (1.0 / 2^53)
 */
nextFloat(): number {
  const value = this.next();
  const upper53 = Number(value >> 11n);
  return upper53 * (1.0 / 9007199254740992); // 1.0 / 2^53
}
```

5. **Range Generation (Rejection Sampling):**
```typescript
/**
 * Generate int in [min, max] WITHOUT modulo bias
 *
 * CRITICAL: Use rejection sampling, not simple modulo
 * Modulo bias: value % range creates uneven distribution
 *
 * Solution: Reject values in the biased zone
 */
nextIntRange(min: number, max: number): number {
  const range = BigInt(max - min + 1);
  const limit = 0xFFFFFFFFFFFFFFFFn - (0xFFFFFFFFFFFFFFFFn % range);

  let value: bigint;
  do {
    value = this.next();
  } while (value >= limit); // Reject values in biased zone

  return min + Number(value % range);
}
```

**From Implementation Patterns & Consistency Rules:**

**File Structure:**
```
packages/core/src/generator/
├── index.ts           # PUBLIC: export { createRNG } from './rng'
├── rng.ts             # IMPLEMENTATION: Xoshiro256** + RNG interface
└── rng.test.ts        # TESTS: Co-located unit tests
```

**Interface Design:**
```typescript
// RNG Interface - pure, stateful object with pure methods
export interface RNG {
  // Core methods (REQUIRED)
  nextInt(): number;        // Returns 32-bit unsigned integer
  nextFloat(): number;      // Returns float in [0, 1)

  // Convenience methods (REQUIRED)
  nextIntRange(min: number, max: number): number;    // [min, max] inclusive
  nextFloatRange(min: number, max: number): number;  // [min, max)
}

// Factory function (PUBLIC API)
export function createRNG(seed?: number): RNG;
```

**Naming Conventions:**
- File: `rng.ts` (camelCase)
- Class/Interface: `RNG` (acronym as word, PascalCase acceptable)
- Private members: `private _state` (keyword + underscore)
- Factory function: `createRNG` (camelCase)

**Testing Requirements:**
- Unit tests in `rng.test.ts` (co-located)
- Gherkin tests in `packages/core/features/prng-determinism.feature`
- Test determinism with at least 10 values per sequence
- Test different seeds produce different outputs
- Test range bounds and precision

### Technical Specifications from Spike

**From `spike/xoshiro256-prng-validation.ts` - PROOF OF CONCEPT:**

✅ **Validated Implementation Approach:**

The spike proves:
1. Xoshiro256** can be implemented in TypeScript with BigInt
2. Same seed produces identical sequences (determinism confirmed)
3. Different seeds produce different sequences (independence confirmed)
4. Float distribution is uniform in [0, 1)
5. Integer range generation works correctly

**Key Implementation Insights from Spike:**

```typescript
// ✅ Correct state representation
private state: BigUint64Array;

// ✅ Correct initialization pattern
constructor(seed: bigint) {
  this.state = new BigUint64Array(4);
  this.seed(seed);  // Use SplitMix64
}

// ✅ Correct state transition with masking
next(): bigint {
  const result = this.rotl(this.state[1] * 5n, 7) * 9n;
  const t = this.state[1] << 17n;

  this.state[2] ^= this.state[0];
  this.state[3] ^= this.state[1];
  this.state[1] ^= this.state[2];
  this.state[0] ^= this.state[3];

  this.state[2] ^= t;
  this.state[3] = this.rotl(this.state[3], 45);

  return result & 0xFFFFFFFFFFFFFFFFn;  // CRITICAL: Mask to 64-bit
}

// ✅ Correct rotation with masking
private rotl(x: bigint, k: number): bigint {
  const kb = BigInt(k);
  return ((x << kb) | (x >> (64n - kb))) & 0xFFFFFFFFFFFFFFFFn;
}
```

**⚠️ Spike is Proof-of-Concept Only:**
- DO NOT copy spike code directly
- Spike uses class-based approach, production should match project patterns
- Spike lacks proper error handling and validation
- Spike needs integration with Result type pattern
- Production needs comprehensive test coverage beyond spike validation

**Differences from Spike for Production:**

1. **API Design:**
```typescript
// ❌ Spike: Direct class instantiation
const rng = new Xoshiro256StarStar(seed);

// ✅ Production: Factory function
const rng = createRNG(seed);
```

2. **Error Handling:**
```typescript
// ❌ Spike: No validation
nextIntRange(min, max) // What if min > max?

// ✅ Production: Validate inputs
nextIntRange(min: number, max: number): number {
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers');
  }
  // ... implementation
}
```

3. **Default Seed Handling:**
```typescript
// ❌ Spike: Always requires seed
const rng = new Xoshiro256StarStar(12345n);

// ✅ Production: Optional seed with reasonable default
const rng = createRNG();  // Generate default seed from Date.now()
```

4. **Type Safety:**
```typescript
// ❌ Spike: Accepts bigint only
constructor(seed: bigint)

// ✅ Production: Accept number, convert internally
function createRNG(seed?: number): RNG {
  const seedBigInt = seed !== undefined ? BigInt(seed) : generateDefaultSeed();
  // ...
}
```

### Library & Framework Requirements

**NO External Dependencies for RNG:**

```json
{
  "dependencies": {
    // ✅ NONE - RNG must be self-contained
  }
}
```

**Rationale (from Architecture):**
- **Independence**: No Faker.js or random-js dependencies
- **Portability**: Can migrate to Rust/Go later with identical output
- **Backwards Compatibility**: Same seed = same data forever
- **Control**: Full control over algorithms and distribution

**Built-in APIs We CAN Use:**
- `BigInt` / `BigUint64Array` (ES2020, supported by Bun)
- `Number.isFinite()`, `Number.MAX_SAFE_INTEGER`
- `Date.now()` (ONLY for default seed generation, not in RNG itself)

**Built-in APIs We CANNOT Use in RNG:**
- ❌ `Math.random()` (non-deterministic)
- ❌ `crypto.randomBytes()` (non-deterministic)
- ❌ Any system time/random sources inside RNG methods

### File Structure Requirements

**Module Organization:**

```
packages/core/src/generator/
├── index.ts                   # ⬅️ CREATE: Public exports
├── rng.ts                     # ⬅️ CREATE: RNG implementation
├── rng.test.ts                # ⬅️ CREATE: Unit tests
└── (future stories will add more files here)
```

**index.ts - Public API:**
```typescript
/**
 * Generator Module
 *
 * Provides deterministic data generation capabilities.
 *
 * @module generator
 */

export { createRNG, type RNG } from './rng';

// Future exports from other stories:
// export { randomInt, randomFloat, randomString, randomBoolean } from './generators/primitives';
// export { generateRecord } from './generator';
// export { generate } from './generator';
```

**Integration Points:**

- **Exports to:** Stories 3.2-3.6 will import RNG interface
- **Used by:** Future primitive generators (story 3.2)
- **Imported from:** None (foundational module)

### Testing Standards Summary

**Unit Test Requirements (Bun Test):**

```typescript
// packages/core/src/generator/rng.test.ts

import { describe, it, expect } from 'bun:test';
import { createRNG } from './rng';

describe('createRNG', () => {
  it('should create RNG with provided seed', () => {
    const rng = createRNG(12345);
    expect(rng).toBeDefined();
    expect(typeof rng.nextInt).toBe('function');
  });

  it('should create RNG with default seed when omitted', () => {
    const rng = createRNG();
    expect(rng).toBeDefined();
  });
});

describe('RNG determinism', () => {
  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const sequence1 = Array.from({ length: 20 }, () => rng1.nextFloat());
    const sequence2 = Array.from({ length: 20 }, () => rng2.nextFloat());

    expect(sequence1).toEqual(sequence2);
  });

  it('should produce different sequences with different seeds', () => {
    const rng1 = createRNG(11111);
    const rng2 = createRNG(22222);

    const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(sequence1).not.toEqual(sequence2);
  });
});

describe('RNG.nextFloat', () => {
  it('should return values in [0, 1)', () => {
    const rng = createRNG(42);

    for (let i = 0; i < 1000; i++) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should produce uniform distribution', () => {
    const rng = createRNG(12345);
    const values = Array.from({ length: 10000 }, () => rng.nextFloat());
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Average should be close to 0.5 (within 5%)
    expect(Math.abs(avg - 0.5)).toBeLessThan(0.05);
  });
});

describe('RNG.nextIntRange', () => {
  it('should return values within specified range', () => {
    const rng = createRNG(777);
    const min = 1;
    const max = 6;

    for (let i = 0; i < 600; i++) {
      const value = rng.nextIntRange(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it('should throw error if min > max', () => {
    const rng = createRNG(42);
    expect(() => rng.nextIntRange(10, 5)).toThrow();
  });

  it('should handle edge case: min === max', () => {
    const rng = createRNG(42);
    expect(rng.nextIntRange(5, 5)).toBe(5);
  });
});
```

**Gherkin Test Requirements (BDD):**

```gherkin
# packages/core/features/prng-determinism.feature

Feature: PRNG Deterministic Generation
  As a developer
  I want a deterministic pseudo-random number generator
  So that I can generate reproducible test data

  Background:
    Given the testdata-ai core library is initialized

  @prng @determinism
  Scenario: Same seed produces identical sequences
    Given Developer creates RNG with seed 12345
    And Developer generates 20 random floats from RNG A
    When Developer creates another RNG with seed 12345
    And Developer generates 20 random floats from RNG B
    Then the sequences from RNG A and RNG B should be identical

  @prng @independence
  Scenario: Different seeds produce different sequences
    Given Developer creates RNG with seed 11111
    And Developer generates 10 random floats from RNG A
    When Developer creates RNG with seed 22222
    And Developer generates 10 random floats from RNG B
    Then the sequences from RNG A and RNG B should be different

  @prng @distribution
  Scenario: Random floats are uniformly distributed
    Given Developer creates RNG with seed 99999
    When Developer generates 10000 random floats
    Then the average should be approximately 0.5 with 5% tolerance
    And all values should be in the range [0, 1)

  @prng @ranges
  Scenario: Integer ranges are respected
    Given Developer creates RNG with seed 777
    When Developer generates 600 random integers between 1 and 6
    Then all generated integers should be between 1 and 6 inclusive
    And each value (1-6) should appear at least once
```

**Screenplay Pattern Components (to implement):**

```typescript
// packages/core/features/abilities/UsePRNG.ts
export class UsePRNG {
  static withCoreLibrary() {
    return new UsePRNG();
  }

  createRNG(seed: number): RNG {
    return createRNG(seed);
  }
}

// packages/core/features/tasks/GenerateRandomSequence.ts
export class GenerateRandomSequence {
  static ofFloats(count: number) {
    return new GenerateRandomSequence('float', count);
  }

  static ofIntegers(count: number, min: number, max: number) {
    return new GenerateRandomSequence('integer', count, min, max);
  }

  // Implementation...
}

// packages/core/features/questions/RandomSequence.ts
export class RandomSequence {
  static values(): Question<number[]> {
    // Return generated sequence
  }

  static average(): Question<number> {
    // Calculate average of sequence
  }
}
```

### Performance Requirements

**From Architecture (NFR3):**
- RNG must generate 1 million+ numbers without memory issues
- Each call should be O(1) with minimal allocations
- State transitions should be efficient (avoid unnecessary BigInt conversions)

**Optimization Guidelines:**
- ✅ Use `BigUint64Array` for state (typed array, efficient memory)
- ✅ Minimize BigInt ↔ Number conversions (only when necessary)
- ✅ Keep methods pure and side-effect free (enables optimization)
- ❌ Don't allocate new objects per call
- ❌ Don't use string formatting in hot paths

### Cross-Story Dependencies

**Blocking Dependencies:** NONE - This is the first story in Epic 3

**Blocked Stories:**
- Story 3.2 (Primitive Field Generators) - Depends on RNG interface
- Story 3.3 (Generator Engine) - Depends on RNG interface
- Story 3.4 (Streaming Generation) - Depends on RNG determinism
- All future generator stories - Foundation for entire Epic 3

**Integration Plan:**
1. Story 3.1: Create RNG foundation ⬅️ **YOU ARE HERE**
2. Story 3.2: Build primitive generators using RNG
3. Story 3.3: Orchestrate record generation with generators
4. Story 3.4: Add streaming for large datasets
5. Story 3.5: Add JSON output adapter
6. Story 3.6: Connect end-to-end pipeline

### Definition of Done

**Code Complete:**
- ✅ `rng.ts` implements RNG interface with all required methods
- ✅ `createRNG()` factory function works with optional seed
- ✅ Xoshiro256** algorithm matches specification exactly
- ✅ SplitMix64 seeding produces correct initial state
- ✅ All methods properly validated with error handling
- ✅ No external dependencies (zero imports from npm)
- ✅ Exported through `generator/index.ts`

**Tests Complete:**
- ✅ Unit tests in `rng.test.ts` cover all methods and edge cases
- ✅ Determinism tests verify same seed = identical sequences
- ✅ Independence tests verify different seeds = different sequences
- ✅ Range tests verify bounds respected for int/float ranges
- ✅ Distribution tests verify uniform randomness
- ✅ Gherkin `.feature` file with all acceptance criteria scenarios
- ✅ Screenplay step definitions implemented
- ✅ All tests pass: `bun test`

**Documentation Complete:**
- ✅ TSDoc comments on all public functions and interfaces
- ✅ Algorithm sources cited (xoshiro256starstar.c)
- ✅ Usage examples in comments
- ✅ Spike learnings documented in dev notes

**Quality Complete:**
- ✅ Lint passes: `bun run lint`
- ✅ Format applied: `bun run format`
- ✅ No console.log statements left in code
- ✅ Private members use `private` keyword + underscore
- ✅ Follows all naming conventions (camelCase files, etc.)

**Integration Complete:**
- ✅ Story status updated to "review" when complete
- ✅ Ready for Story 3.2 to consume RNG interface
- ✅ Module structure established for future generators

### References

**Core Specifications:**
- [Source: _bmad-output/planning-artifacts/epics/epic-3-basic-data-generation.md]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#random-number-generation-custom-prng-implementation]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]

**Xoshiro256** Algorithm:**
- [Official Reference: https://prng.di.unimi.it/xoshiro256starstar.c]
- [Paper: Scrambled Linear Pseudorandom Number Generators, Blackman & Vigna]
- [Proof-of-Concept: spike/xoshiro256-prng-validation.ts]

**Related Stories:**
- [Previous: Story 2.6 - End-to-End Schema Validation] (_bmad-output/implementation-artifacts/2-6-end-to-end-schema-validation.md)
- [Next: Story 3.2 - Primitive Field Generators] (Not yet created)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (via GitHub Copilot)

### Debug Log References

No issues encountered during implementation.

### Code Review (Senior Developer AI - 2026-02-03)

**Review Status:** ✅ APPROVED WITH FIXES APPLIED

**Issues Found:** 2 High, 3 Medium, 2 Low  
**Issues Fixed:** 5 High/Medium (100%)  
**Tests Added:** 9 new edge case tests  
**Test Results:** 279/279 pass (was 270) - 0 regressions

#### Issues Identified and Resolved

**🔴 HIGH SEVERITY - FIXED:**

1. **Integer Overflow Risk in nextIntRange** ✅ FIXED
   - **Problem:** When range spans > MAX_SAFE_INTEGER, subtraction lost precision before BigInt conversion
   - **Fix:** Convert to BigInt before subtraction; added validation for ranges exceeding UINT64_MAX
   - **Location:** [rng.ts](../packages/core/src/generator/rng.ts#L179-L189)

2. **Missing Edge Case Test Coverage** ✅ FIXED
   - **Problem:** No tests for negative seeds, MAX_SAFE_INTEGER, nextIntRange(0,0), invalid seed errors
   - **Fix:** Added 9 comprehensive edge case tests
   - **Tests Added:**
     - Negative seed values (works correctly)
     - MAX_SAFE_INTEGER and MIN_SAFE_INTEGER seeds
     - NaN/Infinity/float seed validation errors
     - nextIntRange(0, 0) edge case
     - Improved distribution test tolerance (30% → 25%)

**🟡 MEDIUM SEVERITY - FIXED:**

3. **Poor Error Messages for Invalid Seeds** ✅ FIXED
   - **Problem:** BigInt constructor errors were cryptic ("Not an integer")
   - **Fix:** Added explicit validation with clear error messages before BigInt conversion
   - **Location:** [rng.ts](../packages/core/src/generator/rng.ts#L240-L251)

4. **Magic Numbers Without Named Constants** ✅ FIXED
   - **Problem:** `0xffffffffffffffffn` appeared 14+ times, `9007199254740992` was unexplained
   - **Fix:** Extracted 13 algorithm constants with explanatory comments
   - **Constants:** UINT64_MAX, TWO_POW_53, SPLITMIX64_*, XOSHIRO_*, BITS_*
   - **Location:** [rng.ts](../packages/core/src/generator/rng.ts#L14-L30)

5. **Missing JSDoc @throws Documentation** ✅ FIXED
   - **Problem:** Methods throw errors but didn't document them
   - **Fix:** Added `@throws` tags to createRNG, nextIntRange, nextFloatRange
   - **Location:** [rng.ts](../packages/core/src/generator/rng.ts#L156, #L197, #L222)

**🟢 LOW SEVERITY - ADDRESSED:**

6. **Test Distribution Tolerance**
   - Improved from 30% to 25% tolerance for better distribution validation

7. **Performance Benchmarks**
   - Existing "large sequence generation" test validates 100,000 operations
   - Additional benchmark not required for MVP

#### Review Summary

**Strengths:**
- ✅ All 13 Acceptance Criteria fully implemented
- ✅ Algorithm implementation matches Xoshiro256** specification exactly
- ✅ Comprehensive test coverage (42 unit tests, 5 Gherkin scenarios)
- ✅ Zero external dependencies as required
- ✅ Proper use of BigInt for 64-bit operations
- ✅ Correct rejection sampling for unbiased ranges
- ✅ Architecture compliance (naming, structure, pure functions)

**Improvements Applied:**
- Named constants improve maintainability
- Better seed validation with clear error messages
- Integer overflow protection for large ranges
- Enhanced edge case test coverage
- Improved JSDoc documentation

**Final Assessment:** Implementation is production-ready. All critical and medium issues resolved. Story ready for "done" status.

### Completion Notes List

**✅ Implementation Complete (2026-02-03)**

**Core Implementation:**
- Implemented Xoshiro256** PRNG algorithm per specification
- SplitMix64 seeding ensures deterministic state initialization
- BigUint64Array state management for 64-bit operations
- Proper masking to handle JavaScript number limitations

**Public API:**
```typescript
export function createRNG(seed?: number): RNG
export interface RNG {
  nextInt(): number
  nextFloat(): number
  nextIntRange(min: number, max: number): number
  nextFloatRange(min: number, max: number): number
}
```

**Key Implementation Details:**
- Upper 53 bits used for nextFloat() to maintain IEEE 754 precision
- Rejection sampling in nextIntRange() avoids modulo bias
- Comprehensive input validation (min/max, finite, integers)
- Default seed generation from Date.now() when seed omitted
- No external dependencies - fully self-contained

**Testing:**
- 33 unit tests pass (100%)
- 5 Gherkin BDD scenarios pass with 68 total scenarios
- Determinism verified: same seed = identical sequences
- Distribution tested: uniform randomness confirmed
- Range bounds verified: all values within specified limits
- Large sequence tested: 100,000 values maintain determinism

**Screenplay Pattern Components Created:**
- UsePRNG Ability - grants actors RNG capabilities
- GenerateRandomSequence Tasks - ofFloats(), ofIntegers()
- PRNGQuestions - verify sequences, ranges, distributions
- Updated TestCast to grant UsePRNG ability to all actors

**Files Created:**
- packages/core/src/generator/rng.ts (215 lines)
- packages/core/src/generator/index.ts (9 lines)
- packages/core/src/generator/rng.test.ts (362 lines)
- packages/core/features/prng-determinism.feature (47 lines)
- packages/core/features/support/abilities/UsePRNG.ts (65 lines)
- packages/core/features/support/tasks/PRNGTasks.ts (57 lines)
- packages/core/features/support/questions/PRNGQuestions.ts (120 lines)
- packages/core/features/step_definitions/prng.steps.ts (80 lines)

**Test Results:**
```
Unit Tests: 33/33 pass (5970 assertions)
Gherkin Tests: 5/5 scenarios pass (391 steps total)
Full Suite: 270 tests pass (6713 assertions)
Regression: None - all existing tests pass
```

### File List

- packages/core/src/generator/rng.ts
- packages/core/src/generator/index.ts
- packages/core/src/generator/rng.test.ts
- packages/core/features/prng-determinism.feature
- packages/core/features/support/abilities/UsePRNG.ts
- packages/core/features/support/tasks/PRNGTasks.ts
- packages/core/features/support/questions/PRNGQuestions.ts
- packages/core/features/support/screenplay/Actors.ts
- packages/core/features/step_definitions/prng.steps.ts
