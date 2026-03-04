# Story 8.2: CSV Context Loader

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to load existing CSV data as context**,
so that **I can use database exports in my test scenarios**.

## Acceptance Criteria

1. Implement `loadCsvContext(filePath: string): Promise<ContextData>` in `packages/core/src/context/loaders/csvLoader.ts`.
2. Loader reads CSV files with headers.
3. Loader parses CSV data into an array of objects.
4. Loader correctly handles quoted fields and escaped commas.
5. Loader infers primitive data types from CSV values (number, boolean, string) using project-safe rules.
6. Loader handles large CSV files efficiently (streaming-oriented implementation).
7. Loader reports clear errors for malformed CSV and missing files.
8. Exports are wired through `packages/core/src/context/index.ts` and public core exports.
9. Unit tests verify CSV parsing behavior across realistic formats and error cases.
10. Gherkin tests verify loading database-export CSV files end-to-end.

## Tasks / Subtasks

- [ ] Define CSV context contracts and metadata evolution (AC: 1, 5, 6)
  - [ ] Update `packages/core/src/context/types.ts` so metadata can represent both JSON and CSV loaders while preserving strict readonly semantics.
  - [ ] Keep `ContextData` shape stable (`records` + `metadata`) for forward compatibility with Story 8.3 resolver usage.
  - [ ] Document deterministic CSV type inference rules in code-level types or helper contracts (numbers, booleans, fallback string).

- [ ] Implement CSV loader module with robust parsing (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] Create `packages/core/src/context/loaders/csvLoader.ts` exposing `loadCsvContext(filePath: string): Promise<ContextData>`.
  - [ ] Read input via Bun file APIs and validate file existence/access errors with actionable messages.
  - [ ] Parse header row and records, including quoted values and escaped delimiters, without breaking column alignment.
  - [ ] Convert row data to normalized object records keyed by headers.
  - [ ] Apply deterministic type inference per cell (`number` / `boolean` / `string`) while avoiding lossy conversions.
  - [ ] Keep implementation streaming-oriented for large files (incremental processing strategy, avoid unnecessary full-copy transforms).
  - [ ] Return context metadata (`source`, `format: 'csv'`, `loadedAt`, `recordCount`).

- [ ] Wire module exports and package surface (AC: 8)
  - [ ] Update `packages/core/src/context/index.ts` to export `loadCsvContext` alongside `loadJsonContext` and context types.
  - [ ] Update `packages/core/src/index.ts` so CSV context loading is available on the public core API.
  - [ ] Keep module boundaries intact (`core` remains independent of CLI internals).

- [ ] Add focused unit tests for CSV loader behavior (AC: 9)
  - [ ] Create `packages/core/src/context/loaders/csvLoader.test.ts`.
  - [ ] Cover headers + row mapping, quoted fields, escaped commas, boolean/number inference, and stable row ordering.
  - [ ] Cover malformed row width, empty header conditions, and missing-file/malformed-input errors.
  - [ ] Add large-input sanity test validating memory-safe processing approach and accurate `recordCount`.

- [ ] Add BDD tests using existing Screenplay architecture (AC: 10)
  - [ ] Add `packages/core/features/csv-context-loader.feature` with realistic database-export scenarios.
  - [ ] Add step definitions under `packages/core/features/step_definitions/csv-context-loader.steps.ts`.
  - [ ] Add or extend Screenplay abilities/tasks/questions under `packages/core/features/support/` for CSV loading behaviors.

## Dev Notes

### Story Foundation

- Epic 8 establishes reusable context ingestion for downstream context references and tagged selection.
- Story 8.1 implemented JSON ingestion and context contracts; Story 8.2 must extend the same contracts and conventions, not replace them.
- Story 8.3 depends on stable `ContextData` behavior, so CSV normalization must be compatible with JSON-loaded records.

### Technical Requirements

