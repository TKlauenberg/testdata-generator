# Story 3.2: Primitive Field Generators

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **basic field generators for primitive data types**,
So that **I can generate integers, floats, strings, and booleans in my schemas**.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Create generator module structure (AC: 10)
  - [x] Create `packages/core/src/generator/generators/` directory
  - [x] Create `primitives.ts` in generators directory
  - [x] Create `index.ts` in generators directory for public exports

- [x] Implement randomInt generator (AC: 1, 5, 6)
  - [x] Create `randomInt(rng: RNG, min: number, max: number): number` function
  - [x] Validate min <= max, throw descriptive error if invalid
  - [x] Validate min and max are finite numbers
  - [x] Validate min and max are integers (no fractions)
  - [x] Delegate to `rng.nextIntRange(min, max)` for actual generation
  - [x] Add JSDoc comments explaining parameters and return value
  - [x] Export from primitives.ts

- [x] Implement randomFloat generator (AC: 2, 5, 6)
  - [x] Create `randomFloat(rng: RNG, min: number, max: number): number` function
  - [x] Validate min <= max, throw descriptive error if invalid
  - [x] Validate min and max are finite numbers
  - [x] Delegate to `rng.nextFloatRange(min, max)` for actual generation
  - [x] Add JSDoc comments explaining parameters and return value
  - [x] Export from primitives.ts

- [x] Implement randomBoolean generator (AC: 4, 5)
  - [x] Create `randomBoolean(rng: RNG): boolean` function
  - [x] Use `rng.nextFloat() < 0.5` for fair 50/50 distribution
  - [x] Add JSDoc comments explaining behavior
  - [x] Export from primitives.ts

- [x] Implement randomString generator (AC: 3, 5, 6, 7, 8)
  - [x] Define character set constants:
    - [x] CHARSET_ALPHA: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    - [x] CHARSET_NUMERIC: '0123456789'
    - [x] CHARSET_ALPHANUMERIC: CHARSET_ALPHA + CHARSET_NUMERIC (default)
  - [x] Create `randomString(rng: RNG, length: number, charset?: string): string` function
  - [x] Validate length is positive integer
  - [x] Use CHARSET_ALPHANUMERIC as default if charset not provided
  - [x] Validate charset is non-empty string
  - [x] Generate string by selecting random characters from charset
  - [x] Use `rng.nextIntRange(0, charset.length - 1)` to pick indices
  - [x] Build string efficiently (array join vs repeated concatenation)
  - [x] Add JSDoc comments explaining parameters, defaults, and examples
  - [x] Export from primitives.ts and export charset constants

- [x] Implement generator registry (AC: 9)
  - [x] Create `GeneratorFunction` type definition
  - [x] Create `GeneratorRegistry` type as Map<string, GeneratorFunction>
  - [x] Create and export `GENERATOR_REGISTRY` constant with mappings:
    - [x] 'int' | 'integer' → randomInt
    - [x] 'float' | 'double' | 'number' → randomFloat
    - [x] 'string' | 'text' → randomString
    - [x] 'bool' | 'boolean' → randomBoolean
  - [x] Export registry and types

- [x] Export through module index (AC: 10)
  - [x] Update `packages/core/src/generator/generators/index.ts`
  - [x] Export all generator functions
  - [x] Export character set constants
  - [x] Export registry and types
  - [x] Update `packages/core/src/generator/index.ts` to re-export generators

- [x] Write comprehensive unit tests (AC: 11)
  - [x] Create `packages/core/src/generator/generators/primitives.test.ts`
  - [x] Test randomInt:
    - [x] Generates integers within specified range
    - [x] Same seed produces identical sequences
    - [x] Min equals max returns that value
    - [x] Invalid parameters throw errors (min > max, non-finite, non-integer)
  - [x] Test randomFloat:
    - [x] Generates floats within specified range
    - [x] Same seed produces identical sequences
    - [x] Min equals max returns that value
    - [x] Invalid parameters throw errors
  - [x] Test randomBoolean:
    - [x] Generates true and false values
    - [x] Same seed produces identical sequences
    - [x] Distribution is approximately 50/50 over large sample
  - [x] Test randomString:
    - [x] Generates strings of correct length
    - [x] Uses default alphanumeric charset when not specified
    - [x] Respects custom charset parameter
    - [x] All characters come from specified charset
    - [x] Same seed produces identical sequences
    - [x] Invalid parameters throw errors (negative length, empty charset)
  - [x] Test generator registry:
    - [x] All expected names map to correct functions
    - [x] Aliases work correctly

