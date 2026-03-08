# Story 8.4: Context Tagging and Filtered Selection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to tag context data and select by tags**,
so that **I can organize context by environment or region**.

## Acceptance Criteria

1. Context can be loaded with tags via `loadContext(path, tags: string[])`.
2. DSL syntax `@context.users@staging.random` selects from tagged context.
3. Multiple tags can be combined with AND logic, for example `@staging AND @region-us`.
4. The context manager filters collections by tags before selection.
5. Tag matching is case-insensitive.
6. Untagged context remains accessible without tag filters.
7. Unit tests verify tag filtering logic.
8. Gherkin tests verify tag-based context selection in real scenarios.

## Tasks / Subtasks

- [x] Establish tagged context contracts and a context-manager API (AC: 1, 4, 5, 6)
  - [x] Introduce `packages/core/src/context/contextManager.ts` as the orchestration layer that wraps the existing JSON/CSV loaders instead of replacing them.
  - [x] Add a public `loadContext(path, tags?: string[])` entry point that infers the loader from file type and attaches normalized tag metadata.
  - [x] Evolve `packages/core/src/context/types.ts` so tagged context can carry normalized tag data without breaking existing untagged callers.

- [x] Extend context-reference parsing for tag filters (AC: 2, 3, 5, 6)
  - [x] Update `packages/core/src/context/contextReference.ts` to parse optional tag filters between collection and selector, supporting `@context.<collection>@tag.random` and `@tagOne AND @tagTwo` semantics.
  - [x] Keep matching case-insensitive by normalizing tags once and comparing normalized values only.
  - [x] Continue rejecting unsupported filter forms such as `where(...)`, arbitrary predicates, or `OR` syntax with actionable diagnostics; Story 8.4 only requires AND logic.

- [x] Implement tagged selection helpers and runtime filtering (AC: 2, 3, 4, 5, 6)
  - [x] Add a dedicated helper such as `packages/core/src/context/selector.ts` for filtering candidate context collections by tag set before random selection.
  - [x] Preserve Story 8.3 behavior for untagged references and existing `.random` resolution, including deterministic RNG usage.
  - [x] Return clear runtime errors when tag filters resolve to no matching context data.

- [x] Wire validation and public API surfaces without breaking existing callers (AC: 1, 2, 4, 6)
  - [x] Export new context-manager and selector contracts through `packages/core/src/context/index.ts` and the core public API as needed.
  - [x] Ensure analyzer/generation entry points still validate and resolve context references against available collections while remaining backward-compatible with existing `GenerateOptions.context` usage.
  - [x] Avoid scanner/parser refactors unless the current grammar demonstrably blocks the tagged-reference syntax; Story 8.3 already resolves context references from string-valued generator parameters.

- [x] Add focused unit tests for tagged selection behavior (AC: 5, 6, 7)
  - [x] Cover case-insensitive tag normalization, AND filtering, untagged fallback access, and empty-match error behavior.
  - [x] Cover deterministic random selection from filtered candidates under a fixed seed.
  - [x] Add regressions proving existing Story 8.3 untagged context-reference behavior still passes.

- [x] Add BDD coverage for QA-facing tag-selection scenarios (AC: 8)
  - [x] Add a feature file under `packages/core/features/` covering environment/region tag combinations and untagged access.
  - [x] Add step definitions under `packages/core/features/step_definitions/` and Screenplay support files under `packages/core/features/support/` as needed.
  - [x] Update the Cucumber runner allowlist if new feature/step files must be registered explicitly.

## Dev Notes

### Story Foundation

- Epic 8 progresses in sequence: load context first (8.1, 8.2), reference it next (8.3), add tagging/filtering now (8.4), then persist generated data later (8.5).
- The business goal for this story is selective reuse of context data across environments or regions without duplicating separate context collections for every scenario.
- The live repo does **not** currently contain `packages/core/src/context/contextManager.ts` or a public `loadContext()` API. Story 8.4 must introduce that orchestration layer explicitly instead of assuming it already exists.
- PRD material mentions broader filtered selection ideas, but this story is scoped to tag-based filtering with AND logic only. Do not expand into generic `where(...)` predicates or persistence work from Story 8.5.

### Technical Requirements

