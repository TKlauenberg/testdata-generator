# Story 5.2: Personal Data Generators (Names, Emails)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate realistic personal data**,
So that **my test datasets look like production data**.

## Acceptance Criteria

**Given** I need personal information in test data
**When** I implement personal generators in `packages/core/src/generator/generators/personal.ts`
**Then** a `firstName(rng: RNG): string` generator selects from a curated name list
**And** a `lastName(rng: RNG): string` generator selects from a curated surname list
**And** a `fullName(rng: RNG): string` generator combines first and last names
**And** an `email(rng: RNG, domain?: string): string` generator creates valid email addresses
**And** a `phoneNumber(rng: RNG, format?: string): string` generator creates phone numbers
**And** name lists include diverse, international names (50+ first names, 50+ last names)
**And** email generator uses realistic patterns (firstname.lastname@domain.com)
**And** phone number format parameter supports patterns like "(###) ###-####"
**And** generators use RNG for selection to ensure determinism
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify realistic output and format correctness
**And** Gherkin tests verify personal data generation in schemas

## Tasks / Subtasks

- [ ] Create `packages/core/src/generator/generators/personal.ts` (AC: All)
  - [ ] Import RNG type from `../rng`
  - [ ] Define curated name lists (50+ each)
    - [ ] Create FIRST_NAMES constant array with diverse, international names
      - Include Western names: James, Mary, John, Patricia, Robert, Jennifer, etc.
      - Include international names: Wei, Aisha, Carlos, Yuki, Sofia, Raj, etc.
      - Aim for 60-80 names for good variety
    - [ ] Create LAST_NAMES constant array with diverse surnames
      - Include common surnames: Smith, Johnson, Williams, Brown, Jones, etc.
      - Include international surnames: Zhang, Garcia, Rodriguez, Patel, Kim, etc.
      - Aim for 60-80 surnames for good variety
  - [ ] Implement `firstName(rng: RNG): string` generator
    - [ ] Use rng.nextIntRange(0, FIRST_NAMES.length - 1) for unbiased selection
    - [ ] Return selected name from FIRST_NAMES array
  - [ ] Implement `lastName(rng: RNG): string` generator
    - [ ] Use rng.nextIntRange(0, LAST_NAMES.length - 1) for unbiased selection
    - [ ] Return selected name from LAST_NAMES array
  - [ ] Implement `fullName(rng: RNG): string` generator
    - [ ] Call firstName(rng) and lastName(rng)
    - [ ] Combine with space: `${first} ${last}`
    - [ ] Return combined full name
  - [ ] Implement `email(rng: RNG, domain?: string): string` generator
    - [ ] Generate first and last names using firstName/lastName
    - [ ] Normalize to lowercase
    - [ ] Create pattern: `${first}.${last}@${domain}`
    - [ ] Default domain to 'example.com' if not provided
    - [ ] Handle special characters in names (strip or replace with -)
    - [ ] Validate email format matches regex: `/^[a-z0-9.-]+@[a-z0-9.-]+\.[a-z]{2,}$/`
  - [ ] Implement `phoneNumber(rng: RNG, format?: string): string` generator
    - [ ] Default format to "(###) ###-####" (US format) if not provided
    - [ ] Replace each '#' with random digit using rng.nextIntRange(0, 9)
    - [ ] Support multiple format patterns:
      - US: "(###) ###-####"
      - International: "+## ### ### ####"
      - Simple: "###-###-####"
    - [ ] Validate generated phone matches format structure