- [x] Write Gherkin BDD tests (AC: 12)
  - [x] Create `packages/core/features/primitive-generators.feature`
  - [x] Scenario: Generate deterministic integers with seeded RNG
  - [x] Scenario: Generate deterministic floats with seeded RNG
  - [x] Scenario: Generate deterministic booleans with seeded RNG
  - [x] Scenario: Generate deterministic strings with seeded RNG
  - [x] Scenario: Custom character sets produce valid strings
  - [x] Scenario: Parameter validation prevents invalid inputs
  - [x] Implement step definitions using Screenplay pattern
  - [x] Create appropriate Abilities/Tasks/Questions components

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Continues Epic 3: Basic Data Generation**

Story 3.2 builds **directly on top of Story 3.1's RNG foundation**. This story creates the fundamental building blocks that all future generators will use.

**Critical Mission:**
- Implement pure generator functions that delegate to RNG for randomness
- Establish generator function signature pattern: `(rng: RNG, ...params) => T`
- Create generator registry for dynamic lookup by name
- Ensure perfect determinism by using RNG exclusively
- Build the primitive API that stories 3.3-3.6 will consume

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Using Math.random() instead of RNG parameter
- ❌ Creating stateful generator classes (generators must be pure functions)
- ❌ Forgetting to validate input parameters
- ❌ Using modulo for string character selection (should use rng.nextIntRange)
- ❌ Inefficient string building (repeated concatenation vs array join)
- ❌ Not testing determinism with same seeds
- ❌ Registry using wrong function signatures

### Previous Story Intelligence

**From Story 3.1 (Custom PRNG - Xoshiro256** Implementation) - COMPLETED:**

✅ **RNG Foundation Established:**
```typescript
// RNG interface available for use
export interface RNG {
  nextInt(): number;        // Returns 32-bit unsigned integer
  nextFloat(): number;      // Returns float in [0, 1)
  nextIntRange(min: number, max: number): number;    // [min, max] inclusive
  nextFloatRange(min: number, max: number): number;  // [min, max)
}

// Factory function available
export function createRNG(seed?: number): RNG;
```

✅ **Location:**
- Implementation: `packages/core/src/generator/rng.ts`
- Exports: `packages/core/src/generator/index.ts`
- Tests: `packages/core/src/generator/rng.test.ts`

✅ **Key Learnings from Story 3.1:**
- RNG provides perfect determinism with seeding
- nextIntRange uses rejection sampling (no modulo bias)
- nextFloatRange provides precise floating-point ranges
- Same seed = identical sequences across runs
- All RNG methods are pure and side-effect free

✅ **Testing Patterns Established:**
```typescript
// Determinism testing pattern to reuse
it('should produce identical sequences with same seed', () => {
  const rng1 = createRNG(12345);
  const rng2 = createRNG(12345);

  const sequence1 = Array.from({ length: 20 }, () => generator(rng1, ...params));
  const sequence2 = Array.from({ length: 20 }, () => generator(rng2, ...params));

  expect(sequence1).toEqual(sequence2);
});
```

✅ **Validation Patterns:**
```typescript
// Parameter validation pattern from RNG
if (min > max) {
  throw new Error(`Invalid range: min (${min}) > max (${max})`);
}
if (!Number.isFinite(min) || !Number.isFinite(max)) {
  throw new Error('Range bounds must be finite numbers');
}
```

**From Epic 2 Retrospective - Patterns to Follow:**

✅ **Pure Functions:**
- Generators must be pure functions
- Take RNG as first parameter
- Return generated value
- No side effects or state mutation