- Runtime and language remain Bun 1.x, TypeScript strict mode, and ESM-only modules.
- Preserve existing explicit error-handling patterns: analyzer returns `Result<T, Diagnostic[]>`; runtime failures in loader/generator flows should remain clear and actionable.
- Keep data contracts immutable (`readonly`) and backward-compatible for existing untagged context callers.
- Tag matching must be case-insensitive. Normalize tags once at load/parse boundaries and compare normalized values consistently.
- Deterministic generation remains mandatory: filter the eligible context set first, then perform random selection using the existing generation RNG session.
- Avoid adding a new query parser dependency. The current `contextReference.ts` parser is the natural extension point for tag-filter syntax.

### Architecture Compliance

- Keep all tagging logic inside `packages/core/src/context/` and generator/analyzer integration points in core; CLI must not own tag filtering behavior.
- Reuse the existing low-level loaders in `packages/core/src/context/loaders/jsonLoader.ts` and `packages/core/src/context/loaders/csvLoader.ts`; `contextManager.ts` should orchestrate them.
- Add a dedicated selection helper under `packages/core/src/context/selector.ts`, which already matches the architecture plan for FR8.
- Preserve export discipline through `index.ts` barrels only.
- Prefer minimal compiler-surface change: tagged references should extend the existing context-reference resolution path rather than introducing a parallel mechanism.

### Library / Framework Requirements

- Use Bun file APIs and the existing Bun test runner for unit tests.
- Use the existing BDD stack: `@cucumber/cucumber`, `@serenity-js/cucumber`, `@serenity-js/core`, `@serenity-js/assertions`, and `@serenity-js/serenity-bdd`.
- No external web lookup was available in this execution environment. Use the versions already pinned in the repository and architecture artifacts.
- No new external dependency is required to satisfy this story.

### File Structure Requirements

- New files likely required:
  - `packages/core/src/context/contextManager.ts`
  - `packages/core/src/context/selector.ts`
  - `packages/core/src/context/contextManager.test.ts` and/or `packages/core/src/context/selector.test.ts`
  - `packages/core/features/context-tagging-and-selection.feature`
  - `packages/core/features/step_definitions/context-tagging-and-selection.steps.ts`
  - Additional Screenplay support files under `packages/core/features/support/` if the existing abilities/tasks/questions are insufficient
- Existing files likely to update:
  - `packages/core/src/context/types.ts`
  - `packages/core/src/context/index.ts`
  - `packages/core/src/context/contextReference.ts`
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/analyzer/analyzer.test.ts`
  - `packages/core/src/generator/generator.ts`
  - `packages/core/src/generator/generator.test.ts`
  - `packages/core/src/generateData.ts` and tests if the context input contract broadens
  - `packages/core/tests/run-cucumber.ts`

### Testing Requirements

- Unit tests must verify:
  - case-insensitive tag matching,
  - AND filtering across multiple tags,
  - untagged access when no tag filter is present,
  - deterministic random selection from filtered candidates,
  - clear errors when no tagged data matches,
  - regression safety for existing Story 8.3 untagged context references.
- BDD tests must verify real QA workflows where multiple context files or sources are loaded with different environment/region tags and selected through DSL references.
- Keep tests co-located for unit coverage and use the existing Screenplay structure for feature tests.

### Previous Story Intelligence (Story 8.3)

- Reuse the existing context-reference parsing and resolution path in `packages/core/src/context/contextReference.ts`; Story 8.3 already established the correct integration point.
- Preserve the Story 8.3 boundary that rejects unsupported filter syntax. Story 8.4 should replace that gap with explicit tag filters, not open-ended expression parsing.
- Maintain seeded RNG behavior already wired through `generate()` and `generateData()`; tag filtering must not introduce a second RNG or a non-deterministic branch.
- Carry forward the 8.3 review learnings for BDD support: keep feature registration in sync and avoid state loss across Screenplay abilities when context input changes.

### Git Intelligence Summary

- Recent workflow cadence is consistent and current:
  - `44a0f8e` code-review story 8.3
  - `7504574` dev-story 8.3
  - `bc0f838` create-story 8.3
  - `1215501` code-review story 8.2
  - `bf67fba` dev-story 8.2
- Implication: Story 8.4 should extend the current context stack incrementally and preserve the established quality bar from Stories 8.2 and 8.3 instead of rewriting prior work.

### Latest Technical Information

- External web research was not available in this environment.
- Repository-pinned versions and existing architecture guidance are sufficient for this story.
- No upgrade or migration work is required to satisfy the acceptance criteria.

### Project Context Reference

- Follow `_bmad-output/planning-artifacts/project-context.md` rules:
  - strict TypeScript, no `any`, ESM-only modules,
  - `Result<T, Diagnostic[]>` for expected validation failures,
  - barrel exports through `index.ts`,
  - co-located unit tests plus BDD features for acceptance criteria.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Patterns/rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/8-3-context-reference-syntax-and-resolution.md`
