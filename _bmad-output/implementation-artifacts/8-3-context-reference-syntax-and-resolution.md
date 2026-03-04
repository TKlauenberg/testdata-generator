# Story 8.3: context-reference-syntax-and-resolution

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to reference context data in my schemas**,
so that **generated data can use existing values**.

## Acceptance Criteria

1. Semantic analyzer validates context references during analysis.
2. DSL supports `@context.collectionName.random` syntax.
3. `@context.users.random` selects a random item from `users` context collection.
4. `@context.users[0]` accesses a specific item by index.
5. `@context.users.random.fieldName` accesses a specific field from a random item.
6. Generator resolves context references during record generation.
7. Context reference selection is deterministic with RNG seed.
8. Missing context collections produce clear error messages.
9. Unit tests verify context reference resolution.
10. Gherkin tests verify schemas using context references generate correctly.

## Tasks / Subtasks

- [ ] Define context-reference model and parsing/validation boundaries (AC: 1, 2, 4, 5, 8)
  - [ ] Introduce explicit context-reference typing (resolver input/output contract) under `packages/core/src/context/` or `packages/core/src/analyzer/` with immutable readonly types.
  - [ ] Define accepted forms for this story only: `@context.<collection>.random`, `@context.<collection>[<index>]`, optional `.fieldName` suffix.
  - [ ] Reject unsupported forms (e.g. tag filters, where clauses) with actionable diagnostics (reserved for Story 8.4).

- [ ] Add semantic validation for context references (AC: 1, 2, 8)
  - [ ] Extend analyzer validation flow in `packages/core/src/analyzer/analyzer.ts` to parse and validate context reference expressions present in generator parameters.
  - [ ] Add diagnostics for malformed syntax and unknown/missing context collection references.
  - [ ] Preserve existing `Result<T, Diagnostic[]>` behavior and error accumulation.

- [ ] Implement generator-time context reference resolution (AC: 3, 4, 5, 6, 7, 8)
  - [ ] Add deterministic context selection helper(s) using existing RNG (`packages/core/src/generator/rng.ts` usage pattern).
  - [ ] Integrate resolution into value/parameter evaluation path in `packages/core/src/generator/generator.ts` without breaking template resolution (`{{field}}`).
  - [ ] Support random collection pick, index access, and optional nested field extraction for selected record.
  - [ ] Return clear runtime errors when collection/index/field is invalid and semantic validation could not preemptively detect it.

- [ ] Define context plumbing through generation entry points (AC: 3, 6, 7)
  - [ ] Add/extend generation options/context input so `generate()` has access to loaded context collections.
  - [ ] Ensure seeded runs remain deterministic when context random selection is used.
  - [ ] Keep backwards compatibility for callers that do not provide context data.

- [ ] Add unit tests for analyzer + generator context resolution (AC: 9)
  - [ ] Add focused analyzer tests for valid/invalid context-reference syntax and diagnostics.
  - [ ] Add generator tests for deterministic random selection, index access, field extraction, and missing collection/index/field errors.
  - [ ] Add regression tests confirming existing generator/template behavior still passes.

- [ ] Add BDD coverage using existing Screenplay structure (AC: 10)
  - [ ] Add feature file under `packages/core/features/` for context reference resolution scenarios.
  - [ ] Add step definitions under `packages/core/features/step_definitions/`.
  - [ ] Add/extend Screenplay abilities/tasks/questions under `packages/core/features/support/` for context-aware generation.

## Dev Notes

### Story Foundation

- Epic 8 establishes progressive context capabilities: load first (8.1/8.2), reference now (8.3), tag/filter later (8.4), save later (8.5).
- Scope for this story is **reference syntax + resolution only**; no tag filtering syntax and no context persistence changes.
- Business goal is realistic generated records that reuse pre-existing data with deterministic seeded behavior.

### Technical Requirements

