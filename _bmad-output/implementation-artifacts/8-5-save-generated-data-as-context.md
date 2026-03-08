# Story 8.5: Save Generated Data as Context

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to save generated data as context for future generations**,
so that **I can build incremental test scenarios**.

## Acceptance Criteria

1. A `saveAsContext(records: Record[], name: string, tags?: string[]): Promise<void>` function exists in `packages/core/src/context/contextManager.ts`.
2. Generated data is saved in JSON format with metadata.
3. Metadata includes generation timestamp, source pattern, version, and tags.
4. Saved context can be loaded in subsequent generations.
5. The CLI supports `--save-context <name>` for `td generate`.
6. Context files are stored in a configurable directory with default `./contexts/`.
7. Unit tests verify context save and load roundtrip.
8. Gherkin tests verify the end-to-end workflow: generate, save, and reference in a new generation.

## Tasks / Subtasks

- [x] Add saved-context persistence contracts in the core context module (AC: 1, 2, 3, 4)
  - [x] Extend `packages/core/src/context/types.ts` with a saved-context envelope/type that can represent `{ metadata, data }` without weakening existing `ContextData` contracts.
  - [x] Keep the required `saveAsContext(records, name, tags?)` public API in `packages/core/src/context/contextManager.ts`; if extra inputs such as destination directory or source pattern are needed, add them via an optional fourth options parameter or an internal helper without breaking the required call shape.
  - [x] Sanitize or validate context names so CLI-provided names cannot escape the target directory or create invalid filenames.

- [x] Implement JSON save and backward-compatible JSON load behavior (AC: 1, 2, 3, 4, 7)
  - [x] Implement `saveAsContext()` in `packages/core/src/context/contextManager.ts` using Bun file APIs and the existing normalized tag behavior.
  - [x] Persist saved context as a JSON object with top-level `metadata` and `data` fields rather than a raw array.
  - [x] Update `packages/core/src/context/loaders/jsonLoader.ts` so it can load both legacy raw object/array JSON and the new saved-context envelope while preserving clear errors for malformed files.
  - [x] Ensure metadata round-trips into `ContextData.metadata` so later loads can retain source, tags, and record count from saved context files.

- [x] Reuse existing metadata/version sources instead of inventing a second format (AC: 2, 3)
  - [x] Reuse the existing version export from `packages/core/src/index.ts` and align saved-context metadata naming with established adapter metadata semantics from `packages/core/src/adapters/types.ts` / `packages/core/src/adapters/jsonAdapter.ts`.
  - [x] Include source-pattern metadata from the generating schema path when the save is initiated from the CLI.
  - [x] Keep timestamp fields ISO 8601 and tag normalization case-insensitive, matching Story 8.4 behavior.

- [x] Wire save-context support into the CLI generate flow without duplicating generation work (AC: 4, 5, 6)
  - [x] Extend `packages/cli/src/commands/generate.ts` with `--save-context <name>` and a directory control that keeps the default at `./contexts/` while remaining intentionally scoped for this story.
  - [x] Use the records already collected by `td generate`; do not re-run generation just to save context.
  - [x] Resolve the destination directory relative to the CLI working directory, create it when missing, and write `<name>.json` into it.
  - [x] Keep the main generate command output behavior unchanged: saving context is an additional side effect, not a replacement for stdout or `--output`.

- [x] Keep implementation scoped and compatible with existing context features (AC: 4, 5, 6)
  - [x] Preserve Story 8.1-8.4 behavior for loading JSON/CSV context, tagged context selection, and context references.
  - [x] Do not introduce the broader workspace/global configuration system planned for Epic 9 just to satisfy the configurable-directory requirement; implement the smallest focused path needed here.
  - [x] Ensure generated context saved from one run can be passed back through existing `loadContext()` and `GenerateOptions.context` flows without special-case consumer code.

