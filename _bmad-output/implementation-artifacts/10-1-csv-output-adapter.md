# Story 10.1: CSV Output Adapter

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate test data as CSV files**,
so that **I can import data into spreadsheets and databases**.

This story establishes the CSV output path in core only. CLI format selection belongs to Story 10.3.

## Acceptance Criteria

1. A `CsvAdapter` class exists in `packages/core/src/adapters/csvAdapter.ts` implementing the adapter interface.
2. The adapter consumes `AsyncIterable<Record<string, unknown>>` from the generator.
3. The adapter writes CSV headers from record field names.
4. The adapter properly escapes values containing commas, quotes, or newlines.
5. The adapter supports configurable delimiter with comma as the default.
6. The adapter writes incrementally for memory efficiency.
7. Nested objects are serialized as JSON strings in CSV cells.
8. The module exports through `packages/core/src/adapters/index.ts`.
9. Unit tests verify CSV formatting and escaping.
10. Gherkin tests verify CSV output can be re-imported correctly.

## Tasks / Subtasks

- [x] Implement the CSV adapter surface in core (AC: 1, 2, 5, 8)
  - [x] Create `packages/core/src/adapters/csvAdapter.ts` with a `CsvAdapter` class following the existing `JsonAdapter` constructor and `write()` shape.
  - [x] Extend `packages/core/src/adapters/types.ts` with `CsvAdapterOptions` rather than introducing a new `adapter.ts` abstraction.
  - [x] Export `CsvAdapter` and `CsvAdapterOptions` from `packages/core/src/adapters/index.ts`.
  - [x] Preserve the existing public API surface through `packages/core/src/index.ts` via `export * from './adapters';`.

- [x] Implement streaming CSV writing and canonical serialization rules (AC: 2, 3, 4, 5, 6, 7)
  - [x] Use `Bun.file(outputPath).writer()` and consume the `AsyncIterable` with `for await`.
  - [x] Capture header order from the first emitted record and keep that order stable for all subsequent rows.
  - [x] Escape fields according to CSV rules: quote fields containing delimiter, `"`, `\n`, or `\r`; double embedded quotes.
  - [x] Serialize arrays and objects with `JSON.stringify()` before CSV escaping.
  - [x] Preserve primitive values as text cells without inventing metadata rows or sidecar files.
  - [x] Do not buffer the full record set in memory before writing.

- [x] Add focused unit coverage for the adapter contract (AC: 3, 4, 5, 6, 7, 9)
  - [x] Create `packages/core/src/adapters/csvAdapter.test.ts` next to the implementation.
  - [x] Verify header emission and stable row ordering.
  - [x] Verify escaping for commas, quotes, CRLF, and multiline cell values.
  - [x] Verify custom delimiter output without breaking default comma behavior.
  - [x] Verify nested objects and arrays are emitted as JSON strings.
  - [x] Verify large streams are written successfully without array buffering.

- [x] Add BDD round-trip coverage using existing CSV loading infrastructure (AC: 10)
  - [x] Create `packages/core/features/csv-output-adapter.feature` for QA-facing acceptance scenarios.
  - [x] Add Screenplay support files for CSV output mirroring the JSON adapter test structure only where reuse is not practical.
  - [x] Reuse `packages/core/features/support/tasks/GenerateDataPublicAPITasks.ts` for record generation.
  - [x] Re-import default-delimiter CSV output with `loadCsvContext()` from `packages/core/src/context/loaders/csvLoader.ts` rather than creating a second parser in tests.
  - [x] Keep configurable-delimiter verification in unit tests unless the loader is explicitly extended in a separate story.

## Dev Notes

### Story Foundation

- Epic 10 adds non-JSON outputs and a programmatic API. Story 10.1 is the first output-format story and should create a reusable adapter pattern for Story 10.2 and CLI wiring in Story 10.3.
- The repo already contains a working `JsonAdapter` in `packages/core/src/adapters/jsonAdapter.ts`; this is the primary implementation reference and should be adapted, not reimagined.
- The story is intentionally scoped to `@testdata-generator/core`. Do not add CLI flags, output-format selection logic, or file-extension inference here; those belong to Story 10.3.
- Re-import correctness must align with the existing CSV context loader semantics, because that is the repo's current CSV reader.

### Technical Requirements

- Follow the existing adapter contract in `packages/core/src/adapters/types.ts`:

```typescript
export interface IAdapter {
  write(records: AsyncIterable<Record<string, unknown>>): Promise<void>;
}

export interface CsvAdapterOptions {
  readonly outputPath: string;
  readonly delimiter?: string;
}
```