✅ **Module Organization:**
- Create new `generators/` subdirectory under `generator/`
- Each generator type in separate file (primitives.ts, advanced.ts later)
- Export through index.ts hierarchy

### Architecture Compliance Requirements

**From Core Architectural Decisions - Generator Architecture:**

**Decision:** Pure Function Generators with RNG Parameter

**Critical Implementation Requirements:**

1. **Generator Function Signature Pattern:**
```typescript
/**
 * MANDATORY: All generators must follow this signature pattern
 *
 * @param rng - RNG instance for deterministic randomness
 * @param ...params - Generator-specific parameters
 * @returns Generated value of type T
 */
type GeneratorFunction<T> = (rng: RNG, ...params: any[]) => T;

// ✅ Correct - RNG as first parameter
function randomInt(rng: RNG, min: number, max: number): number;

// ❌ Wrong - No RNG parameter (non-deterministic)
function randomInt(min: number, max: number): number;

// ❌ Wrong - RNG not first parameter
function randomInt(min: number, max: number, rng: RNG): number;
```

2. **Generator Registry Pattern:**
```typescript
/**
 * Registry maps generator names to functions for dynamic lookup
 * Used by generator engine (Story 3.3) to find generators by name
 */
type GeneratorRegistry = Map<string, GeneratorFunction<any>>;

// Support aliases for user convenience
const GENERATOR_REGISTRY: GeneratorRegistry = new Map([
  ['int', randomInt],
  ['integer', randomInt],      // Alias
  ['float', randomFloat],
  ['double', randomFloat],      // Alias
  ['number', randomFloat],      // Alias
  ['string', randomString],
  ['text', randomString],       // Alias
  ['bool', randomBoolean],
  ['boolean', randomBoolean],   // Alias
]);
```

3. **Primitive Generator Implementations:**

**randomInt:**
```typescript
/**
 * Generate random integer in [min, max] inclusive range
 *
 * CRITICAL: Delegate to rng.nextIntRange - do NOT reimplement
 *
 * @param rng - RNG instance
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Integer in [min, max]
 */
export function randomInt(rng: RNG, min: number, max: number): number {
  // Validate parameters
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers');
  }
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('Range bounds must be integers');
  }

  // Delegate to RNG - it handles rejection sampling correctly
  return rng.nextIntRange(min, max);
}
```

**randomFloat:**
```typescript
/**
 * Generate random float in [min, max) range
 *
 * CRITICAL: Delegate to rng.nextFloatRange
 *
 * @param rng - RNG instance
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Float in [min, max)
 */
export function randomFloat(rng: RNG, min: number, max: number): number {
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range bounds must be finite numbers');
  }

  return rng.nextFloatRange(min, max);
}
```

**randomBoolean:**
```typescript
/**
 * Generate random boolean with 50/50 distribution
 *
 * @param rng - RNG instance
 * @returns true or false with equal probability
 */
export function randomBoolean(rng: RNG): boolean {
  return rng.nextFloat() < 0.5;
}
```

**randomString:**
```typescript
/**
 * Character set constants for string generation
 */
export const CHARSET_ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CHARSET_NUMERIC = '0123456789';
export const CHARSET_ALPHANUMERIC = CHARSET_ALPHA + CHARSET_NUMERIC;

/**
 * Generate random string of specified length from character set
 *
 * CRITICAL: Use rng.nextIntRange for character selection (no modulo bias)
 * EFFICIENT: Build with array and join, not repeated concatenation
 *
 * @param rng - RNG instance
 * @param length - Desired string length (must be positive integer)
 * @param charset - Character set to use (default: CHARSET_ALPHANUMERIC)
 * @returns Random string of specified length
 */
export function randomString(
  rng: RNG,
  length: number,
  charset: string = CHARSET_ALPHANUMERIC
): string {
  // Validate parameters
  if (length < 0 || !Number.isInteger(length)) {
    throw new Error(`Invalid length: ${length} (must be non-negative integer)`);
  }
  if (charset.length === 0) {
    throw new Error('Character set cannot be empty');
  }

  // Edge case: zero length
  if (length === 0) return '';

  // Build string efficiently using array
  const chars: string[] = new Array(length);
  for (let i = 0; i < length; i++) {
    const index = rng.nextIntRange(0, charset.length - 1);
    chars[i] = charset[index];
  }

  return chars.join('');
}
```