- [x] Add focused core and CLI unit coverage (AC: 7)
  - [x] Add roundtrip tests in `packages/core/src/context/contextManager.test.ts` and/or loader tests covering save, reload, metadata preservation, normalized tags, empty records, and malformed envelope handling.
  - [x] Add CLI tests in `packages/cli/src/commands/generate.test.ts` covering `--save-context`, default directory creation, configurable directory override, and coexistence with `--output`.
  - [x] Add regression tests proving legacy raw JSON context files still load after the envelope format is introduced.

- [x] Add BDD coverage for the user workflow (AC: 8)
  - [x] Add a core feature under `packages/core/features/` for generated-context roundtrip behavior and register it in `packages/core/tests/run-cucumber.ts`.
  - [x] Add any required step definitions and Screenplay support under `packages/core/features/step_definitions/` and `packages/core/features/support/`.
  - [x] Add or extend CLI feature coverage under `packages/cli/features/` if the flag behavior is best proven at the command boundary.

## Dev Notes

### Story Foundation

- Epic 8 now has the full context chain in place except persistence: load JSON/CSV (8.1, 8.2), reference context (8.3), tag/filter context (8.4), and now save generated output for reuse (8.5).
- The business goal is incremental scenario building: generate a baseline dataset once, persist it as named context, then use it in later schemas without manual copy/paste.
- The live repo already has `loadContext()` plus tag-aware context metadata, but it does **not** yet have any save API or CLI persistence path for context.
- The live JSON loader currently accepts only raw object/array payloads. Story 8.5 must add support for saved-context envelopes without breaking those existing inputs.

### Technical Requirements

- Runtime and language remain Bun 1.x, TypeScript strict mode, and ESM-only modules.
- Keep existing error-handling boundaries: core validation uses `Result<T, Diagnostic[]>` where expected, and file-system/runtime failures remain explicit `Error` paths with actionable messages.
- Preserve immutable readonly contracts in new context types and avoid `any`.
- Normalize tags through the existing `normalizeContextTags()` path so saved context and loaded context behave identically.
- Treat context persistence as JSON-first and metadata-rich; do not add a database layer, plugin system, or alternate persistence backend in this story.

### Architecture Compliance

- Keep persistence logic in `packages/core/src/context/`; the CLI should orchestrate the feature, not implement serialization rules itself.
- Reuse the existing context module entry points and exports through `packages/core/src/context/index.ts` and `packages/core/src/index.ts` only.
- Preserve existing module boundaries: CLI may call core APIs and write files, but core must not depend on CLI.
- Keep the generator pipeline unchanged: `generateData()` / `generate()` still generate records, while context persistence remains an adjacent operation after records are produced.
- Favor compatibility with the current architecture over the aspirational structure in planning docs where config modules exist; the live repo does not yet have that broader CLI config infrastructure.

### Library / Framework Requirements

- Reuse the repository-pinned stack already present: Bun, TypeScript, Commander.js, Cucumber, and SerenityJS.
- Reuse the version export from `packages/core/src/index.ts` and the existing adapter metadata conventions from `packages/core/src/adapters/types.ts` and `packages/core/src/adapters/jsonAdapter.ts`.
- No new external dependency is required for persistence, path handling, or JSON serialization.
- External web lookup was not available in this environment, so version and library guidance is derived from repository-pinned sources only.

### File Structure Requirements

- Existing files likely to update:
  - `packages/core/src/context/contextManager.ts`
  - `packages/core/src/context/contextManager.test.ts`
  - `packages/core/src/context/types.ts`
  - `packages/core/src/context/index.ts`
  - `packages/core/src/context/loaders/jsonLoader.ts`
  - `packages/core/src/context/loaders/jsonLoader.test.ts`
  - `packages/core/src/index.ts`
  - `packages/cli/src/commands/generate.ts`
  - `packages/cli/src/commands/generate.test.ts`
  - `packages/core/tests/run-cucumber.ts`