- [ ] Create comprehensive unit tests: `packages/core/src/generator/generators/personal.test.ts`
  - [ ] Test firstName returns value from FIRST_NAMES array
  - [ ] Test firstName determinism with same seed produces same name
  - [ ] Test lastName returns value from LAST_NAMES array
  - [ ] Test lastName determinism with same seed
  - [ ] Test fullName combines firstName and lastName correctly
  - [ ] Test fullName format (single space between names)
  - [ ] Test fullName determinism
  - [ ] Test email default domain is 'example.com'
  - [ ] Test email custom domain parameter
  - [ ] Test email format pattern (firstname.lastname@domain.com)
  - [ ] Test email lowercase normalization
  - [ ] Test email special character handling
  - [ ] Test email determinism with same seed
  - [ ] Test phoneNumber default format "(###) ###-####"
  - [ ] Test phoneNumber custom format patterns
  - [ ] Test phoneNumber all digits are 0-9
  - [ ] Test phoneNumber preserves format structure (parentheses, spaces, dashes)
  - [ ] Test phoneNumber determinism with same seed
- [ ] Update generator registry in `packages/core/src/generator/generators/index.ts`
  - [ ] Import personal generators
  - [ ] Add 'firstName' mapping to GENERATOR_REGISTRY
  - [ ] Add 'lastName' mapping to GENERATOR_REGISTRY
  - [ ] Add 'fullName' mapping to GENERATOR_REGISTRY
  - [ ] Add 'email' mapping to GENERATOR_REGISTRY
  - [ ] Add 'phoneNumber' mapping to GENERATOR_REGISTRY
  - [ ] Export personal functions through module index
- [ ] Create Gherkin BDD tests with EXECUTABLE step definitions (AC: Gherkin tests verify generators)
  - [ ] Create feature file: `packages/core/features/personal-generators.feature`
  - [ ] Write scenarios:
    - [ ] Scenario: Generate user records with first and last names
    - [ ] Scenario: Generate full names for display fields
    - [ ] Scenario: Generate emails with default domain
    - [ ] Scenario: Generate emails with custom company domain
    - [ ] Scenario: Generate phone numbers with default US format
    - [ ] Scenario: Generate phone numbers with custom format
    - [ ] Scenario: Verify determinism - same seed produces identical personal data
    - [ ] Scenario: Verify name diversity - multiple records have different names
  - [ ] **CRITICAL**: Implement step definitions using Screenplay pattern
    - [ ] Follow patterns from packages/core/features/README.md
    - [ ] Reuse existing Abilities: UseGenerators, CreateProgramWithSchema, UseRecordGeneration
    - [ ] Create Tasks/Questions specific to personal data validation
    - [ ] Ensure all scenarios are EXECUTABLE and pass
    - [ ] **BLOCKER**: Story cannot move to 'review' status without executable Gherkin tests

## Dev Notes

### Epic Context

**Epic 5: Advanced Field Generation** - Building comprehensive generator library for realistic test data. This is **Story 2 of 5**, focusing on personal data generators (names, emails, phone numbers).

**Story Position**: Builds on Story 5.1 (Identity Generators) by adding human-readable personal data. While identity generators create technical IDs, personal generators create realistic user profiles visible in test UIs.

**Business Value**: QA testers need realistic personal data (names, emails, phone numbers) for user profile testing, form validation testing, and realistic UI screenshots. Generic strings like "test123" harm testing credibility.

**Dependencies**: 
- Uses PRNG system from Epic 3 (Story 3.1: Xoshiro256** RNG)
- Follows generator patterns from Story 3.2 (Primitive Generators) and Story 5.1 (Identity Generators)
- Integrates with generator registry established in Story 3.2

### Previous Story Intelligence: Story 5.1 Learnings

**What Worked Well:**
- ✅ Simple, focused generator functions with RNG as first parameter
- ✅ Co-located test files (personal.test.ts alongside personal.ts) 
- ✅ Deterministic testing with fixed seeds
- ✅ Export pattern through index.ts with GENERATOR_REGISTRY
- ✅ Clear acceptance criteria mapped directly to test cases

**Key Implementation Pattern from 5.1:**

```typescript
// From identity.ts - Follow this exact pattern
export function uuid(rng: RNG): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = rng.nextInt() & 0xff;
  }
  // ... version/variant bit setting
  return formatUUID(bytes);
}

// Registry pattern from generators/index.ts
export const GENERATOR_REGISTRY: GeneratorRegistry = new Map([
  ['uuid', uuid as GeneratorFunction],
  ['sequential', sequentialWrapper as GeneratorFunction],
  ['nanoid', nanoid as GeneratorFunction],
  // Add personal generators here
]);
```

