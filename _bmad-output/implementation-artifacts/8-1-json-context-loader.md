# Story 8.1: JSON Context Loader

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to load existing JSON data as context**,
so that **I can reference real data in my test data generation**.

## Acceptance Criteria

1. Implement `loadJsonContext(filePath: string): Promise<ContextData>` in `packages/core/src/context/loaders/jsonLoader.ts`.
2. Loader reads JSON files from the filesystem.
3. Loader supports both single-object and array-of-objects payloads.
4. Loader validates JSON structure and returns clear errors for invalid shapes.
5. Loader handles large JSON files efficiently (streaming-aware implementation if needed by payload size).
6. Loader returns structured context data including metadata.
7. Loader reports clear errors for missing files and invalid JSON.
8. Exports are wired through `packages/core/src/context/index.ts` and public core exports.
9. Unit tests verify parsing, shape normalization, metadata, and error handling.
10. Gherkin tests verify loading real JSON context files end-to-end.

## Tasks / Subtasks

- [x] Define context types and contracts (AC: 1, 3, 6)
  - [x] Add `packages/core/src/context/types.ts` defining `ContextData`, metadata shape, and normalized records collection type.
  - [x] Ensure types use strict readonly semantics where applicable and avoid `any`.
  - [x] Standardize normalization rule: single object input becomes one-record collection.