**From Implementation Patterns & Consistency Rules:**

**File Structure:**
```
packages/core/src/generator/
├── index.ts                          # PUBLIC: export { createRNG, randomInt, ... }
├── rng.ts                            # ✅ COMPLETED in Story 3.1
├── rng.test.ts                       # ✅ COMPLETED in Story 3.1
├── generators/                       # ⬅️ CREATE NEW DIRECTORY
│   ├── index.ts                      # ⬅️ CREATE: export all generators
│   ├── primitives.ts                 # ⬅️ CREATE: int, float, string, boolean
│   └── primitives.test.ts            # ⬅️ CREATE: Co-located unit tests
└── (future: generator.ts from Story 3.3)
```

**Module Export Hierarchy:**
```typescript
// packages/core/src/generator/generators/index.ts
export {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  GENERATOR_REGISTRY,
  type GeneratorFunction,
  type GeneratorRegistry
} from './primitives';

// packages/core/src/generator/index.ts (UPDATE)
export { createRNG, type RNG } from './rng';
export {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  GENERATOR_REGISTRY,
  type GeneratorFunction
} from './generators';
```

**Naming Conventions:**
- File: `primitives.ts` (camelCase)
- Functions: `randomInt`, `randomFloat` (camelCase with 'random' prefix)
- Constants: `CHARSET_ALPHA` (SCREAMING_SNAKE_CASE)
- Types: `GeneratorFunction`, `GeneratorRegistry` (PascalCase)

### Integration Points

**Consumes From:**
- Story 3.1: RNG interface and createRNG() factory
- Common utilities: Result type (for potential future error handling)

**Used By:**
- Story 3.3: Generator engine will use registry to lookup generators
- Story 3.6: End-to-end API will expose these generators
- Future stories: Advanced generators will follow same pattern

**Dependencies:**
```typescript
// Only import from completed modules
import { type RNG } from '../rng';

// NO external dependencies - this is pure logic on top of RNG
```

### Testing Standards Summary

**Unit Test Requirements (Bun Test):**