**Issues Encountered (Not Blocking for This Story):**
- ⚠️ BDD test infrastructure has 75 TypeScript compilation errors (pre-existing)
- ⚠️ Serenity/JS Question type mismatches (24 errors) - affects all BDD tests
- ⚠️ These are project-wide issues from earlier epics, NOT caused by Story 5.1
- ✅ Core generator implementation and unit tests work perfectly
- 📝 Continue implementing executable Gherkin tests following Screenplay pattern

**Code Review Action Items from 5.1:**
- Continue fixing BDD infrastructure errors (parallel effort, not blocking)
- All new generators must have unit tests AND Gherkin scenarios
- Sequential generator has wrapper function for registry compatibility - be aware of this pattern

### Architecture Context

**Module Location and Structure:**

```
packages/core/src/generator/
├── rng.ts                  # ✅ EXISTS - Xoshiro256** PRNG (Epic 3.1)
├── generator.ts            # ✅ EXISTS - Generation orchestration (Epic 3.3)
├── generators/
│   ├── index.ts            # ✅ EXISTS - TO UPDATE (add personal exports)
│   ├── primitives.ts       # ✅ EXISTS - Reference for basic patterns (Epic 3.2)
│   ├── primitives.test.ts  # ✅ EXISTS - Reference for test patterns
│   ├── identity.ts         # ✅ EXISTS - UUID, sequential, nanoid (Story 5.1)
│   ├── identity.test.ts    # ✅ EXISTS - Test pattern reference
│   ├── personal.ts         # 🆕 THIS STORY - New personal generators
│   └── personal.test.ts    # 🆕 THIS STORY - Unit tests
```

**Generator Architecture Pattern** (established in Epic 3 & refined in Story 5.1):

```typescript
// 1. Type Definition (from primitives.ts)
export type GeneratorFunction<T = unknown> = (rng: RNG, ...params: any[]) => T;

// 2. Generator Implementation
export function firstName(rng: RNG): string {
  const index = rng.nextIntRange(0, FIRST_NAMES.length - 1);
  return FIRST_NAMES[index];
}

export function email(rng: RNG, domain: string = 'example.com'): string {
  const first = firstName(rng).toLowerCase();
  const last = lastName(rng).toLowerCase();
  return `${first}.${last}@${domain}`;
}

// 3. Registry Registration (in index.ts)
export const GENERATOR_REGISTRY: GeneratorRegistry = new Map([
  ['firstName', firstName as GeneratorFunction],
  ['email', email as GeneratorFunction],
  // ... other generators
]);

// 4. Module Export (in index.ts)
export { firstName, lastName, fullName, email, phoneNumber } from './personal';
```

### Technical Requirements

#### 1. Name Generators (firstName, lastName, fullName)

**Name List Requirements:**
- Minimum 50+ first names, 50+ last names for diversity
- Include international names (not just Western)
- Examples to include:
  - Western: James, Mary, John, Patricia, Michael, Jennifer, William, Linda
  - Hispanic: Carlos, Maria, Jose, Sofia, Luis, Carmen
  - Asian: Wei, Yuki, Raj, Aisha, Li, Mei
  - European: Hans, Lucia, Dmitri, Sofie

**Implementation Pattern:**

```typescript
// Define name lists as constants at module level
const FIRST_NAMES: readonly string[] = [
  // Western names
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
  // International names
  'Wei', 'Aisha', 'Carlos', 'Yuki', 'Sofia', 'Raj',
  // ... (60-80 total)
] as const;

const LAST_NAMES: readonly string[] = [
  // Common surnames
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  // International surnames
  'Zhang', 'Garcia', 'Rodriguez', 'Patel', 'Kim',
  // ... (60-80 total)
] as const;

export function firstName(rng: RNG): string {
  const index = rng.nextIntRange(0, FIRST_NAMES.length - 1);
  return FIRST_NAMES[index];
}

export function lastName(rng: RNG): string {
  const index = rng.nextIntRange(0, LAST_NAMES.length - 1);
  return LAST_NAMES[index];
}

export function fullName(rng: RNG): string {
  return `${firstName(rng)} ${lastName(rng)}`;
}
```

