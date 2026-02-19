# Story 7.1: uniqueness-constraint-tracker

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **to track generated values for uniqueness enforcement**,
so that **duplicate values can be detected and prevented**.

## Acceptance Criteria

1. A `UniquenessTracker` class exists in `packages/core/src/generator/uniqueness.ts` with `track(field: string, value: unknown): boolean`.
2. The tracker stores seen values per field and returns `true` for first-seen values and `false` for duplicates.
3. The tracker supports composite uniqueness keys (tuple-like multi-field combinations).
4. Lookups use efficient data structures with expected O(1) membership checks.
5. Tracker state is reset between generation sessions.
6. Unit tests cover duplicate detection for single-field and composite uniqueness keys.
7. Unit tests include memory/scale-oriented checks for large-value tracking behavior.

## Tasks / Subtasks

- [x] Implement uniqueness tracker primitive in generator module (AC: 1, 2, 4)
  - [x] Add `UniquenessTracker` to `packages/core/src/generator/uniqueness.ts`.
  - [x] Implement single-field storage as `Map<string, Set<string>>` (or equivalent deterministic hash strategy).
  - [x] Ensure `track()` performs idempotent duplicate detection and returns boolean success.

- [x] Add composite-key tracking support (AC: 3, 4)
  - [x] Add API for tracking composite values with stable key serialization.
  - [x] Ensure composite key representation is deterministic and collision-resistant for JSON-serializable inputs.
  - [x] Keep implementation isolated so Story 7.2 can plug it into generation retry flow without refactor.

- [x] Add lifecycle/reset behavior for generation sessions (AC: 5)
  - [x] Implement `clear()` (or equivalent reset method) on `UniquenessTracker`.
  - [x] Confirm reset behavior aligns with per-run generator session boundaries.

- [x] Add focused unit test coverage (AC: 6, 7)
  - [x] Create `packages/core/src/generator/uniqueness.test.ts` for tracker behavior.
  - [x] Cover first-seen vs duplicate for primitive and object-like values.
  - [x] Cover composite key duplicate detection for 2-field and 3-field combinations.
  - [x] Add scale-oriented test that tracks many values and asserts stable behavior.

- [x] Add BDD coverage scaffold for uniqueness behavior (AC: 6)
  - [x] Add `packages/core/features/uniqueness-constraints.feature` with baseline tracker behavior scenarios.
  - [x] Implement matching steps in `packages/core/features/step_definitions/` using current Screenplay patterns.

## Dev Notes

### Story Foundation

- Epic 7 introduces uniqueness as a core data-integrity capability and starts with foundational tracking primitives before generation-level retries/enforcement.
- This story should deliver reusable tracker infrastructure that Stories 7.2 and 7.3 can consume directly.

### Technical Requirements

- Runtime/tooling: Bun + TypeScript strict mode; ESM only.
- Error handling: expected fallible flows should remain Result/diagnostic based where applicable; tracker internals should avoid throw-based control flow.
- Determinism: key representation for tracked values must be stable across same input and run conditions.
- Performance: data structure choices must support high-volume tracking with low lookup overhead.

### Architecture Compliance

- Respect module boundaries:
  - `packages/core/src/generator/` contains runtime uniqueness tracking logic.
  - Analyzer/parser remain unchanged in this story except for minimal type plumbing if strictly needed.
- Keep exports through `index.ts` boundaries.
- Follow naming and structure conventions from architecture artifacts (`camelCase.ts`, co-located tests, Result-style patterns).

### Library / Framework Requirements

- Do not introduce Faker.js or uniqueness helper dependencies.
- Use built-in JS/TS collections (`Map`, `Set`) and existing project utilities.
- Keep tests on Bun runner and BDD stack already in `packages/core/features`.

### File Structure Requirements

- Primary expected touchpoints:
  - `packages/core/src/generator/uniqueness.ts`
  - `packages/core/src/generator/index.ts`
  - `packages/core/src/generator/uniqueness.test.ts`
  - `packages/core/features/uniqueness-constraints.feature`
  - `packages/core/features/step_definitions/*.steps.ts`
- Keep file names in `camelCase.ts` and co-locate unit tests with source.

### Testing Requirements

- Unit tests must validate:
  - single-field tracking (new vs duplicate)
  - composite-key tracking (new vs duplicate)
  - reset semantics between sessions
  - large-set behavior without functional regression
- BDD scenarios should validate user-visible uniqueness tracking behavior and prepare reuse for Story 7.2 enforcement flow.

### Latest Technical Information

- Project stack already pins Bun and TypeScript strict mode; no external dependency upgrade is required for this story scope.
- Prefer platform-native structures and existing architecture patterns over new third-party abstractions.

### Project Structure Notes

- Keep uniqueness tracking as a focused generator concern in this story.
- Avoid implementing retry loops or full constraint enforcement here; those belong to subsequent Epic 7 stories.

### References

- Source epic: `_bmad-output/planning-artifacts/epics/epic-7-uniqueness-constraints.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md` (FR3, FR28)
- Project constraints: `_bmad-output/planning-artifacts/project-context.md`
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Consistency rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- N/A (create-story context generation only)

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared with architecture-aligned implementation guidance and anti-regression guardrails.
- Story status set to `ready-for-dev` and sprint tracker updated accordingly.
- Implemented `UniquenessTracker` with O(1)-lookup `Map` + `Set` storage for single-field and composite uniqueness checks.
- Added deterministic stable serialization for JSON-serializable object-like values and composite tuple tracking.
- Added lifecycle reset via `clear()` to support per-generation-session boundaries.
- Added focused unit tests covering single-field duplicates, composite duplicates (2-field/3-field), reset behavior, and large-set tracking.
- Added BDD scaffold feature and Screenplay-compatible step definitions for tracker behavior.
- Validation completed: all tests pass (`bun test`), BDD runner passes (`bun run test:bdd`), changed-file ESLint checks pass.

### File List

- `_bmad-output/implementation-artifacts/7-1-uniqueness-constraint-tracker.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/generator/uniqueness.ts`
- `packages/core/src/generator/uniqueness.test.ts`
- `packages/core/src/generator/index.ts`
- `packages/core/features/uniqueness-constraints.feature`
- `packages/core/features/step_definitions/uniqueness-constraints.steps.ts`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-02-18: Implemented uniqueness tracker foundation (single-field + composite + reset), added unit and BDD scaffold coverage, and advanced story status to `review`.