- Sprint state: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Context assembled from sprint status, Epic 8, PRD, architecture shards, project context, live core context/generator sources, previous story artifact, and recent git history.
- Discovery results used for this story: PRD loaded from `_bmad-output/planning-artifacts/prd.md`, Epic 8 loaded from `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`, architecture loaded from sharded files under `_bmad-output/planning-artifacts/architecture/`, and project rules loaded from `_bmad-output/planning-artifacts/project-context.md`.
- No UX-specific artifact was present for this story.
- Validation executed: focused unit tests for context manager/selector/reference/analyzer/generateData, the Cucumber runner test, full repository test suite, and targeted ESLint on Story 8.4 code paths.

### Implementation Plan

- Introduce a context manager and tag-aware selection model that wraps, rather than replaces, the existing JSON/CSV loaders.
- Extend context-reference parsing to support tag filters with AND semantics while preserving Story 8.3 behavior for untagged references.
- Keep tag normalization case-insensitive and deterministic across load, validation, and generation.
- Add focused unit and BDD coverage for tagged selection plus regression coverage for existing context references.

### Completion Notes List

- Auto-selected the first backlog story from sprint tracking: `8-4-context-tagging-and-filtered-selection`.
- Generated a ready-for-dev story artifact with explicit guardrails for the missing `contextManager.ts` / `loadContext()` layer in the current repo.
- Scoped Story 8.4 to tag-based filtering with AND logic only, deferring persistence, `OR`, and generic predicate filtering to later work.
- Updated sprint tracking for Story 8.4 to `review` after implementation and validation.
- Added `loadContext()` orchestration plus tag normalization, backward-compatible tagged context collection inputs, and tag metadata on loaded context.
- Extended context-reference parsing and runtime resolution to support `@context.<collection>@tag.random` and `@tagOne AND @tagTwo` filters with case-insensitive matching and explicit `OR` rejection.
- Added selector-based runtime filtering so tagged sources are filtered before deterministic random selection, while untagged Story 8.3 references continue to work unchanged.
- Added unit and BDD coverage for tagged selection, untagged fallback, deterministic seeded behavior, and missing-match runtime errors.
- Validated the change with 664 passing repository tests, targeted Cucumber coverage, and targeted ESLint across the Story 8.4 code paths.
- Repository-wide `bun run lint` still reports pre-existing failures outside Story 8.4; no remaining lint errors were present in the Story 8.4 code paths after targeted verification.

### File List

- `_bmad-output/implementation-artifacts/8-4-context-tagging-and-filtered-selection.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/features/context-tagging-and-selection.feature`
- `packages/core/features/fixtures/context/users.staging.eu.json`
- `packages/core/features/fixtures/context/users.staging.us.json`
- `packages/core/features/fixtures/context/users.untagged.json`
- `packages/core/features/step_definitions/context-tagging-and-selection.steps.ts`
- `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/context/contextManager.test.ts`
- `packages/core/src/context/contextManager.ts`
- `packages/core/src/context/contextReference.test.ts`
- `packages/core/src/context/contextReference.ts`
- `packages/core/src/context/index.ts`
- `packages/core/src/context/loaders/csvLoader.ts`
- `packages/core/src/context/loaders/jsonLoader.ts`
- `packages/core/src/context/selector.test.ts`
- `packages/core/src/context/selector.ts`
- `packages/core/src/context/types.ts`
- `packages/core/src/generateData.test.ts`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-03-06: Implemented tagged context loading and filtered selection with parser/runtime support, added Story 8.4 unit and BDD coverage, and moved the story to `review`.

- 2026-03-06: Created Story 8.4 context artifact via create-story workflow and set sprint status to `ready-for-dev`.