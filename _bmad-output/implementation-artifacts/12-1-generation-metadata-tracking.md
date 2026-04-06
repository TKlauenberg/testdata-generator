# Story 12.1: Generation Metadata Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA tester,
I want metadata included with generated data,
so that I know when and how the data was created.

The current codebase already has three partial metadata seams: `JsonAdapter` writes a metadata envelope for direct adapter usage, `saveAsContext()` persists a related metadata block for saved contexts, and the CLI collects enough information to know the source file, count, seed, and output format. Story 12.1 should unify those seams into one coherent generation-metadata contract instead of introducing another disconnected metadata shape. The implementation must also close the current behavior gap where CLI JSON output bypasses `JsonAdapter`, while CSV and SQL output paths currently emit no generation metadata at all.

## Acceptance Criteria

1. Given I generate test data, when generation completes, then output includes a metadata section with generation details.
2. Metadata includes generation timestamp in ISO 8601 format.
3. Metadata includes source pattern file path.
4. Metadata includes pattern version or hash for change tracking.
5. Metadata includes generation options including count, seed, and format.
6. Metadata includes the `testdata-generator` version used for generation.
7. JSON output includes metadata as a header object.
8. CSV output includes metadata as a comment header.
9. SQL output includes metadata as SQL comments.
10. Unit tests verify metadata structure.
11. Gherkin tests verify metadata is present in all formats.

## Tasks / Subtasks

- [x] Define one canonical generation metadata contract and lineage policy instead of adding another ad hoc envelope (AC: 1, 2, 3, 4, 5, 6)
  - [x] Reuse and extend the existing metadata vocabulary in `packages/core/src/adapters/types.ts` and `packages/core/src/context/types.ts` so JSON output, CSV output, SQL output, and saved context files describe the same core fields.
  - [x] Include at minimum `timestamp`, `sourcePattern`, `version`, `count`, `format`, and optional `seed`, while deciding explicitly whether the pattern identity field is a version string, deterministic content hash, or both.
  - [x] Define the Epic 11 carry-forward rule for composed inputs up front: imported files, workspace generators, and schema inheritance must either contribute directly to metadata identity/hash or be preserved as explicit lineage fields so later Story 12.3 does not need to retrofit trustworthiness.

- [x] Thread metadata through the existing generation and formatting flow without changing generated record payloads (AC: 1, 2, 3, 5, 6, 7, 8, 9)
  - [x] Keep `generateData()` returning `AsyncIterable<Record<string, unknown>>`; metadata belongs in output formatting and persistence layers, not inside each generated record.
  - [x] Add a shared metadata-construction seam that can be called from CLI output formatting and any direct adapter usage, instead of duplicating timestamp/version/source logic in several files.
  - [x] Update `packages/cli/src/commands/generate.ts` so JSON output no longer bypasses the metadata-aware path for normal CLI output.
  - [x] Ensure the CLI computes metadata once from the real schema path, effective count, optional seed, selected format, package version, and chosen pattern identity field, then passes that metadata into the relevant formatter/adapter.

- [x] Extend output adapters consistently across JSON, CSV, and SQL (AC: 7, 8, 9)
  - [x] Preserve the existing JSON envelope shape of `{"metadata": ..., "data": [...]}` for array output and the `_metadata` first-line convention for JSONL, but make CLI JSON output use the same contract.
  - [x] Extend `CsvAdapterOptions` and `SqlAdapterOptions` to accept metadata, and emit deterministic comment headers before the data body.
  - [x] Use a CSV comment convention that is machine-readable and stable, and teach the existing CSV loader to ignore or parse those leading metadata comment lines so current CSV round-trip behavior remains valid.
  - [x] Emit SQL metadata as leading `-- ...` comments that do not interfere with existing SQL execution tests.

- [x] Establish deterministic pattern identity for Story 12.1 without overreaching into full history tooling (AC: 4)
  - [x] Prefer a pure helper that derives the identity from source content and explicitly chosen lineage inputs rather than filesystem timestamps, git state, or mutable environment data.
  - [x] Keep the hash/version behavior deterministic and unit-testable so Story 12.3 can build on it rather than rewrite it.
  - [x] Do not implement `td diff` or history querying in this story; those belong to Stories 12.2 and 12.3.