- Match the established constructor-validation style from `JsonAdapter`: reject an empty `outputPath` early with a thrown `Error`.
- Use incremental writes with `Bun.file(...).writer()` exactly as `JsonAdapter` does. Do not use `Bun.write()` on an accumulated string for the full dataset.
- Header order should come from the first record's own property order. Assume the generator emits a stable schema shape; do not attempt mid-stream header expansion.
- For cell serialization:
  - Strings remain strings.
  - Numbers and booleans are stringified with `String(value)`.
  - Arrays and objects use `JSON.stringify(value)` before CSV escaping.
  - Fields containing delimiter, double quotes, carriage returns, or newlines must be quoted, and embedded `"` must be doubled to `""`.
- Do not copy JSON metadata behavior into CSV output. Metadata rows would break spreadsheet/database import and would violate the expected CSV shape.

### Architecture Compliance

- Prefer the live codebase over stale planning examples when they conflict:
  - The actual repo uses `packages/core/src/adapters/types.ts`, not `packages/core/src/adapters/adapter.ts`.
  - The actual repo uses per-adapter tests such as `jsonAdapter.test.ts`, not a single shared `adapters.test.ts`.
- Keep exports flowing through `packages/core/src/adapters/index.ts`; do not bypass the module export surface.
- Keep the implementation inside `packages/core/src/adapters/` and tests beside that code. Do not create a new output package or a cross-package utility for this story.
- Reuse the existing CSV parsing path in `packages/core/src/context/loaders/csvLoader.ts` for compatibility validation. The adapter should emit CSV that the current loader can parse when using the default comma delimiter.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language: TypeScript 5.9.x, ESM-only, strict mode.
- Tests: Bun test runner for unit tests, Cucumber 12.5.0 plus SerenityJS 3.37.1 Screenplay support for BDD tests.
- Dependencies: add no new CSV libraries. The escaping and serialization required here are straightforward and should be implemented locally.
- Use repo-pinned versions as authoritative for this story; do not opportunistically upgrade tooling while implementing the adapter.

### File Structure Requirements

Primary implementation surface:

- New files:
  - `packages/core/src/adapters/csvAdapter.ts`
  - `packages/core/src/adapters/csvAdapter.test.ts`
  - `packages/core/features/csv-output-adapter.feature`
  - `packages/core/features/step_definitions/csv-output-adapter.steps.ts`
  - `packages/core/features/support/abilities/UseCsvAdapter.ts`
  - `packages/core/features/support/tasks/CsvAdapterTasks.ts`
  - `packages/core/features/support/questions/CsvAdapterQuestions.ts`

- Modified files:
  - `packages/core/src/adapters/types.ts`
  - `packages/core/src/adapters/index.ts`
  - `packages/core/src/index.ts` only if a direct export adjustment is actually needed

### Testing Requirements

- Unit tests should cover:
  - default comma-delimited output
  - custom delimiter output
  - header generation from first record
  - quoted cells containing commas, quotes, CRLF, and embedded newlines
  - nested object and array serialization with `JSON.stringify()`
  - large-stream incremental writing behavior
- BDD tests should cover user-facing, round-trip behavior:
  - generate records through the public `generateData()` API
  - write them through `CsvAdapter`
  - load the written file back with `loadCsvContext()`
  - verify header fields and representative values survive round-trip parsing
- Important constraint: `loadCsvContext()` currently parses comma-delimited CSV only. That means:
  - default-delimiter re-import belongs in BDD coverage
  - configurable delimiter behavior belongs in unit tests for this story
- Do not create a second CSV parser in feature tests. Reuse the existing loader or `parseCsvStream()` utilities where appropriate.

### Related Existing Implementation Patterns

- `packages/core/src/adapters/jsonAdapter.ts` demonstrates the current adapter style: constructor option validation, `private readonly _...` members, Bun writer usage, and streaming writes.
- `packages/core/features/support/abilities/UseJsonAdapter.ts`, `packages/core/features/support/tasks/JsonAdapterTasks.ts`, and `packages/core/features/support/questions/JsonAdapterQuestions.ts` provide the existing Screenplay structure for an adapter-focused feature. Mirror the structure, but keep CSV-specific logic minimal.
- `packages/core/src/context/loaders/csvLoader.ts` already handles quoted commas, escaped quotes, CRLF, and primitive inference. Use it as the compatibility target for output correctness.

### Git Intelligence Summary

- Recent workflow cadence is consistent: `create story X.Y`, `dev-story X.Y`, then `code review story X.Y`. Keep the implementation aligned with that flow.
- Recent commits were focused on Epic 9 completion, so Story 10.1 should avoid unrelated cleanup and should remain a narrow, adapter-focused change set.

### Latest Technical Information

- Root tooling is currently pinned to TypeScript 5.9.3, ESLint 9.39.2, and Prettier 3.7.4 in `package.json`.
- Core BDD dependencies are currently pinned in `packages/core/package.json`: `@cucumber/cucumber` 12.5.0 and SerenityJS 3.37.1 packages.
- Commander.js 14.0.2 is present for CLI work, but no Commander changes are required in this story.

### Project Context Reference

