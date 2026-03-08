# Story 8.5: Save Generated Data as Context

Status: ready-for-dev

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

- [ ] Add saved-context persistence contracts in the core context module (AC: 1, 2, 3, 4)
  - [ ] Extend `packages/core/src/context/types.ts` with a saved-context envelope/type that can represent `{ metadata, data }` without weakening existing `ContextData` contracts.
  - [ ] Keep the required `saveAsContext(records, name, tags?)` public API in `packages/core/src/context/contextManager.ts`; if extra inputs such as destination directory or source pattern are needed, add them via an optional fourth options parameter or an internal helper without breaking the required call shape.
  - [ ] Sanitize or validate context names so CLI-provided names cannot escape the target directory or create invalid filenames.

- [ ] Implement JSON save and backward-compatible JSON load behavior (AC: 1, 2, 3, 4, 7)
  - [ ] Implement `saveAsContext()` in `packages/core/src/context/contextManager.ts` using Bun file APIs and the existing normalized tag behavior.
  - [ ] Persist saved context as a JSON object with top-level `metadata` and `data` fields rather than a raw array.
  - [ ] Update `packages/core/src/context/loaders/jsonLoader.ts` so it can load both legacy raw object/array JSON and the new saved-context envelope while preserving clear errors for malformed files.
  - [ ] Ensure metadata round-trips into `ContextData.metadata` so later loads can retain source, tags, and record count from saved context files.

- [ ] Reuse existing metadata/version sources instead of inventing a second format (AC: 2, 3)
  - [ ] Reuse the existing version export from `packages/core/src/index.ts` and align saved-context metadata naming with established adapter metadata semantics from `packages/core/src/adapters/types.ts` / `packages/core/src/adapters/jsonAdapter.ts`.
  - [ ] Include source-pattern metadata from the generating schema path when the save is initiated from the CLI.
  - [ ] Keep timestamp fields ISO 8601 and tag normalization case-insensitive, matching Story 8.4 behavior.

- [ ] Wire save-context support into the CLI generate flow without duplicating generation work (AC: 4, 5, 6)
  - [ ] Extend `packages/cli/src/commands/generate.ts` with `--save-context <name>` and a directory control that keeps the default at `./contexts/` while remaining intentionally scoped for this story.
  - [ ] Use the records already collected by `td generate`; do not re-run generation just to save context.
  - [ ] Resolve the destination directory relative to the CLI working directory, create it when missing, and write `<name>.json` into it.
  - [ ] Keep the main generate command output behavior unchanged: saving context is an additional side effect, not a replacement for stdout or `--output`.

- [ ] Keep implementation scoped and compatible with existing context features (AC: 4, 5, 6)
  - [ ] Preserve Story 8.1-8.4 behavior for loading JSON/CSV context, tagged context selection, and context references.
  - [ ] Do not introduce the broader workspace/global configuration system planned for Epic 9 just to satisfy the configurable-directory requirement; implement the smallest focused path needed here.
  - [ ] Ensure generated context saved from one run can be passed back through existing `loadContext()` and `GenerateOptions.context` flows without special-case consumer code.

- [ ] Add focused core and CLI unit coverage (AC: 7)
  - [ ] Add roundtrip tests in `packages/core/src/context/contextManager.test.ts` and/or loader tests covering save, reload, metadata preservation, normalized tags, empty records, and malformed envelope handling.
  - [ ] Add CLI tests in `packages/cli/src/commands/generate.test.ts` covering `--save-context`, default directory creation, configurable directory override, and coexistence with `--output`.
  - [ ] Add regression tests proving legacy raw JSON context files still load after the envelope format is introduced.

- [ ] Add BDD coverage for the user workflow (AC: 8)
  - [ ] Add a core feature under `packages/core/features/` for generated-context roundtrip behavior and register it in `packages/core/tests/run-cucumber.ts`.
  - [ ] Add any required step definitions and Screenplay support under `packages/core/features/step_definitions/` and `packages/core/features/support/`.
  - [ ] Add or extend CLI feature coverage under `packages/cli/features/` if the flag behavior is best proven at the command boundary.

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

### Implementation Plan

- Add a saved-context envelope and persistence API in the core context manager.
- Make the JSON loader understand both legacy raw JSON context and the new saved-context envelope.
- Extend `td generate` with `--save-context` and a focused directory-control path without introducing the full Epic 9 config system.
- Add roundtrip unit coverage and end-to-end BDD coverage for generate, save, load, and reuse.

### Completion Notes List

- Auto-selected the first backlog story from sprint tracking: `8-5-save-generated-data-as-context`.
- Generated a ready-for-dev story artifact with explicit guardrails for backward-compatible JSON loading, reusable metadata formatting, and CLI save-context integration.
- Scoped the configurable-directory requirement to a focused Story 8.5 implementation rather than the broader configuration work planned for Epic 9.
- Updated sprint tracking for Story 8.5 to `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/8-5-save-generated-data-as-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-08: Created Story 8.5 context artifact via create-story workflow and set sprint status to `ready-for-dev`.