- [x] Add regression coverage in both unit and BDD harnesses, including current round-trip and CLI behaviors (AC: 10, 11)
  - [x] Extend adapter unit tests under `packages/core/src/adapters/` to verify metadata presence, structure, escaping, and format-specific rendering for JSON, CSV, and SQL.
  - [x] Extend loader tests if CSV comment headers require parser adjustments.
  - [x] Extend `packages/core/features/csv-output-adapter.feature` and `packages/core/features/sql-output-adapter.feature` so the acceptance layer verifies metadata comments while preserving current loadability and SQL executability.
  - [x] Extend CLI tests and `packages/cli/features/generateCommand.feature` to verify metadata appears in JSON, CSV, and SQL output from the actual command path.

- [x] Keep documentation impact explicit while scoping the implementation to metadata tracking only (AC: 1, 4, 7, 8, 9)
  - [x] Update `docs/api.md` if the programmatic output examples or adapter usage examples change.
  - [x] Update `docs/configuration.md` only if metadata behavior becomes configurable in this story.
  - [x] Update `docs/foundation-patterns.md` if the project begins documenting metadata lineage or pattern identity rules as user-facing behavior.
  - [x] Do not add history logging, `--no-history`, `td history`, or platform-export flags in Story 12.1.

### Review Findings

- [x] [Review][Patch] Generated JSON metadata envelopes no longer load as JSON context [packages/core/src/context/loaders/jsonLoader.ts:44]
- [x] [Review][Patch] `--save-context` drops the new seed, patternHash, and lineage metadata fields [packages/cli/src/commands/generate.ts:316]

## Dev Notes

### Story Foundation

- Epic 12 is the platform-readiness and auditability epic. Story 12.1 is the first implementation step and must define trustworthy generation metadata before Stories 12.2 and 12.3 build history logging and pattern diffing on top of it.
- The PRD already requires generated data metadata for traceability and future platform lift through FR23 and FR30, including timestamp, source pattern, version information, and generation parameters.
- Epic 11 retrospective guidance is directly relevant here: metadata and version tracking must model composed reality, not only single-file generation. Imports, workspace generators, and inheritance now exist in the product and cannot be ignored in the audit trail.
- No dedicated UX planning artifact matching `*ux*.md` exists in planning artifacts. User-visible behavior should therefore follow the epic acceptance criteria, existing CLI feature expectations, and current data-format conventions.

### Technical Requirements

- `packages/core/src/adapters/types.ts` already defines `AdapterMetadata`, but only `JsonAdapterOptions` currently accept metadata. Extend the shared adapter contract rather than creating format-specific metadata shapes.
- `packages/core/src/adapters/jsonAdapter.ts` already writes metadata envelopes for both array JSON and JSONL. Reuse that contract and push CLI JSON output through it instead of maintaining a second plain-array JSON path.
- `packages/core/src/adapters/csvAdapter.ts` and `packages/core/src/adapters/sqlAdapter.ts` currently accept only structural output options and emit no metadata. Story 12.1 should add metadata support there instead of adding a separate wrapper file format outside the adapters.
- `packages/cli/src/commands/generate.ts` currently writes raw JSON arrays for CLI JSON output and only uses adapters for CSV and SQL. That means metadata is currently inconsistent across output paths. Fix the root cause in the CLI formatting seam.
- `packages/core/src/context/contextManager.ts` and `packages/core/src/context/types.ts` already persist `timestamp`, `sourcePattern`, `count`, `version`, and `tags` for saved contexts. Keep Story 12.1 aligned with that vocabulary so saved context metadata and generated output metadata do not drift apart.
- `packages/core/src/version.ts` and the root `package.json` define the current package version as `0.1.0`; use the existing version source rather than hardcoding or introducing a second version constant.
- `packages/core/src/generateData.ts` and Story 11.1 already thread `currentFile` and `workspaceRoot` through validation and generation entry points. Reuse that path for metadata source resolution and composed-pattern lineage; do not invent a parallel file-resolution mechanism.
- If CSV metadata comments are added, `packages/core/src/context/loaders/csvLoader.ts` must ignore or deliberately parse those comment lines; otherwise Story 10.1 round-trip behavior will regress immediately.
- Any pattern hash helper introduced for this story should be pure, deterministic, and isolated in core, with a single export surface through `index.ts` if it becomes part of the public API.