```typescript
// packages/core/src/generator/generators/primitives.test.ts

import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  GENERATOR_REGISTRY
} from './primitives';

describe('randomInt', () => {
  it('should generate integers within specified range', () => {
    const rng = createRNG(12345);
    for (let i = 0; i < 100; i++) {
      const value = randomInt(rng, 10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(20);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const sequence1 = Array.from({ length: 20 }, () => randomInt(rng1, 0, 100));
    const sequence2 = Array.from({ length: 20 }, () => randomInt(rng2, 0, 100));

    expect(sequence1).toEqual(sequence2);
  });

  it('should return same value when min equals max', () => {
    const rng = createRNG(42);
    const value = randomInt(rng, 5, 5);
    expect(value).toBe(5);
  });

  it('should throw error when min > max', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, 10, 5)).toThrow('Invalid range');
  });

  it('should throw error for non-finite bounds', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, NaN, 10)).toThrow('finite numbers');
    expect(() => randomInt(rng, 0, Infinity)).toThrow('finite numbers');
  });

  it('should throw error for non-integer bounds', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, 1.5, 10)).toThrow('must be integers');
  });
});

describe('randomFloat', () => {
  it('should generate floats within specified range', () => {
    const rng = createRNG(54321);
    for (let i = 0; i < 100; i++) {
      const value = randomFloat(rng, 0.0, 1.0);
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThan(1.0);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(77777);
    const rng2 = createRNG(77777);

    const sequence1 = Array.from({ length: 20 }, () => randomFloat(rng1, -10.0, 10.0));
    const sequence2 = Array.from({ length: 20 }, () => randomFloat(rng2, -10.0, 10.0));

    expect(sequence1).toEqual(sequence2);
  });

  it('should throw error when min > max', () => {
    const rng = createRNG(42);
    expect(() => randomFloat(rng, 5.0, 2.0)).toThrow('Invalid range');
  });
});

describe('randomBoolean', () => {
  it('should generate true and false values', () => {
    const rng = createRNG(11111);
    const values = Array.from({ length: 100 }, () => randomBoolean(rng));

    const trueCount = values.filter(v => v === true).length;
    const falseCount = values.filter(v => v === false).length;

    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(33333);
    const rng2 = createRNG(33333);

    const sequence1 = Array.from({ length: 50 }, () => randomBoolean(rng1));
    const sequence2 = Array.from({ length: 50 }, () => randomBoolean(rng2));

    expect(sequence1).toEqual(sequence2);
  });

  it('should have approximately 50/50 distribution', () => {
    const rng = createRNG(88888);
    const sampleSize = 10000;
    const values = Array.from({ length: sampleSize }, () => randomBoolean(rng));

    const trueCount = values.filter(v => v === true).length;
    const ratio = trueCount / sampleSize;

    // Should be close to 0.5 (within 5% for large sample)
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});

describe('randomString', () => {
  it('should generate strings of correct length', () => {
    const rng = createRNG(55555);
    expect(randomString(rng, 0).length).toBe(0);
    expect(randomString(rng, 10).length).toBe(10);
    expect(randomString(rng, 100).length).toBe(100);
  });

  it('should use default alphanumeric charset', () => {
    const rng = createRNG(66666);
    const str = randomString(rng, 100);

    // All characters should be in alphanumeric set
    for (const char of str) {
      expect(CHARSET_ALPHANUMERIC.includes(char)).toBe(true);
    }
  });

  it('should respect custom charset', () => {
    const rng = createRNG(77777);
    const customCharset = 'ABC123';
    const str = randomString(rng, 50, customCharset);

    // All characters should be from custom set
    for (const char of str) {
      expect(customCharset.includes(char)).toBe(true);
    }
  });

  it('should use only alpha characters when specified', () => {
    const rng = createRNG(88888);
    const str = randomString(rng, 50, CHARSET_ALPHA);

    for (const char of str) {
      expect(CHARSET_ALPHA.includes(char)).toBe(true);
      expect(CHARSET_NUMERIC.includes(char)).toBe(false);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const sequence1 = Array.from({ length: 10 }, () => randomString(rng1, 20));
    const sequence2 = Array.from({ length: 10 }, () => randomString(rng2, 20));

    expect(sequence1).toEqual(sequence2);
  });

  it('should throw error for negative length', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, -1)).toThrow('Invalid length');
  });

  it('should throw error for non-integer length', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, 5.5)).toThrow('Invalid length');
  });

  it('should throw error for empty charset', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, 10, '')).toThrow('Character set cannot be empty');
  });
});

describe('GENERATOR_REGISTRY', () => {
  it('should map all generator names to functions', () => {
    expect(GENERATOR_REGISTRY.get('int')).toBe(randomInt);
    expect(GENERATOR_REGISTRY.get('integer')).toBe(randomInt);
    expect(GENERATOR_REGISTRY.get('float')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('double')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('number')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('string')).toBe(randomString);
    expect(GENERATOR_REGISTRY.get('text')).toBe(randomString);
    expect(GENERATOR_REGISTRY.get('bool')).toBe(randomBoolean);
    expect(GENERATOR_REGISTRY.get('boolean')).toBe(randomBoolean);
  });

  it('should have all expected entries', () => {
    const expectedNames = [
      'int', 'integer',
      'float', 'double', 'number',
      'string', 'text',
      'bool', 'boolean'
    ];

    for (const name of expectedNames) {
      expect(GENERATOR_REGISTRY.has(name)).toBe(true);
    }
  });
});
```

**Gherkin BDD Tests:**

