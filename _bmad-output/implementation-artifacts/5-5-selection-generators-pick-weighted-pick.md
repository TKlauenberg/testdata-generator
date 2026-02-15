# Story 5.5: Selection Generators (Pick, Weighted Pick)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to select values from predefined lists**,
So that **I can generate data with specific allowed values**.

## Acceptance Criteria

**Given** I have enumerated values to select from
**When** I implement selection generators in `packages/core/src/generator/generators/selection.ts`
**Then** a `pick(rng: RNG, array: any[]): any` generator randomly selects from array
**And** a `weightedPick(rng: RNG, options: Array<{value: any, weight: number}>): any` generator uses weighted selection
**And** pick ensures uniform distribution across array elements
**And** weightedPick respects probability weights (higher weight = more likely)
**And** generators validate array is not empty
**And** generators use RNG for deterministic selection
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify distribution and weighted probability
**And** Gherkin tests verify selection generators in schemas with enum-like fields

## Tasks / Subtasks

- [ ] Create `packages/core/src/generator/generators/selection.ts` (AC: All)
  - [ ] Import `RNG` type from `../rng`
  - [ ] Implement `pick(rng: RNG, array: any[]): any`
    - [ ] Validate array is not empty (throw error if empty)
    - [ ] Use `rng.nextIntRange(0, array.length - 1)` for uniform selection
    - [ ] Return selected element deterministically
  - [ ] Implement `weightedPick(rng: RNG, options: Array<{value: any, weight: number}>): any`
    - [ ] Validate options array is not empty
    - [ ] Validate all weights are positive numbers
    - [ ] Calculate total weight sum
    - [ ] Use `rng.nextDouble()` to generate random value in [0, 1)
    - [ ] Map random value to weighted ranges (cumulative distribution)
    - [ ] Return corresponding value based on weight probability
  - [ ] Keep all generation deterministic for a given seed

- [ ] Create `packages/core/src/generator/generators/selection.test.ts` (AC: structure + determinism + distribution)
  - [ ] `pick()` returns element from array with deterministic seed
  - [ ] `pick()` validates empty array (throws error)
  - [ ] `pick()` distribution test (uniform across elements with many samples)
  - [ ] `weightedPick()` returns value from options with deterministic seed
  - [ ] `weightedPick()` validates empty options array
  - [ ] `weightedPick()` validates negative or zero weights
  - [ ] `weightedPick()` respects weight probability (statistical verification with many samples)
  - [ ] Determinism tests for both generators (same seed => same output)

- [ ] Update `packages/core/src/generator/generators/index.ts` (AC: registry + exports)
  - [ ] Import `pick`, `weightedPick`
  - [ ] Register generator names in `GENERATOR_REGISTRY`
  - [ ] Add practical aliases if matching existing naming style
  - [ ] Export selection generators in module exports section

- [ ] Add BDD coverage (AC: Gherkin verification)
  - [ ] Create `packages/core/features/selection-generators.feature`
  - [ ] Add executable step definitions in `packages/core/features/step_definitions/selection-generators.steps.ts`
  - [ ] Reuse Screenplay support patterns from existing generator features
  - [ ] Cover scenarios for pick, weightedPick, enum-like field generation, and determinism

- [ ] Ensure test runner wiring
  - [ ] Update `packages/core/tests/run-cucumber.ts` to include new feature and step-definition paths

## Dev Notes

### Epic Context

**Epic 5: Advanced Field Generation** focuses on realistic domain data generation.

**Story position:** 5.5 (final story in Epic 5 - completes advanced field generation).

**Business value:** Selection generators are critical for enum-like fields (status values, categories, roles, types) and realistic data distribution patterns. Weighted selection enables modeling real-world frequency distributions (e.g., 70% active users, 20% inactive, 10% suspended).

### Developer Context Section

This story completes the generator family for Epic 5 and must follow established implementation style from Stories 5.1–5.4:

- Keep generator signatures with `rng` as first argument
- Keep deterministic behavior strictly seed-driven
- Follow current registry and export conventions in `generators/index.ts`
- Add both unit tests and executable BDD scenarios

**Key Decision Points:**

1. **Empty array handling:** Throw error immediately (fail fast for programmer error)
2. **Weight validation:** Validate positive weights, throw on invalid input
3. **Distribution algorithm:** Use cumulative weight ranges for `weightedPick`
4. **Type safety:** Accept `any[]` for flexibility (same as existing generators)

### Technical Requirements

- Use only in-repo deterministic RNG behavior (`RNG.nextIntRange`, `RNG.nextDouble`) for all random choices
- Do **not** introduce external selection/sampling libraries
- Use simple, predictable selection algorithms (index-based for pick, cumulative distribution for weightedPick)
- Validate invalid parameters (empty arrays, invalid weights) fail fast with descriptive errors
- **Weight algorithm:** Calculate total weight sum, generate random value in [0, totalWeight), iterate through cumulative ranges
- **Uniform distribution:** `pick` must use `nextIntRange` for true uniform distribution (not modulo bias)

### Architecture Compliance

- File names must be `camelCase.ts`
- Tests must be co-located as `*.test.ts`
- Exports must flow through module `index.ts`
- Keep functionality inside `packages/core/src/generator/generators/` without crossing package boundaries
- Preserve Result/diagnostic patterns in surrounding pipeline; generators may throw for invalid programmer input as existing generator modules do
- Follow [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]

### Library / Framework Requirements