### Architecture Compliance

- Preserve the existing pipeline boundaries: scan -> parse -> import resolution -> analyze -> generate -> format/write.
- Keep metadata generation in core-friendly utility and adapter layers, with CLI orchestration supplying runtime inputs. Core must not depend on CLI.
- Preserve strict TypeScript, ESM-only modules, and Result-based error handling for fallible operations.
- Do not change `generateData()` to yield metadata-wrapped records. Public generation remains record-stream-first; metadata is an output concern.
- Keep this story scoped to metadata tracking. History logging, platform export, and pattern-diff commands belong to later Epic 12 stories.

### Library / Framework Requirements

- Runtime and tests remain Bun-first. Current Bun test-runner guidance still supports `bun test`, path filters, and `--test-name-pattern`, which matches this repository's targeted test workflow.
- Language and tooling remain the versions currently pinned in the workspace: TypeScript `^5.9.3`, ESLint `^9.39.2`, Prettier `^3.7.4`, and `@types/bun` `^1.3.5`.
- Commander is currently pinned at `^14.0.2` in the repo while the latest published release is `14.0.3`. This story is metadata and output-path work, so there is no justification to upgrade Commander as part of Story 12.1.
- Do not add third-party CSV, hashing, audit, or metadata libraries unless a concrete requirement cannot be met with current Bun and TypeScript capabilities.

### File Structure Requirements

Primary implementation files likely to change:

- `packages/core/src/adapters/types.ts`
- `packages/core/src/adapters/jsonAdapter.ts`
- `packages/core/src/adapters/csvAdapter.ts`
- `packages/core/src/adapters/sqlAdapter.ts`
- `packages/core/src/context/contextManager.ts` only if saved-context metadata should share a new common type or helper
- `packages/core/src/context/types.ts`
- `packages/core/src/context/loaders/csvLoader.ts`
- `packages/cli/src/commands/generate.ts`
- one new shared helper under `packages/core/src/common/` or `packages/core/src/adapters/` if needed for deterministic metadata construction or hashing

Primary unit-test files likely to change:

- `packages/core/src/adapters/jsonAdapter.test.ts`
- `packages/core/src/adapters/csvAdapter.test.ts`
- `packages/core/src/adapters/sqlAdapter.test.ts`
- `packages/core/src/context/loaders/csvLoader.test.ts`
- `packages/core/src/generateData.test.ts`
- `packages/cli/src/commands/generate.test.ts`

BDD coverage and support files likely to change:

- `packages/core/features/csv-output-adapter.feature`
- `packages/core/features/sql-output-adapter.feature`
- `packages/core/features/support/abilities/UseCsvAdapter.ts`
- `packages/core/features/support/abilities/UseSqlAdapter.ts`
- `packages/cli/features/generateCommand.feature`
- `packages/cli/features/step_definitions/generateCommand.steps.ts`

Likely unnecessary unless failing tests prove otherwise:

- parser or scanner files
- analyzer validation rules unrelated to lineage identity
- CLI config loading unless metadata behavior becomes configurable
- history-command files that do not exist yet

### Testing Requirements

- Unit tests must verify required metadata fields for JSON, CSV, and SQL outputs, including ISO 8601 timestamps, source pattern, version, format, count, and optional seed.
- Unit tests must verify deterministic pattern identity behavior and explicitly document which inputs contribute to the hash or version field.
- Unit tests must verify CLI JSON output now includes metadata in the same structural contract as direct JSON adapter output.
- Unit tests must verify CSV outputs remain round-trippable through the existing CSV loader after comment headers are added.
- Unit tests must verify SQL metadata comments do not break the existing SQL execution path.
- Core BDD scenarios must prove metadata presence in CSV and SQL while preserving current user-observable behavior.
- CLI BDD scenarios must prove metadata appears in generated JSON, CSV, and SQL command outputs, including inferred-format paths.
- Continue using the active core Cucumber runner in `packages/core/tests/run-cucumber.ts`; do not add dormant feature files that are never executed.

### Previous Story Intelligence