```gherkin
# packages/core/features/primitive-generators.feature

Feature: Primitive Field Generators
  As a QA tester
  I want basic field generators for primitive data types
  So that I can generate integers, floats, strings, and booleans in my schemas

  Background:
    Given I have a seeded RNG with seed 12345

  Scenario: Generate deterministic integers with seeded RNG
    When I generate 20 random integers between 0 and 100 with seed 12345
    And I generate 20 random integers between 0 and 100 with seed 12345 again
    Then both sequences should be identical
    And all values should be between 0 and 100 inclusive
    And all values should be integers

  Scenario: Generate deterministic floats with seeded RNG
    When I generate 20 random floats between 0.0 and 1.0 with seed 54321
    And I generate 20 random floats between 0.0 and 1.0 with seed 54321 again
    Then both sequences should be identical
    And all values should be between 0.0 and 1.0
    And all values should be floats

  Scenario: Generate deterministic booleans with seeded RNG
    When I generate 50 random booleans with seed 33333
    And I generate 50 random booleans with seed 33333 again
    Then both sequences should be identical
    And the sequence should contain both true and false values
    And the distribution should be approximately 50/50

  Scenario: Generate deterministic strings with seeded RNG
    When I generate 10 random strings of length 20 with seed 99999
    And I generate 10 random strings of length 20 with seed 99999 again
    Then both sequences should be identical
    And all strings should have length 20
    And all strings should contain only alphanumeric characters

  Scenario: Custom character sets produce valid strings
    Given I want to generate strings with only letters
    When I generate 20 random strings of length 10 using alphabetic charset
    Then all strings should contain only alphabetic characters
    And no strings should contain numeric characters

  Scenario: Parameter validation prevents invalid inputs
    When I try to generate an integer with min greater than max
    Then an error should be thrown with message "Invalid range"

    When I try to generate a string with negative length
    Then an error should be thrown with message "Invalid length"

    When I try to generate a string with empty charset
    Then an error should be thrown with message "Character set cannot be empty"
```

**Screenplay Pattern Step Definitions:**

```typescript
// packages/core/features/steps/primitive-generators.steps.ts

import { Given, When, Then } from '@serenity-js/cucumber';
import { Actor } from '@serenity-js/core';
import { Ensure, equals, contain, not } from '@serenity-js/assertions';
import { UseRNG, GenerateIntegers, GenerateFloats, GenerateBooleans, GenerateStrings } from '../abilities';

// Abilities
class UseRNG {
  static withSeed(seed: number) {
    return new UseRNG(seed);
  }

  constructor(private seed: number) {}
  // ... implementation
}

// Tasks
class GenerateIntegers {
  static between(min: number, max: number, count: number) {
    return new GenerateIntegers(min, max, count);
  }
  // ... implementation
}

// Questions
class GeneratedSequence {
  static values() {
    return new GeneratedSequence();
  }
  // ... implementation
}

// Steps
Given('{pronoun} {have} a seeded RNG with seed {int}',
  (actor: Actor, seed: number) =>
    actor.whoCan(UseRNG.withSeed(seed))
);

When('{pronoun} generate(s) {int} random integers between {int} and {int} with seed {int}',
  (actor: Actor, count: number, min: number, max: number, seed: number) =>
    actor.attemptsTo(
      UseRNG.withSeed(seed),
      GenerateIntegers.between(min, max, count)
    )
);

Then('both sequences should be identical',
  (actor: Actor) =>
    actor.attemptsTo(
      Ensure.that(GeneratedSequence.first(), equals(GeneratedSequence.second()))
    )
);
```

### Project Structure & Naming

**Directory Structure:**
```
packages/core/src/
├── generator/
│   ├── index.ts                    # ✅ EXISTS - UPDATE with new exports
│   ├── rng.ts                      # ✅ EXISTS (Story 3.1)
│   ├── rng.test.ts                 # ✅ EXISTS (Story 3.1)
│   └── generators/                 # ⬅️ CREATE NEW
│       ├── index.ts                # ⬅️ CREATE
│       ├── primitives.ts           # ⬅️ CREATE
│       └── primitives.test.ts      # ⬅️ CREATE
└── (other modules from previous stories)
```

**File Naming:**
- ✅ `primitives.ts` - camelCase
- ✅ `primitives.test.ts` - camelCase with .test suffix
- ✅ `index.ts` - lowercase

