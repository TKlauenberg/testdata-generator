# Story 8.3: context-reference-syntax-and-resolution

Status: done

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

- [x] Define context-reference model and parsing/validation boundaries (AC: 1, 2, 4, 5, 8)
  - [x] Introduce explicit context-reference typing (resolver input/output contract) under `packages/core/src/context/` or `packages/core/src/analyzer/` with immutable readonly types.
  - [x] Define accepted forms for this story only: `@context.<collection>.random`, `@context.<collection>[<index>]`, optional `.fieldName` suffix.
  - [x] Reject unsupported forms (e.g. tag filters, where clauses) with actionable diagnostics (reserved for Story 8.4).

- [x] Add semantic validation for context references (AC: 1, 2, 8)
  - [x] Extend analyzer validation flow in `packages/core/src/analyzer/analyzer.ts` to parse and validate context reference expressions present in generator parameters.
  - [x] Add diagnostics for malformed syntax and unknown/missing context collection references.
  - [x] Preserve existing `Result<T, Diagnostic[]>` behavior and error accumulation.

- [x] Implement generator-time context reference resolution (AC: 3, 4, 5, 6, 7, 8)
  - [x] Add deterministic context selection helper(s) using existing RNG (`packages/core/src/generator/rng.ts` usage pattern).
  - [x] Integrate resolution into value/parameter evaluation path in `packages/core/src/generator/generator.ts` without breaking template resolution (`{{field}}`).
  - [x] Support random collection pick, index access, and optional nested field extraction for selected record.
  - [x] Return clear runtime errors when collection/index/field is invalid and semantic validation could not preemptively detect it.

- [x] Define context plumbing through generation entry points (AC: 3, 6, 7)
  - [x] Add/extend generation options/context input so `generate()` has access to loaded context collections.
  - [x] Ensure seeded runs remain deterministic when context random selection is used.
  - [x] Keep backwards compatibility for callers that do not provide context data.

- [x] Add unit tests for analyzer + generator context resolution (AC: 9)
  - [x] Add focused analyzer tests for valid/invalid context-reference syntax and diagnostics.
  - [x] Add generator tests for deterministic random selection, index access, field extraction, and missing collection/index/field errors.
  - [x] Add regression tests confirming existing generator/template behavior still passes.

- [x] Add BDD coverage using existing Screenplay structure (AC: 10)
  - [x] Add feature file under `packages/core/features/` for context reference resolution scenarios.
  - [x] Add step definitions under `packages/core/features/step_definitions/`.
  - [x] Add/extend Screenplay abilities/tasks/questions under `packages/core/features/support/` for context-aware generation.

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
- Implemented context reference parser/resolver and generator integration in core context/analyzer/generator modules.
- Added semantic validation diagnostics for malformed references and unavailable context collections.
- Executed test validation: targeted unit suites and full repository tests (`619 passed, 0 failed`).

### Completion Notes List

- Auto-selected first backlog story from sprint tracker: `8-3-context-reference-syntax-and-resolution`.
- Generated comprehensive ready-for-dev story artifact with implementation guardrails and scoped task breakdown.
- Added previous-story and git intelligence to reduce implementation drift.
- Added architecture/path constraints and anti-scope-creep boundaries (defer tag filters to Story 8.4).
- Added `ContextReferenceExpression` contracts and parser/resolver support for `@context.<collection>.random`, `@context.<collection>[index]`, and optional field path suffixes.
- Extended analyzer validation to detect malformed context syntax and undefined context collections while preserving accumulated diagnostic behavior.
- Added context plumbing through `GenerateOptions` + `generateData`/`validateSchema` so analyzer can validate against available collections and generator can resolve expressions with seeded RNG.
- Added unit tests for analyzer and generator context reference flows (including deterministic behavior and runtime failures for missing collection/index/field).
- Added BDD feature and step definitions for end-to-end context reference behavior using JSON fixture-backed collections.
- Applied senior code review fixes: ensured context collections persist across DSL source updates in Screenplay ability state, removed actor hardcoding in context-reference assertions, and wired context-reference feature into Cucumber runner.

### Senior Developer Review (AI)

- Outcome: **Approved after fixes**
- Issues fixed automatically (HIGH/MEDIUM):
  - Included `context-reference-resolution.feature` and its step definitions in the Cucumber runner allowlist.
  - Preserved loaded context collections in `UseGenerateDataAPI.storeDSLSource()`.
  - Removed hardcoded actor usage in context-reference step assertions using `actorInTheSpotlight()`.
  - Corrected stale test-run evidence in this story's debug record.
- Validation:
  - Full test run passes after fixes (`619 passed, 0 failed`).

### File List

- `_bmad-output/implementation-artifacts/8-3-context-reference-syntax-and-resolution.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/context/contextReference.ts`
- `packages/core/src/context/types.ts`
- `packages/core/src/context/index.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/validate.ts`
- `packages/core/src/generateData.ts`
- `packages/core/src/generator/generator.ts`
- `packages/core/src/generator/generator.test.ts`
- `packages/core/features/context-reference-resolution.feature`
- `packages/core/features/step_definitions/context-reference-resolution.steps.ts`
- `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-03-04: Implemented Story 8.3 context reference syntax/validation/resolution end-to-end, added unit and BDD coverage, and validated with full passing test suite.
- 2026-03-04: Code review fixes applied (BDD runner wiring, context state persistence, actor-agnostic context-reference assertions) and revalidated with full passing tests.