- [x] Implement JSON loader in dedicated module (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Create `packages/core/src/context/loaders/jsonLoader.ts` with `loadJsonContext(filePath: string): Promise<ContextData>`.
  - [x] Read file via Bun APIs and parse JSON with guarded error handling.
  - [x] Validate top-level shape (`object` or `object[]`) and reject primitives/mixed arrays with diagnostics-oriented messages.
  - [x] Normalize payload into a predictable record array and attach metadata (`source`, `format`, `loadedAt`, record count).
  - [x] Include file existence and permission-path failures in user-actionable error messages.

- [x] Add module wiring and exports (AC: 8)
  - [x] Create `packages/core/src/context/index.ts` to export context types and `loadJsonContext`.
  - [x] Update `packages/core/src/index.ts` to export context module through public API.
  - [x] Keep module boundaries: core context implementation remains independent from CLI.

- [x] Add unit tests (AC: 9)
  - [x] Create `packages/core/src/context/loaders/jsonLoader.test.ts`.
  - [x] Cover: valid single object, valid object array, malformed JSON, missing file, invalid top-level shapes.
  - [x] Verify metadata population and deterministic normalization behavior.

- [x] Add BDD tests with Screenplay pattern (AC: 10)
  - [x] Add `packages/core/features/json-context-loader.feature` with scenarios for object and array JSON context files.
  - [x] Add step definitions under `packages/core/features/step_definitions/json-context-loader.steps.ts`.
  - [x] Add/extend Screenplay Abilities/Tasks/Questions under `packages/core/features/support/` for context loading behavior.

## Dev Notes

### Story Foundation

- Epic 8 introduces context management; Story 8.1 is the first concrete context ingestion capability.
- This story must establish a stable context data contract that Story 8.2 (CSV loader) and Story 8.3 (context reference resolution) can reuse.
- Keep API small and explicit to avoid rework during `@context.*` resolver implementation.

### Technical Requirements

- Runtime: Bun 1.x, TypeScript strict mode, ESM-only modules.
- Error handling must follow existing core conventions:
  - Use `Result<T, E>` for expected validation-style failures inside reusable logic.
  - Throw only at explicit I/O boundaries when existing code follows throwing behavior.
- No external JSON parsing dependencies.
- Ensure implementation is memory-aware for larger payloads; avoid unnecessary copies.

### Architecture Compliance

- Implement in `packages/core/src/context/` as a new module subtree.
- Preserve package boundary: `packages/core` does not depend on CLI internals.
- Export through `index.ts` files only (module-local and package root).
- Align naming conventions: `camelCase.ts` file names.

### Library / Framework Requirements

- Use Bun file APIs for I/O (`Bun.file(...)`) consistent with existing adapters.
- Use Bun test runner (`bun:test`) for unit tests.
- Use existing BDD stack (`@cucumber/cucumber` + SerenityJS Screenplay pattern) for feature tests.

### File Structure Requirements

- New files expected:
  - `packages/core/src/context/types.ts`
  - `packages/core/src/context/index.ts`
  - `packages/core/src/context/loaders/jsonLoader.ts`
  - `packages/core/src/context/loaders/jsonLoader.test.ts`
  - `packages/core/features/json-context-loader.feature`
  - `packages/core/features/step_definitions/json-context-loader.steps.ts`
  - Supporting Screenplay files in `packages/core/features/support/{abilities,tasks,questions}/`
- Existing files to update:
  - `packages/core/src/index.ts`

### Testing Requirements

- Unit tests must verify:
  - single-object normalization,
  - array-of-objects parsing,
  - invalid JSON syntax handling,
  - non-object top-level rejection,
  - missing-file error clarity,
  - metadata completeness.
- BDD tests must verify:
  - QA tester can load JSON context from file,
  - loaded context is accessible as normalized records,
  - malformed input produces understandable failure behavior.

### Anti-Reinvention Guardrails

- Reuse existing project patterns (`Result`, diagnostics, Bun-based I/O, Screenplay test architecture) instead of introducing new abstractions.
- Keep metadata conventions aligned with adapter metadata style (timestamp/version/source-like fields).
- Do not implement CSV behavior in this story; keep scope strictly JSON loader + integration surfaces.

### Latest Technical Information

- Project conventions currently pin Bun-based execution and strict TypeScript patterns from project context artifacts.
- JSON parsing should remain native (`JSON.parse`) with explicit validation guards; this is sufficient for MVP scope.
- Streaming parser libraries are not required for this story unless payload-size constraints force it during implementation.

### Project Structure Notes

- Current `packages/core/src/` does not yet include a `context/` folder; this story introduces the initial module skeleton.
- Existing public API already exports scanner/parser/analyzer/generator/adapters; context exports must be added in the same style.
- Maintain co-located unit tests near implementation.

### References

- Source epic: `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project context rules: `_bmad-output/planning-artifacts/project-context.md`
- Architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Pattern rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Core exports: `packages/core/src/index.ts`
- Existing I/O pattern reference: `packages/core/src/adapters/jsonAdapter.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `runTests` targeted: `packages/core/src/context/loaders/jsonLoader.test.ts` + `packages/core/src/index.test.ts` → 10 passed, 0 failed
- `runTests` targeted: `packages/core/tests/cucumber.runner.test.ts` returned no runnable tests through tool filter (runner wiring updated in `packages/core/tests/run-cucumber.ts`)

### Completion Notes List

- Added new context module contracts in `packages/core/src/context/types.ts` with strict readonly metadata and record collection typing.
- Implemented `loadJsonContext(filePath)` with Bun file I/O, guarded JSON parsing, shape validation (`object` or `object[]`), normalization, and structured metadata output.
- Added public module wiring via `packages/core/src/context/index.ts` and package exports through `packages/core/src/index.ts`.
- Added unit tests covering happy paths, malformed JSON, missing files, invalid top-level JSON shapes, and metadata assertions.
- Added BDD coverage with feature scenarios, step definitions, Screenplay ability/tasks/questions, fixture files, and cucumber runner registration.

### File List

- `_bmad-output/implementation-artifacts/8-1-json-context-loader.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/context/types.ts`
- `packages/core/src/context/index.ts`
- `packages/core/src/context/loaders/jsonLoader.ts`
- `packages/core/src/context/loaders/jsonLoader.test.ts`
- `packages/core/src/index.ts`
- `packages/core/features/json-context-loader.feature`
- `packages/core/features/fixtures/context/users.single.json`
- `packages/core/features/fixtures/context/users.array.json`
- `packages/core/features/fixtures/context/users.malformed.json`
- `packages/core/features/step_definitions/json-context-loader.steps.ts`
- `packages/core/features/support/abilities/UseJsonContextLoader.ts`
- `packages/core/features/support/tasks/JsonContextLoaderTasks.ts`
- `packages/core/features/support/questions/JsonContextLoaderQuestions.ts`
- `packages/core/features/support/screenplay/Actors.ts`
- `packages/core/tests/run-cucumber.ts`

## Change Log

- 2026-03-04: Fixed CRITICAL and LOW issues surfaced during ADVERSARIAL Senior Developer code review. Applied `Result<T, E>` pattern to validation operations and enforced deep immutability for typed contexts. Story advanced to `done`.
- 2026-03-04: Implemented Story 8.1 JSON context loading end-to-end (types, loader, exports, unit tests, BDD assets, and runner wiring); story advanced to `review`.