- Runtime and language: Bun 1.x, TypeScript strict mode, ESM-only modules.
- Follow project error-handling conventions: use `Result<T, E>` for expected validation operations, and throw only at explicit I/O boundaries where project patterns already do so.
- Do not introduce heavyweight parser dependencies unless absolutely required by acceptance criteria; prefer minimal, test-backed parser logic aligned with existing code style.
- Parsing must preserve data fidelity (quotes/commas handling) and avoid hidden coercions in type inference.

### Architecture Compliance

- Implement within `packages/core/src/context/` with a dedicated loader file under `loaders/`.
- Preserve public export discipline via `index.ts` files only.
- Keep implementation isolated from CLI command concerns.
- Maintain naming conventions (`camelCase.ts`) and immutable type contracts (`readonly`).

### Library / Framework Requirements

- Use Bun file APIs for I/O consistency.
- Use Bun test runner (`bun:test`) for unit tests.
- Use existing BDD stack (`@cucumber/cucumber` + SerenityJS Screenplay pattern) for acceptance criteria verification.

### File Structure Requirements

- New files expected:
  - `packages/core/src/context/loaders/csvLoader.ts`
  - `packages/core/src/context/loaders/csvLoader.test.ts`
  - `packages/core/features/csv-context-loader.feature`
  - `packages/core/features/step_definitions/csv-context-loader.steps.ts`
  - Additional Screenplay support files under `packages/core/features/support/` if required
- Existing files expected to update:
  - `packages/core/src/context/types.ts`
  - `packages/core/src/context/index.ts`
  - `packages/core/src/index.ts`

### Testing Requirements

- Unit tests must verify parsing correctness for:
  - header-to-object mapping,
  - quoted field parsing,
  - escaped comma handling,
  - deterministic primitive inference,
  - malformed CSV detection,
  - metadata accuracy.
- BDD tests must verify QA-focused behavior with real CSV fixture inputs representative of database exports.

### Previous Story Intelligence (Story 8.1)

- Reuse existing context contract and metadata style established in `packages/core/src/context/types.ts` and JSON loader implementation.
- Preserve clarity and actionable error messaging patterns from `jsonLoader.ts`.
- Keep tests co-located near implementation and BDD assets in the existing features structure.
- Avoid expanding scope into context reference resolution or tagging logic (Stories 8.3 and 8.4).

### Git Intelligence Summary

- Recent sequence indicates standard flow: create-story → dev-story → code-review, most recently completed for Story 8.1.
- Align Story 8.2 implementation artifacts and quality level with Story 8.1 outputs to reduce review churn.

### Latest Technical Information

- Repository stack is Bun + TypeScript strict + Cucumber/SerenityJS BDD.
- Local dependency set does not include a dedicated CSV parser package in core; implementation should stay compatible with current dependency policy and architecture constraints.
- No external upgrade action is required to satisfy this story as currently scoped.

### Project Structure Notes

- Existing context module currently contains JSON loader only; CSV loader should be added as sibling in `packages/core/src/context/loaders/`.
- Public API export updates are required to keep `@testdata-ai/core` surface coherent for downstream stories.
- Continue following existing workspace and module boundary rules from project context and architecture artifacts.

### References

- Source epic: `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project context rules: `_bmad-output/planning-artifacts/project-context.md`
- Architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Pattern rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/8-1-json-context-loader.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Workflow execution context gathered from sprint status, epic/prd/architecture artifacts, current context module sources, and latest git history.

### Completion Notes List

- Selected next backlog story automatically from sprint status: `8-2-csv-context-loader`.
- Produced comprehensive implementation guide with acceptance-criteria mapping, architecture guardrails, and anti-scope-creep boundaries.
- Added previous-story and git intelligence to reduce implementation drift and rework.
- Marked story status as `ready-for-dev` and aligned artifact naming with implementation tracker.

### File List

- `_bmad-output/implementation-artifacts/8-2-csv-context-loader.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-04: Created Story 8.2 context artifact via create-story workflow and set sprint status to `ready-for-dev`.