- Runtime/testing: Bun test runner (`bun test`) remains the standard
- No new dependencies expected for this story
- Statistical distribution verification should use simple count-based assertions (no external stats libraries)
- Use TypeScript standard library for array operations and math

### File Structure Requirements

Expected touchpoints:

- `packages/core/src/generator/generators/selection.ts` (new)
- `packages/core/src/generator/generators/selection.test.ts` (new)
- `packages/core/src/generator/generators/index.ts` (update)
- `packages/core/features/selection-generators.feature` (new)
- `packages/core/features/step_definitions/selection-generators.steps.ts` (new)
- `packages/core/tests/run-cucumber.ts` (update)

### Testing Requirements

Unit tests:

- Verify determinism (`same seed => same output` for both generators)
- Verify uniform distribution for `pick` (run 1000+ iterations, check element frequency)
- Verify weighted distribution for `weightedPick` (run 1000+ iterations with known weights, verify approximate ratios)
- Verify validation errors (empty arrays, invalid weights)
- Edge cases: single-element arrays, equal weights, extreme weight ratios

BDD tests:

- Pick generator in schema fields
- Weighted pick with different weight distributions
- Enum-like field generation (status, category, role fields)
- Deterministic repeatability across schema generation
- Real-world use case: generate user records with realistic status distribution (active 70%, inactive 20%, suspended 10%)

### Previous Story Intelligence

From Story 5.4 (`done`) - [Source: _bmad-output/implementation-artifacts/5-4-text-generators-words-sentences-paragraphs.md]:

**Successful Patterns to Replicate:**
- Keep each generator small, direct, and pure with RNG-first signatures
- Co-locate unit tests with focused deterministic assertions
- Follow existing feature/step-definition structure for generator behavior validation
- Maintain consistent update pattern: new generator file + tests + registry + feature wiring
- 343-word list approach for text generation (exceeds requirements) - similar principle of "more data is better" applies

**Developer Agent Notes:**
- GPT-5.3-Codex completed implementation successfully
- Full test suite passing (894 tests before, 13 new tests added)
- Code review identified and fixed edge cases (single-word sentences)
- Lint issues were pre-existing and out of scope

**File Creation Pattern:**
1. Implement generator module with validation
2. Add comprehensive unit tests (structure, validation, determinism, edge cases)
3. Register in index.ts
4. Add BDD feature file
5. Implement step definitions using Screenplay pattern
6. Wire into cucumber runner

### Git Intelligence Summary

Recent commits confirm the recurring flow (from `git log --oneline -5`):
- `a80038f` code-review 5.4
- `ac1fd73` dev-story 5.4
- `1651103` create-story 5.4
- `6bea369` code-review 5.3
- `d0397bb` dev-story 5.3

**Actionable implications for 5.5:**
- Mirror prior story execution pattern and file layout exactly
- Keep modifications narrowly scoped to generator + tests + feature wiring
- Avoid architecture changes or dependency shifts
- Three-phase workflow: create-story → dev-story → code-review

**File Patterns from Previous Stories:**
- All Epic 5 stories follow identical structure
- Generator implementation: ~50-100 lines with validation
- Unit tests: ~150-200 lines with 10-15 test cases
- BDD features: 5-8 scenarios covering happy path, edge cases, determinism
- Step definitions: Reuse existing Screenplay abilities and patterns

### Latest Tech Information

**TypeScript/Bun Current State:**
- Bun test runner continues to support TypeScript-first test execution with excellent performance
- No breaking changes in Bun runtime for deterministic RNG or array operations
- TypeScript 5.x standard library array methods remain stable and performant

**Selection Algorithm Best Practices:**
- **Uniform selection:** Use `nextIntRange(0, n-1)` to avoid modulo bias that affects simple `% n` approaches
- **Weighted selection:** Cumulative distribution function (CDF) approach is standard and performant
  - Algorithm: Calculate prefix sums, binary search optional but linear scan sufficient for typical use cases (<100 options)
  - Alternative considered: Alias method (O(1) per selection) - overkill for this use case, adds complexity
- **Statistical testing:** For unit tests, 1000-10000 samples + chi-square test OR simple ratio validation (±10% tolerance) both valid

**Reference Implementation Patterns:**
- Similar to `Math.random()` replacement with deterministic RNG
- Common in game engines, procedural generation, simulation frameworks
- Well-established patterns in testing libraries (Faker.js uses weighted selection with similar API)

### Project Context Reference

Critical project constraints to follow:

- **Bun-first commands and testing workflow** - All tests run with `bun test`
- **Strict TypeScript configuration and ESM imports** - No CommonJS, proper imports
- **Monorepo boundaries:** core package is implementation target, CLI will consume these generators
- **Generator determinism is non-negotiable** - Same seed must produce identical output every time
- **Epic 5 completion:** This is the final story in Epic 5 - comprehensive testing important for epic retrospective
- [Source: _bmad-output/planning-artifacts/project-context.md]

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-advanced-field-generation.md#story-55-selection-generators-pick-weighted-pick]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#random-number-generation-custom-prng-implementation]
- [Source: _bmad-output/implementation-artifacts/5-4-text-generators-words-sentences-paragraphs.md]
- [Source: _bmad-output/implementation-artifacts/5-3-temporal-generators-dates-timestamps-ranges.md]
- [Source: _bmad-output/implementation-artifacts/5-2-personal-data-generators-names-emails.md]
- [Source: _bmad-output/implementation-artifacts/5-1-identity-generators-uuid-sequential-nanoid.md]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

### Change Log

_To be filled by dev agent_