- Story 11.1 established `currentFile` and `workspaceRoot` threading through `validateSchema()` and `generateData()`. Reuse that seam for source-pattern and composed-lineage metadata.
- Story 10.3 added multi-format CLI output support but left formatting logic split between raw JSON serialization and adapter-driven CSV/SQL output. Story 12.1 should remove that inconsistency rather than layering metadata on top of it.
- Epic 11 retrospective explicitly warned that imports, shared generators, and schema extension must count toward trustworthy metadata, history, and version tracking.
- Repository memory confirms `packages/core/tests/run-cucumber.ts` is the active core BDD runner and new or changed core acceptance scenarios must stay wired there.

### Git Intelligence Summary

- Recent history shows the expected workflow sequence continuing through Epic 11: `76ff1f4 create story 11.4`, `5f51daf dev-story 11.4`, `6888116 code review story 11.4`, and `90d8318 retrospective epic 11`.
- Practical implication: keep Story 12.1 tightly scoped, implementation-focused, and explicit about docs and test wiring so it fits the recent create-story -> dev-story -> code-review cadence without leaving ambiguity for later review.

### Latest Technical Information

- Current Bun test documentation still recommends `bun test`, path filters, and `--test-name-pattern` for focused runs, which aligns with this repository's existing targeted validation approach.
- The latest published Commander release is `14.0.3`, but the repo remains pinned to `^14.0.2`; that delta is not material to metadata tracking work.
- No external package upgrade is required to implement deterministic metadata generation, output comments, or focused Bun-based regression tests.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern handling for fallible operations.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/adapters/jsonAdapter.ts` already has the correct metadata envelope concept for JSON, but `packages/cli/src/commands/generate.ts` bypasses it for standard JSON output.
- `packages/core/src/adapters/csvAdapter.ts` and `packages/core/src/adapters/sqlAdapter.ts` currently emit only data payloads, so Story 12.1 must extend them instead of creating a sidecar metadata file.
- `packages/core/src/context/contextManager.ts` already writes metadata-rich saved context envelopes. That is useful prior art and should stay structurally aligned with output metadata.
- `packages/core/src/context/loaders/csvLoader.ts` currently expects the first non-blank row to be the CSV header row. Leading metadata comments will require loader awareness.
- `packages/core/features/csv-output-adapter.feature` and `packages/core/features/sql-output-adapter.feature` already exercise round-trip and SQL execution behavior; they are the right places to add acceptance checks without inventing redundant features.
- `packages/cli/features/generateCommand.feature` already covers default JSON, inferred CSV, inferred SQL, and precedence behavior. Extend that live feature rather than creating a separate dormant CLI metadata feature.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-12-platform-ready-metadata-audit-trail.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Project boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Epic 11 retrospective: `_bmad-output/implementation-artifacts/epic-11-retro-2026-04-05.md`
- Repository memory: `/memories/repo/testing-notes.md`
- Package versions: `package.json`
- Version constant: `packages/core/src/version.ts`
- Adapter contracts: `packages/core/src/adapters/types.ts`
- JSON adapter: `packages/core/src/adapters/jsonAdapter.ts`
- CSV adapter: `packages/core/src/adapters/csvAdapter.ts`
- SQL adapter: `packages/core/src/adapters/sqlAdapter.ts`
- CSV loader: `packages/core/src/context/loaders/csvLoader.ts`
- Saved context manager: `packages/core/src/context/contextManager.ts`
- Saved context types: `packages/core/src/context/types.ts`
- Public generation API: `packages/core/src/generateData.ts`
- CLI generate command: `packages/cli/src/commands/generate.ts`
- Core CSV feature: `packages/core/features/csv-output-adapter.feature`
- Core SQL feature: `packages/core/features/sql-output-adapter.feature`
- CLI generate feature: `packages/cli/features/generateCommand.feature`
- Active core BDD runner: `packages/core/tests/run-cucumber.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Plan