- Runtime: Bun 1.x, TypeScript strict mode, ESM-only modules.
- Keep explicit fallible-operation patterns (`Result<T, Diagnostic[]>` in analyzer; clear `Error` boundaries in generator/file I/O paths).
- Reuse existing RNG session in `generate()`; do not instantiate ad-hoc RNG in context resolver paths.
- Maintain immutable data contracts (`readonly`) for new context-reference types.

### Architecture Compliance

- Expected modules to touch:
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/analyzer/analyzer.test.ts`
  - `packages/core/src/generator/generator.ts`
  - `packages/core/src/generator/generator.test.ts`
  - `packages/core/src/context/types.ts` (only if contract extension is needed)
  - `packages/core/src/context/index.ts` and `packages/core/src/index.ts` (only if new public exports/options are introduced)
- Keep boundaries intact: CLI must not own or implement core context reference logic.
- Export discipline remains via `index.ts` barrels only.

### Library / Framework Requirements

- Use existing repository stack already pinned in project files:
  - Bun runtime + `bun test`
  - TypeScript `^5.9.3`
  - Cucumber `^12.5.0` + SerenityJS `^3.37.1` for BDD
- No new parsing dependency is required for this story; implement parser/resolver logic with existing code patterns.

### File Structure Requirements

- Likely new files (if introduced for maintainability):
  - `packages/core/src/context/referenceResolver.ts` (or analyzer-scoped equivalent)
  - `packages/core/src/context/referenceResolver.test.ts` (or co-located analyzer/generator tests only)
  - `packages/core/features/context-reference-resolution.feature`
  - `packages/core/features/step_definitions/context-reference-resolution.steps.ts`
- Existing files likely updated:
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/generator/generator.ts`
  - `packages/core/src/generator/generator.test.ts`
  - `packages/core/src/analyzer/analyzer.test.ts`

### Testing Requirements

- Unit tests must prove:
  - accepted syntax parsing/validation,
  - deterministic random selection under same seed,
  - index access correctness,
  - field extraction correctness,
  - precise errors for missing collection/index/field,
  - no regressions in existing template and non-context generation paths.
- BDD tests must prove end-to-end schema generation using loaded JSON/CSV context data and context references.

### Previous Story Intelligence (Story 8.2)

- Reuse established context contracts and error quality from `jsonLoader.ts` and `csvLoader.ts`.
- Keep implementation token-efficient and explicit; avoid broad refactors outside AC scope.
- Preserve robustness approach from 8.2 (strict malformed-input checks, deterministic behavior).

### Git Intelligence Summary

Recent commits indicate stable workflow cadence and immediate prior context work:

- `1215501` code-review story 8.2
- `bf67fba` dev-story 8.2
- `fe2bdfd` create-story 8.2
- `09e5e96` code-review story 8.1
- `5f5cc10` dev-story 8.1

Implication: Story 8.3 should build directly on completed context loaders and preserve the same review-quality bar.

### Latest Technical Information

- External web lookup was not available in this execution environment; technical constraints are derived from repository-pinned versions and architecture artifacts.
- Current dependency baseline is sufficient for this story; no upgrade/migration is required to satisfy ACs.

### Project Context Reference

- Follow project rules from `_bmad-output/planning-artifacts/project-context.md`:
  - strict TypeScript, no `any`, ESM imports/exports,
  - Result-pattern diagnostics in analyzer,
  - module boundaries and file naming conventions,
  - dual test strategy (unit + Gherkin).

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`
- Sprint state: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Patterns/rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Previous story: `_bmad-output/implementation-artifacts/8-2-csv-context-loader.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Context assembled from sprint status, Epic 8, architecture artifacts, project context, current core source modules, and latest git commits.

### Completion Notes List

- Auto-selected first backlog story from sprint tracker: `8-3-context-reference-syntax-and-resolution`.
- Generated comprehensive ready-for-dev story artifact with implementation guardrails and scoped task breakdown.
- Added previous-story and git intelligence to reduce implementation drift.
- Added architecture/path constraints and anti-scope-creep boundaries (defer tag filters to Story 8.4).

### File List

- `_bmad-output/implementation-artifacts/8-3-context-reference-syntax-and-resolution.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