- Likely new files:
  - `packages/core/features/generated-context-roundtrip.feature`
  - `packages/core/features/step_definitions/generated-context-roundtrip.steps.ts`
  - Supporting Screenplay files under `packages/core/features/support/` if the existing `UseGenerateDataAPI` ability is not enough
  - CLI feature updates under `packages/cli/features/` only if command-level BDD adds clear value

### Testing Requirements

- Unit tests must verify:
  - saving records writes a JSON envelope with metadata and data,
  - saved context loads back through `loadContext()` without custom caller logic,
  - metadata fields include timestamp, source pattern, version, and normalized tags,
  - legacy raw JSON object/array context files still load,
  - invalid saved-context envelopes fail with clear errors,
  - CLI save-context writes to the default `./contexts/` directory and a caller-provided directory,
  - `--save-context` works together with regular generate output behavior.
- BDD tests must verify the end-to-end user journey: generate records, save them as named context, then reference that saved context in a subsequent schema generation.

### Previous Story Intelligence (Story 8.4)

- Story 8.4 established `contextManager.ts` as the orchestration layer and normalized tags at load boundaries. Story 8.5 should extend that same layer rather than creating a parallel persistence module.
- Story 8.4 also introduced tagged context metadata and case-insensitive tag behavior. Saved-context metadata must preserve those rules so later `loadContext()` calls behave consistently.
- The previous implementation already proved that end-to-end context behavior belongs in focused core BDD tests plus targeted unit tests. Reuse that testing split here.
- Story 8.4 updated the Cucumber allowlist manually in `packages/core/tests/run-cucumber.ts`; Story 8.5 must do the same for any new core feature file.

### Git Intelligence Summary

- Recent repo history shows the current context implementation sequence is fresh and should be extended incrementally:
  - `7e3bf40` code review story 8.4
  - `4ff3755` dev-story 8.4
  - `e4867e0` create-story 8.4
  - `44a0f8e` code-review story 8.3
  - `7504574` dev-story 8.3
- Implication: do not refactor the whole context stack. Build directly on the new context manager, selector, reference, and CLI generate patterns that were just stabilized.

### Latest Technical Information

- External web research was not available in this environment.
- Repository-pinned versions are sufficient for this story, and no upgrade or migration work is needed to satisfy the acceptance criteria.

### Project Context Reference

- Follow `_bmad-output/planning-artifacts/project-context.md` rules:
  - strict TypeScript, no `any`, ESM-only modules,
  - exports through `index.ts` barrels,
  - co-located unit tests and BDD coverage for acceptance criteria,
  - Bun-based file and test workflows.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Patterns/rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/8-4-context-tagging-and-filtered-selection.md`
- Sprint state: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Live core context manager: `packages/core/src/context/contextManager.ts`
- Live JSON loader: `packages/core/src/context/loaders/jsonLoader.ts`
- Live generate command: `packages/cli/src/commands/generate.ts`
- Live adapter metadata shape: `packages/core/src/adapters/types.ts`
- Live JSON adapter: `packages/core/src/adapters/jsonAdapter.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Context assembled from sprint status, Epic 8, PRD, project-context rules, architecture shards, Story 8.4 artifact, current core context sources, current CLI generate sources, adapter metadata sources, and recent git history.
- Discovery results used for this story: Epic 8 loaded from `_bmad-output/planning-artifacts/epics/epic-8-context-management.md`, PRD from `_bmad-output/planning-artifacts/prd.md`, architecture from `_bmad-output/planning-artifacts/architecture/`, project rules from `_bmad-output/planning-artifacts/project-context.md`, previous story from `_bmad-output/implementation-artifacts/8-4-context-tagging-and-filtered-selection.md`, and current implementation paths from `packages/core/src/context/` plus `packages/cli/src/commands/generate.ts`.
- No UX-specific artifact was present for this story.
- External web lookup was not available in this environment.
- Added a saved-context envelope contract plus `saveAsContext()` in the core context manager, and updated `loadContext()`/`loadJsonContext()` to preserve saved metadata while remaining backward compatible with raw JSON context files.
- Added CLI `--save-context` and `--save-context-dir` support in `td generate` without changing existing stdout or `--output` behavior, using the already generated record collection.
- Verified Story 8.5 with focused unit tests, the core and CLI Cucumber runners, and a full `bun test packages/` regression run after code-review fixes.