- Define a single metadata contract and deterministic pattern identity rule before editing output code.
- Move CLI JSON formatting onto the same metadata-aware path as direct JSON adapter usage.
- Extend CSV and SQL adapters to render metadata comments without breaking loader round-trips or SQL execution.
- Add focused unit and BDD regression coverage in the existing live feature and test harnesses.

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `12-1-generation-metadata-tracking`.
- Discovery sources loaded: BMM config, full sprint status, Epic 12 shard, PRD FR23/FR30/FR31 section, architecture shards, project context, repository memory, Epic 11 retrospective, current adapter/context/CLI code, active core BDD runner, CLI generate feature, recent git history, and current Bun and Commander reference pages.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- Current implementation gap confirmed: JSON metadata exists only through direct `JsonAdapter` usage, CLI JSON output bypasses that path, and CSV/SQL outputs currently emit no metadata.
- Current regression risk confirmed: CSV comment headers will break the existing CSV loader unless the loader is updated to ignore or parse them deliberately.
- Implemented canonical metadata in `packages/core/src/common/generationMetadata.ts`, with deterministic `patternHash` generation from explicit lineage inputs and reusable comment encoding helpers.
- Routed CLI generation through `validateSchema()` + `generate()` so metadata is built once from resolved declarations, imported source files, and configured workspace generators before any formatter runs.
- Validation executed successfully with `bun run test:core`, `bun run test:cli`, `bun run --cwd packages/core test:bdd`, `bun run --cwd packages/cli test:bdd`, and `bun run lint`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story file created for `12-1-generation-metadata-tracking` with status `ready-for-dev`.
- Sprint tracking advanced Epic 12 from `backlog` to `in-progress` and Story 12.1 from `backlog` to `ready-for-dev`.
- Added a shared generation metadata contract with deterministic lineage-aware hashing, encoded metadata comments, and aligned context metadata fields.
- CLI JSON, CSV, and SQL outputs now all pass through metadata-aware adapters; CLI JSON no longer bypasses the adapter path.
- CSV output now emits a machine-readable metadata comment that `loadCsvContext()` parses without breaking round-trip behavior; SQL output emits leading metadata comments that preserve execution behavior.
- Expanded unit, CLI, and BDD coverage for JSON envelopes, CSV comments, SQL comments, save-context interactions, and direct adapter usage; updated API docs to show metadata-aware adapter usage.

### File List

- `_bmad-output/implementation-artifacts/12-1-generation-metadata-tracking.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/api.md`
- `packages/cli/features/generateCommand.feature`
- `packages/cli/features/step_definitions/generateCommand.steps.ts`
- `packages/cli/features/step_definitions/saveGeneratedContext.steps.ts`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/core/features/csv-output-adapter.feature`
- `packages/core/features/sql-output-adapter.feature`
- `packages/core/features/step_definitions/csv-output-adapter.steps.ts`
- `packages/core/features/support/abilities/UseCsvAdapter.ts`
- `packages/core/features/support/abilities/UseSqlAdapter.ts`
- `packages/core/features/support/questions/CsvAdapterQuestions.ts`
- `packages/core/features/support/tasks/CsvAdapterTasks.ts`
- `packages/core/features/support/tasks/SqlAdapterTasks.ts`
- `packages/core/src/adapters/csvAdapter.test.ts`
- `packages/core/src/adapters/csvAdapter.ts`
- `packages/core/src/adapters/jsonAdapter.test.ts`
- `packages/core/src/adapters/jsonAdapter.ts`
- `packages/core/src/adapters/sqlAdapter.test.ts`
- `packages/core/src/adapters/sqlAdapter.ts`
- `packages/core/src/adapters/types.test.ts`
- `packages/core/src/adapters/types.ts`
- `packages/core/src/common/generationMetadata.test.ts`
- `packages/core/src/common/generationMetadata.ts`
- `packages/core/src/common/index.ts`
- `packages/core/src/context/contextManager.ts`
- `packages/core/src/context/loaders/csvLoader.test.ts`
- `packages/core/src/context/loaders/csvLoader.ts`
- `packages/core/src/context/loaders/jsonLoader.ts`
- `packages/core/src/context/types.ts`
- `packages/core/src/generateData.test.ts`

### Change Log

- 2026-04-05: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-05: Implemented canonical generation metadata, deterministic lineage-aware hashing, metadata-aware CLI output formatting, and CSV/SQL metadata comments.
- 2026-04-05: Added unit and BDD regression coverage for metadata across adapters and CLI output paths, and updated API documentation.