Apply the project rules captured in `_bmad-output/planning-artifacts/project-context.md`:

- Bun-first execution, not Node-first implementation choices.
- Strict TypeScript, no `any`, ESM-only imports/exports.
- Public exports through `index.ts`.
- Co-located `*.test.ts` unit tests.
- Screenplay-pattern BDD for acceptance criteria.
- Private class members require both `private` and underscore prefix.

### Project Structure Notes

- Planning artifacts describe the intended long-term structure, but the live repo is the source of truth for this story.
- The important variance to preserve is the current adapter layout under `packages/core/src/adapters/` and the existing context loader path under `packages/core/src/context/loaders/`.
- If you encounter additional structure drift while implementing, prefer the pattern already used by adjacent code unless the story explicitly requires a structural correction.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-10-multi-format-output-programmatic-api.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architectural decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Existing adapter implementation: `packages/core/src/adapters/jsonAdapter.ts`
- Existing adapter types: `packages/core/src/adapters/types.ts`
- Existing adapter exports: `packages/core/src/adapters/index.ts`
- Existing public core exports: `packages/core/src/index.ts`
- Existing CSV loader: `packages/core/src/context/loaders/csvLoader.ts`
- Existing CSV loader tests: `packages/core/src/context/loaders/csvLoader.test.ts`
- Existing JSON adapter feature: `packages/core/features/json-output-adapter.feature`
- Existing JSON adapter step definitions: `packages/core/features/step_definitions/json-output-adapter.steps.ts`
- Existing JSON adapter Screenplay tasks: `packages/core/features/support/tasks/JsonAdapterTasks.ts`
- Existing JSON adapter Screenplay questions: `packages/core/features/support/questions/JsonAdapterQuestions.ts`
- Existing JSON adapter Screenplay ability: `packages/core/features/support/abilities/UseJsonAdapter.ts`
- Existing public API generation tasks: `packages/core/features/support/tasks/GenerateDataPublicAPITasks.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

Validation task file referenced by the workflow (`_bmad/core/tasks/validate-workflow.xml`) is not present in this repository snapshot, so checklist validation was performed manually during story creation.

- `bun run build` currently fails outside this story due to pre-existing TypeScript errors in `packages/core/features/support/tasks/RecordGenerationTasks.ts` and existing generator test typing issues, so the story was validated with focused source-level tests plus the core BDD suite and lint.

### Completion Notes List

- Implemented `CsvAdapter` with streaming header-first writes, configurable delimiter support, RFC-style CSV escaping, and JSON serialization for nested values.
- Added co-located Bun tests covering default and custom delimiters, quoting rules, nested serialization, empty streams, and large-stream incremental output.
- Added Screenplay-based CSV adapter BDD coverage that writes generated records through the public API and re-imports output through `loadCsvContext()`.
- Registered the CSV adapter Screenplay ability and Cucumber feature in the core acceptance-test runner.
- Fixed two lint-blocking issues encountered during validation so `bun run lint` now completes with warnings only.
- Fixed code review findings by truncating reused CSV output paths before writing, skipping leading empty records until headers are discovered, and strengthening BDD round-trip assertions for public-API generated values.

### File List

- `packages/core/src/adapters/csvAdapter.ts`
- `packages/core/src/adapters/csvAdapter.test.ts`
- `packages/core/src/adapters/types.ts`
- `packages/core/src/adapters/index.ts`
- `packages/core/features/csv-output-adapter.feature`
- `packages/core/features/step_definitions/csv-output-adapter.steps.ts`
- `packages/core/features/support/abilities/UseCsvAdapter.ts`
- `packages/core/features/support/tasks/CsvAdapterTasks.ts`
- `packages/core/features/support/questions/CsvAdapterQuestions.ts`
- `packages/core/features/support/screenplay/Actors.ts`
- `packages/core/features/support/abilities/ValidateSchemaAbility.ts`
- `packages/core/tests/run-cucumber.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-1-csv-output-adapter.md`

## Change Log

- 2026-03-11: Implemented the core CSV output adapter, added unit and BDD round-trip coverage, registered CSV Screenplay support, and updated story tracking to review.
- 2026-03-28: Fixed code review issues around CSV overwrite safety, leading empty-record handling, stronger public-API round-trip assertions, and synchronized story tracking to done.

## Senior Developer Review (AI)

### Reviewer

Tobi

### Date

2026-03-28

### Outcome

Approved after fixes.

### Review Notes

- Fixed a real overwrite bug in `CsvAdapter` where reusing an existing output path could leave stale bytes in the file and break CSV re-import on subsequent runs.
- Fixed a header-discovery bug in `CsvAdapter` where a leading empty record caused silent data loss for all later rows.
- Extended CSV BDD coverage so the public `generateData()` path now verifies representative round-tripped field values and types, not just field presence.
- Updated the story file list and sprint tracking so the implementation record matches the actual repository changes.