**Function Naming:**
- ✅ `randomInt` - camelCase, descriptive verb + noun
- ✅ `randomFloat` - consistent prefix pattern
- ✅ `randomString` - consistent prefix pattern
- ✅ `randomBoolean` - consistent prefix pattern

**No conflicts detected** - This is new functionality in new subdirectory

### References

**Source Documents:**

- [Epic Definition: _bmad-output/planning-artifacts/epics/epic-3-basic-data-generation.md#Story 3.2]
- [Architecture: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#Generator Architecture]
- [Implementation Patterns: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#File Naming]
- [Project Context: _bmad-output/planning-artifacts/project-context.md#Language-Specific Rules]
- [Previous Story: _bmad-output/implementation-artifacts/3-1-custom-prng-xoshiro256-implementation.md]
- [Sprint Status: _bmad-output/implementation-artifacts/sprint-status.yaml]

**Critical Technical Specifications:**
- Pure function generator pattern with RNG first parameter
- Generator registry for dynamic lookup by name
- Character set constants for string generation
- Efficient string building with array join pattern
- Comprehensive parameter validation on all generators
- Determinism testing with identical seeds

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (via GitHub Copilot)

### Debug Log References

N/A - Implementation proceeded smoothly with no blocking issues

### Completion Notes List

**Implementation Summary:**
- ✅ Created `packages/core/src/generator/generators/` directory structure
- ✅ Implemented all 4 primitive generators (`randomInt`, `randomFloat`, `randomBoolean`, `randomString`)
- ✅ All generators follow pure function pattern with RNG as first parameter
- ✅ Comprehensive parameter validation with descriptive error messages
- ✅ Generator registry with 9 name mappings (including aliases)
- ✅ Character set constants (ALPHA, NUMERIC, ALPHANUMERIC)
- ✅ Efficient string generation using array join pattern
- ✅ Complete module export hierarchy through index files

**Testing:**
- ✅ 24 unit tests in `primitives.test.ts` - all passing
- ✅ 8 Gherkin scenarios with Screenplay pattern - all passing
- ✅ Created UseGenerators ability, GeneratorTasks interactions, GeneratorQuestions
- ✅ All 303 tests pass (no regressions)
- ✅ 100% determinism verified with identical seed testing

**Key Technical Decisions:**
- Used `Array.from({ length })` for functional string generation pattern
- Cast functions to `GeneratorFunction` type for registry to handle varying signatures (documented limitation)
- Delegated all randomness to RNG methods (no Math.random() usage)
- Parameter validation follows patterns established in Story 3.1
- Enhanced error messages for better developer experience

**Code Review Fixes Applied (2026-02-04):**
- ✅ Added missing `GeneratorRegistry` type export to main index
- ✅ Improved error message clarity in randomString validation
- ✅ Refactored randomString to use Array.from pattern
- ✅ Added comprehensive JSDoc with usage examples to GENERATOR_REGISTRY
- ✅ Enhanced test documentation for randomFloat edge case behavior
- ✅ Updated test assertions to match improved error messages
- ✅ All 303 tests pass after fixes

**Files Created:**
- packages/core/src/generator/generators/primitives.ts
- packages/core/src/generator/generators/primitives.test.ts
- packages/core/src/generator/generators/index.ts
- packages/core/features/primitive-generators.feature
- packages/core/features/step_definitions/primitive-generators.steps.ts
- packages/core/features/support/abilities/UseGenerators.ts
- packages/core/features/support/tasks/GeneratorTasks.ts
- packages/core/features/support/questions/GeneratorQuestions.ts

**Files Modified:**
- packages/core/src/generator/index.ts (added generator exports)

### File List

- packages/core/src/generator/generators/primitives.ts
- packages/core/src/generator/generators/primitives.test.ts
- packages/core/src/generator/generators/index.ts
- packages/core/src/generator/index.ts
- packages/core/features/primitive-generators.feature
- packages/core/features/step_definitions/primitive-generators.steps.ts
- packages/core/features/support/abilities/UseGenerators.ts
- packages/core/features/support/tasks/GeneratorTasks.ts
- packages/core/features/support/questions/GeneratorQuestions.ts