### Implementation Plan

- Add a saved-context envelope and persistence API in the core context manager.
- Make the JSON loader understand both legacy raw JSON context and the new saved-context envelope.
- Extend `td generate` with `--save-context` and a focused directory-control path without introducing the full Epic 9 config system.
- Add roundtrip unit coverage and end-to-end BDD coverage for generate, save, load, and reuse.

### Completion Notes List

- Implemented saved-context persistence in `packages/core/src/context/` with validated names, JSON envelope output, metadata/version reuse, and metadata-preserving reload behavior for subsequent context usage.
- Extended `td generate` with `--save-context` plus `--save-context-dir`, writing `<name>.json` into a default `./contexts/` directory or a caller-provided override without re-running generation.
- Added unit coverage for save/load roundtrip, legacy JSON compatibility, malformed envelopes, empty saved contexts, and CLI save-context behavior.
- Added a core BDD roundtrip scenario covering generate, save, load, and reuse through an `@context` reference in a follow-up generation.
- Applied code review fixes for legacy JSON envelope detection, platform-safe context-name validation, and real CLI command-boundary BDD coverage for `--save-context`.
- Full regression tests passed with `bun test packages/`, alongside the core and CLI Cucumber runners.

### Senior Developer Review (AI)

- Outcome: **Approved after fixes**
- Issues fixed automatically (HIGH/MEDIUM):
  - Tightened saved-context envelope detection so legacy single-object JSON payloads that happen to contain `metadata` and `data` fields still load as raw context records unless they actually look like saved-context envelopes.
  - Hardened context-name validation against Windows-reserved device names and trailing-dot filenames so CLI-supplied names do not succeed on one platform and fail on another.
  - Added executable CLI BDD coverage for `td generate --save-context` at the command boundary while retaining the core BDD roundtrip that proves saved context can be reloaded and referenced in later generations.
- Validation:
  - Focused unit suites passed for `jsonLoader`, `contextManager`, and CLI `generate`.
  - Core Cucumber runner passed 57 scenarios / 289 steps.
  - CLI Cucumber runner passed 1 scenario / 7 steps.
  - Full repository test suite passed (`681 passed, 0 failed`).

### File List

- `_bmad-output/implementation-artifacts/8-5-save-generated-data-as-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/cli/package.json`
- `packages/cli/features/saveGeneratedContext.feature`
- `packages/cli/features/step_definitions/saveGeneratedContext.steps.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/tests/run-cucumber.ts`
- `packages/core/src/adapters/jsonAdapter.ts`
- `packages/core/features/generated-context-roundtrip.feature`
- `packages/core/features/step_definitions/generated-context-roundtrip.steps.ts`
- `packages/core/src/context/contextManager.ts`
- `packages/core/src/context/contextManager.test.ts`
- `packages/core/src/context/index.ts`
- `packages/core/src/context/loaders/jsonLoader.ts`
- `packages/core/src/context/loaders/jsonLoader.test.ts`
- `packages/core/src/context/types.ts`
- `packages/core/src/index.ts`
- `packages/core/src/version.ts`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-03-08: Created Story 8.5 context artifact via create-story workflow and set sprint status to `ready-for-dev`.
- 2026-03-08: Implemented Story 8.5 saved-context persistence, CLI save-context support, roundtrip unit coverage, and generated-context BDD coverage; set story and sprint status to `review`.
- 2026-03-08: Applied code review fixes for legacy JSON compatibility, platform-safe context naming, and CLI command-boundary BDD coverage; revalidated the story and advanced it to `done`.