# Story 5.4: Text Generators (Words, Sentences, Paragraphs)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate text content for my test data**,
So that **I can populate content fields with realistic text**.

## Acceptance Criteria

**Given** I need text content in test data
**When** I implement text generators in `packages/core/src/generator/generators/text.ts`
**Then** a `word(rng: RNG): string` generator selects from a word list
**And** a `words(rng: RNG, count: number): string` generator creates multiple words
**And** a `sentence(rng: RNG, wordCount?: number): string` generator creates sentences
**And** a `paragraph(rng: RNG, sentenceCount?: number): string` generator creates paragraphs
**And** word list includes 200+ common English words
**And** sentences start with capital letter and end with period
**And** word count parameters have sensible defaults (sentence: 5-15 words, paragraph: 3-5 sentences)
**And** generators use RNG for word selection and variation
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify text structure and formatting
**And** Gherkin tests verify text generation in schemas

## Tasks / Subtasks

- [ ] Create `packages/core/src/generator/generators/text.ts` (AC: All)
  - [ ] Import `RNG` type from `../rng`
  - [ ] Add `COMMON_WORDS` list with 200+ lowercase words
  - [ ] Implement `word(rng: RNG): string`
    - [ ] Select uniformly with `rng.nextIntRange(0, COMMON_WORDS.length - 1)`
    - [ ] Return one word from `COMMON_WORDS`
  - [ ] Implement `words(rng: RNG, count: number): string`
    - [ ] Validate `count > 0`
    - [ ] Generate `count` words and join with a single space
  - [ ] Implement `sentence(rng: RNG, wordCount?: number): string`
    - [ ] If `wordCount` is undefined, pick random count in `[5, 15]`
    - [ ] Build sentence from generated words
    - [ ] Capitalize first character only
    - [ ] Ensure trailing period (`.`)
  - [ ] Implement `paragraph(rng: RNG, sentenceCount?: number): string`
    - [ ] If `sentenceCount` is undefined, pick random count in `[3, 5]`
    - [ ] Generate sentences and join with a single space
  - [ ] Keep all generation deterministic for a given seed

- [ ] Create `packages/core/src/generator/generators/text.test.ts` (AC: structure + determinism)
  - [ ] `word()` returns non-empty string and is deterministic with same seed
  - [ ] `words()` returns exactly `count` tokens and validates invalid count
  - [ ] `sentence()` respects explicit count and default range
  - [ ] `sentence()` starts uppercase and ends with period
  - [ ] `paragraph()` respects explicit count and default range
  - [ ] `paragraph()` has expected sentence count and punctuation
  - [ ] Determinism tests for all public generators

- [ ] Update `packages/core/src/generator/generators/index.ts` (AC: registry + exports)
  - [ ] Import `word`, `words`, `sentence`, `paragraph`
  - [ ] Register generator names in `GENERATOR_REGISTRY`
  - [ ] Add practical aliases only if they match existing naming style
  - [ ] Export text generators in module exports section

- [ ] Add BDD coverage (AC: Gherkin verification)
  - [ ] Create `packages/core/features/text-generators.feature`
  - [ ] Add executable step definitions in `packages/core/features/step_definitions/text-generators.steps.ts`
  - [ ] Reuse Screenplay support patterns from existing generator features
  - [ ] Cover scenarios for word, words, sentence, paragraph, and determinism

- [ ] Ensure test runner wiring
  - [ ] Update `packages/core/tests/run-cucumber.ts` to include new feature and step-definition paths

## Dev Notes

### Epic Context

**Epic 5: Advanced Field Generation** focuses on realistic domain data generation.

**Story position:** 5.4 (after identity, personal, temporal generators).

**Business value:** Realistic body/content text is required for UI validation, search behavior checks, pagination/load tests, and content moderation scenarios.

### Developer Context Section

This story extends the existing generator family and must follow established implementation style from Stories 5.1–5.3:

- Keep generator signatures with `rng` as first argument
- Keep deterministic behavior strictly seed-driven
- Follow current registry and export conventions in `generators/index.ts`
- Add both unit tests and executable BDD scenarios

### Technical Requirements

- Use only in-repo deterministic RNG behavior (`RNG.nextIntRange`) for all random choices
- Do **not** introduce external text-generation libraries (no Faker.js; no lorem packages)
- Use simple, predictable string construction (spaces, capitalization, punctuation)
- Validate invalid numeric parameters (`count`, `wordCount`, `sentenceCount`) fail fast

### Architecture Compliance

- File names must be `camelCase.ts`
- Tests must be co-located as `*.test.ts`
- Exports must flow through module `index.ts`
- Keep functionality inside `packages/core/src/generator/generators/` without crossing package boundaries
- Preserve Result/diagnostic patterns in surrounding pipeline; generators may throw for invalid programmer input as existing generator modules do

### Library / Framework Requirements

- Runtime/testing: Bun test runner (`bun test`) remains the standard
- No new dependencies expected for this story
- String manipulation should rely on standard JavaScript APIs

### File Structure Requirements

Expected touchpoints:

- `packages/core/src/generator/generators/text.ts` (new)
- `packages/core/src/generator/generators/text.test.ts` (new)
- `packages/core/src/generator/generators/index.ts` (update)
- `packages/core/features/text-generators.feature` (new)
- `packages/core/features/step_definitions/text-generators.steps.ts` (new)
- `packages/core/tests/run-cucumber.ts` (update)

### Testing Requirements

Unit tests:

- Verify formatting invariants (capitalization, punctuation, spacing)
- Verify token/sentence counts from explicit and default parameters
- Verify determinism (`same seed => same output`)

BDD tests:

- Word generation in schema fields
- Multi-word field generation with explicit counts
- Sentence formatting and range-based defaults
- Paragraph composition and deterministic repeatability

### Previous Story Intelligence

From Story 5.3 (`done`):

- Keep each generator small, direct, and pure with RNG-first signatures
- Reuse co-located unit tests and focused deterministic assertions
- Follow existing feature/step-definition structure for generator behavior validation
- Maintain consistent update pattern: new generator file + tests + registry + feature wiring

### Git Intelligence Summary

Recent commits (`HEAD~5..HEAD`) confirm the recurring flow and touched areas:

- `b5bd915` create-story 5.3
- `d0397bb` dev-story 5.3
- `6bea369` code-review 5.3
- plus 5.2 completion commits

Actionable implications for 5.4:

- Mirror prior story execution pattern and file layout
- Keep modifications narrowly scoped to generator + tests + feature wiring
- Avoid architecture changes or dependency shifts

### Latest Tech Information

Quick external verification indicates no blockers or required migration changes for this story:

- Bun test runner supports TypeScript-first test execution and deterministic test-order controls when needed
- Standard JS string operations (`toUpperCase`, slicing, join/split) remain stable and sufficient for sentence/paragraph formatting

### Project Context Reference

Critical project constraints to follow:

- Bun-first commands and testing workflow
- Strict TypeScript configuration and ESM imports
- Monorepo boundaries: core package is implementation target
- Generator determinism is non-negotiable

### Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-advanced-field-generation.md#story-54-text-generators-words-sentences-paragraphs]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md]
- [Source: _bmad-output/planning-artifacts/project-context.md]
- [Source: _bmad-output/implementation-artifacts/5-3-temporal-generators-dates-timestamps-ranges.md]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