**Why This Pattern:**
- Uses existing RNG.nextIntRange() for unbiased selection (proven in primitives.ts)
- Readonly arrays enforce immutability
- Simple, testable functions
- Deterministic with same seed

#### 2. Email Generator

**Email Format Pattern:**
- Primary format: `firstname.lastname@domain.com`
- Normalize to lowercase (email addresses are case-insensitive)
- Handle special characters in names (strip or replace)
- Default domain: 'example.com' (safe test domain)

**Implementation Pattern:**

```typescript
export function email(rng: RNG, domain: string = 'example.com'): string {
  const first = firstName(rng).toLowerCase();
  const last = lastName(rng).toLowerCase();
  
  // Handle special characters (replace non-alphanumeric with dash)
  const cleanFirst = first.replace(/[^a-z0-9]/g, '-');
  const cleanLast = last.replace(/[^a-z0-9]/g, '-');
  
  return `${cleanFirst}.${cleanLast}@${domain}`;
}
```

**Validation Pattern:**
- Ensure email matches regex: `/^[a-z0-9.-]+@[a-z0-9.-]+\.[a-z]{2,}$/`
- Test with various domains: example.com, testco.dev, acme-corp.io

#### 3. Phone Number Generator

**Format Parameter:**
- Default: "(###) ###-####" (US format)
- Support custom patterns with '#' as digit placeholder
- Preserve format structure (parentheses, spaces, dashes)

**Implementation Pattern:**

```typescript
export function phoneNumber(rng: RNG, format: string = '(###) ###-####'): string {
  let result = '';
  for (const char of format) {
    if (char === '#') {
      result += rng.nextIntRange(0, 9).toString();
    } else {
      result += char;
    }
  }
  return result;
}
```

**Format Examples to Test:**
- US: "(###) ###-####" → "(555) 123-4567"
- International: "+## ### ### ####" → "+44 123 456 7890"
- Simple: "###-###-####" → "555-123-4567"
- Custom: "### ### ####" → "555 123 4567"

### Testing Strategy

**Unit Test Coverage (personal.test.ts):**

1. **Name Generator Tests:**
   - Verify firstName returns value from FIRST_NAMES array
   - Verify lastName returns value from LAST_NAMES array
   - Test determinism: same seed → same names
   - Test diversity: different seeds → different names

2. **Email Generator Tests:**
   - Test default domain (example.com)
   - Test custom domain parameter
   - Verify format: firstname.lastname@domain
   - Test lowercase normalization
   - Test special character handling in names
   - Test determinism

3. **Phone Number Tests:**
   - Test default format
   - Test multiple custom formats
   - Verify all digits are 0-9
   - Verify format structure preserved
   - Test determinism

**Example Test Pattern from identity.test.ts:**

```typescript
import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { firstName, lastName, fullName, email, phoneNumber } from './personal';

describe('Personal Generators', () => {
  describe('firstName()', () => {
    it('should return a name from the list', () => {
      const rng = createRNG(12345);
      const name = firstName(rng);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);
      expect(firstName(rng1)).toBe(firstName(rng2));
    });
  });

  describe('email()', () => {
    it('should generate email with default domain', () => {
      const rng = createRNG(12345);
      const result = email(rng);
      expect(result).toMatch(/^[a-z0-9.-]+@example\.com$/);
    });

    it('should generate email with custom domain', () => {
      const rng = createRNG(12345);
      const result = email(rng, 'testco.dev');
      expect(result).toMatch(/^[a-z0-9.-]+@testco\.dev$/);
    });
  });

  // ... more tests
});
```

**Gherkin BDD Tests (personal-generators.feature):**

