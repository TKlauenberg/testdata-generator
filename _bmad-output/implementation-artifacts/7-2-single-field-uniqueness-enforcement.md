# Story 7.2: single-field-uniqueness-enforcement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to mark fields as unique**,
so that **generated values don't have duplicates**.

## Acceptance Criteria

1. The DSL supports `unique` keyword after field definition for single-field constraints.
2. The semantic analyzer validates uniqueness constraints during analysis.
3. The generator uses `UniquenessTracker` to detect duplicates for unique fields.
4. On duplicate detection, the generator retries with newly generated values up to 100 attempts.
5. If uniqueness cannot be satisfied, generation fails with a clear error.
6. Error messages include the violated field name and suggest increasing value variety.
7. Uniqueness tracking is reset for each generation session.
8. Unit tests verify uniqueness enforcement and retry behavior.
9. Gherkin tests verify unique fields in realistic schemas do not produce duplicates.

## Tasks / Subtasks

- [ ] Propagate unique constraints through semantic analysis (AC: 2)
  - [ ] Extend analyzer enrichment so `ValidatedField` includes single-field uniqueness metadata from `FieldNode.constraints.unique`.
  - [ ] Add analyzer validation for unsupported/invalid uniqueness configurations (if any are currently representable), and emit `Diagnostic` entries with analyzer error codes.
  - [ ] Add/extend analyzer unit tests to verify valid unique-constraint analysis and error diagnostics.

- [ ] Implement runtime single-field uniqueness enforcement in generation pipeline (AC: 3, 4, 5, 6, 7)
  - [ ] Integrate `UniquenessTracker` into `generate()` session lifecycle so each call starts with fresh tracking state.
  - [ ] Enforce uniqueness for fields marked unique during record generation with bounded retry loop (`MAX_UNIQUENESS_ATTEMPTS = 100`).
  - [ ] Preserve deterministic behavior under a fixed seed while retrying through the same RNG stream.
  - [ ] Throw clear field-scoped error when retries are exhausted, including guidance to increase generator variety or relax constraints.

- [ ] Keep module/API boundaries clean (AC: 2, 3)
  - [ ] Update generator/analyzer type contracts in place (no CLI coupling).
  - [ ] Maintain export boundaries through module `index.ts` files where new types/functions are surfaced.

- [ ] Add focused unit coverage for uniqueness enforcement behavior (AC: 8)
  - [ ] Add generator tests for successful unique generation across `count > 1`.
  - [ ] Add retry-path tests that force transient duplicates before eventual success.
  - [ ] Add failure-path tests that exhaust 100 attempts and assert error clarity.
  - [ ] Add session-boundary tests proving tracker reset between separate `generate()` invocations.

- [ ] Add BDD coverage for user-facing uniqueness behavior (AC: 9)
  - [ ] Extend `packages/core/features/uniqueness-constraints.feature` with single-field uniqueness enforcement scenarios.
  - [ ] Add/extend Screenplay tasks/questions/step-definitions for generation-level uniqueness checks and failure messaging.

## Dev Notes

### Story Foundation

- Epic 7 is implementing uniqueness in layers: Story 7.1 delivered tracking primitives; Story 7.2 must wire those primitives into the actual generation flow for single-field constraints.
- Story 7.3 will handle schema-level composite constraints; avoid over-scoping into composite syntax in this story.

### Technical Requirements

- Runtime/tooling: Bun + strict TypeScript + ESM only.
- Continue Result/Diagnostic pattern for analysis-time validation.
- Do not add third-party uniqueness dependencies; reuse `UniquenessTracker` from Story 7.1.
- Keep retry loop bounded and explicit (`100` max), with actionable error text.

### Architecture Compliance

- Respect pipeline boundaries:
  - Scanner/Parser already parse `unique`; do not duplicate parsing logic in analyzer/generator.
  - Analyzer is responsible for semantic validation + enriched metadata.
  - Generator is responsible for runtime retries and duplicate prevention.
- Keep changes in core package only; no CLI-level changes required.

### Library / Framework Requirements

- Use existing internal primitives:
  - `packages/core/src/generator/uniqueness.ts` (`UniquenessTracker`)
  - `packages/core/src/generator/generator.ts` (record generation pipeline)
  - `packages/core/src/analyzer/analyzer.ts` and `types.ts` (semantic enrichment)
- Testing stack remains Bun unit tests + Cucumber/SerenityJS Screenplay BDD tests.

### File Structure Requirements

- Primary expected touchpoints:
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/analyzer/types.ts`
  - `packages/core/src/analyzer/analyzer.test.ts`
  - `packages/core/src/generator/generator.ts`
  - `packages/core/src/generator/generator.test.ts`
  - `packages/core/src/generator/index.ts` (if new exports required)
  - `packages/core/features/uniqueness-constraints.feature`
  - `packages/core/features/step_definitions/uniqueness-constraints.steps.ts`
  - `packages/core/features/support/tasks/UniquenessTrackerTasks.ts` (or adjacent generation tasks if preferred)
  - `packages/core/features/support/questions/UniquenessTrackerQuestions.ts` (or adjacent generation questions if preferred)

### Testing Requirements

- Unit tests must prove:
  - unique fields never duplicate within a generation session when satisfiable,
  - retry behavior actually occurs before acceptance,
  - clear failure once retry budget is exhausted,
  - tracker resets between generation sessions.
- BDD tests must prove:
  - realistic schema with unique field generates non-duplicate values,
  - unsatisfiable uniqueness reports understandable error guidance.

### Previous Story Intelligence (7.1)

- Reuse the existing `Map<string, Set<string>>` + stable serialization approach from 7.1; do not reimplement duplicate detection.
- Preserve 7.1 hardening for non-finite numbers and non-plain object serialization behavior.
- Follow the Screenplay split used in 7.1 (`Ability` + `Tasks` + `Questions`) instead of thick step definitions.

### Git Intelligence Summary

- Recent commits indicate workflow sequence and established patterns:
  - `dfd69fc` created 7.1 story context,
  - `ff51402` implemented story,
  - `3398e5b` finalized code review fixes.
- Continue this cadence: implement with focused tests, then run code-review workflow before marking done.

### Latest Technical Information

- Based on current repository context, stack constraints are already pinned (Bun 1.x, TS 5.x strict, Commander.js in CLI only).
- No dependency upgrade is required for this story scope; prioritize consistency with existing generator/analyzer architecture.

### Project Structure Notes

- Existing DSL and AST already include field-level `unique`; this story is primarily analyzer + generator enforcement.
- Keep Story 7.2 scoped to single-field uniqueness. Composite uniqueness syntax/semantics remain Story 7.3 scope.

### References

- Source epic: `_bmad-output/planning-artifacts/epics/epic-7-uniqueness-constraints.md`
- Prior story intelligence: `_bmad-output/implementation-artifacts/7-1-uniqueness-constraint-tracker.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Project context constraints: `_bmad-output/planning-artifacts/project-context.md`
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Consistency rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- N/A (create-story context generation only)

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story scoped to single-field uniqueness enforcement with analyzer propagation + generator retry guardrails.
- Retry failure mode requires explicit, field-scoped diagnostics with actionable remediation.
- Story status set to `ready-for-dev` and sprint tracker updated accordingly.

### File List

- `_bmad-output/implementation-artifacts/7-2-single-field-uniqueness-enforcement.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-02-19: Created Story 7.2 implementation context and marked sprint status to `ready-for-dev`.