Follow patterns from existing feature files in `packages/core/features/`. Use Screenplay pattern from README.md.

Example scenario:

```gherkin
Feature: Personal Data Generation
  As a QA tester
  I want to generate realistic personal data
  So that my test datasets look like production data

  Background:
    Given the testdata-ai core library is initialized

  @personal @happy-path
  Scenario: Generate user records with names and emails
    Given QA Tester has a schema with personal fields:
      """
      schema User {
        firstName: firstName;
        lastName: lastName;
        email: email;
      }
      """
    When QA Tester generates 5 records with seed 12345
    Then all records should have non-empty firstName
    And all records should have non-empty lastName
    And all records should have valid email format

  @personal @determinism
  Scenario: Personal data is deterministic with seed
    Given QA Tester has a schema with personal fields
    When QA Tester generates 10 records with seed 99999
    And QA Tester generates 10 records with seed 99999 again
    Then both generations should produce identical personal data
```

### Generator Registry Integration

**Update `packages/core/src/generator/generators/index.ts`:**

```typescript
// Add personal generator imports
export { firstName, lastName, fullName, email, phoneNumber } from './personal';

// Update GENERATOR_REGISTRY
export const GENERATOR_REGISTRY: GeneratorRegistry = new Map([
  // ... existing generators (uuid, sequential, nanoid, etc.)
  ['firstName', firstName as GeneratorFunction],
  ['lastName', lastName as GeneratorFunction],
  ['fullName', fullName as GeneratorFunction],
  ['email', email as GeneratorFunction],
  ['phoneNumber', phoneNumber as GeneratorFunction],
]);
```

**Registry Aliases (Optional but Recommended):**

```typescript
// Add friendly aliases
['first', firstName as GeneratorFunction],
['last', lastName as GeneratorFunction],
['name', fullName as GeneratorFunction], // 'name' → fullName
['phone', phoneNumber as GeneratorFunction],
```

### Code Quality Checklist

Before marking story as 'review':

- [ ] All generators implemented in personal.ts
- [ ] All unit tests written and passing (18+ test cases)
- [ ] Generators registered in index.ts
- [ ] Module exports updated in index.ts
- [ ] Name lists have 50+ entries each
- [ ] Email format validation implemented
- [ ] Phone format flexibility tested
- [ ] Determinism tests pass (same seed → same data)
- [ ] TypeScript compiles with no errors in personal.ts and personal.test.ts
- [ ] Gherkin feature file created with 8+ scenarios
- [ ] Gherkin step definitions implemented using Screenplay pattern
- [ ] All Gherkin scenarios executable and passing
- [ ] Code follows project patterns (camelCase.ts, co-located tests, Result types where applicable)

### References

**Architecture Documents:**
- [Core Architectural Decisions](../../planning-artifacts/architecture/core-architectural-decisions.md) - PRNG strategy, immutable data patterns
- [Implementation Patterns & Consistency Rules](../../planning-artifacts/architecture/implementation-patterns-consistency-rules.md) - File naming, test structure, generator patterns

**Related Stories:**
- [Story 5.1: Identity Generators](5-1-identity-generators-uuid-sequential-nanoid.md) - Reference for generator patterns, test structure, registry integration
- [Story 3.1: PRNG Implementation](3-1-custom-prng-xoshiro256-implementation.md) - RNG interface and usage
- [Story 3.2: Primitive Generators](3-2-primitive-field-generators.md) - Original generator pattern establishment

**Epic Context:**
- [Epic 5: Advanced Field Generation](../../planning-artifacts/epics/epic-5-advanced-field-generation.md) - All 5 stories in this epic, business value, dependencies

**Technical References:**
- packages/core/src/generator/rng.ts - RNG interface (nextIntRange method)
- packages/core/src/generator/generators/primitives.ts - Basic generator patterns
- packages/core/src/generator/generators/identity.ts - Story 5.1 implementation reference
- packages/core/features/README.md - BDD Screenplay pattern documentation

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
