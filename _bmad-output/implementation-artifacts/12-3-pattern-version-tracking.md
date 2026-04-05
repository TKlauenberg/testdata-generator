# Story 12.3: Pattern Version Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA team lead,
I want to track which version of patterns generated which datasets,
so that I can correlate test data with pattern changes.

Story 12.1 already computes a deterministic `patternHash` from normalized lineage inputs, and Story 12.2 persists that hash inside append-only generation history. That is necessary but not sufficient for this story. A hash alone cannot power `td diff <old-hash> <new-hash>` once the underlying `.td` files, imports, or workspace-generator definitions have changed on disk. Story 12.3 therefore needs to turn the existing hash into a real version-tracking capability by preserving immutable pattern-version snapshots keyed by the canonical `patternHash`, then comparing those preserved versions rather than today's filesystem state.

Keep the scope tight and honest. This story is about deterministic pattern-version traceability for local CLI usage, not a general VCS, not remote history synchronization, and not platform export. The developer should extend the existing metadata and history foundation without inventing a second hashing scheme, without bloating `.td-history.jsonl` with duplicate full payloads on every run, and without claiming fine-grained semantic break detection unless the implementation actually derives it from stored pattern content.

## Acceptance Criteria

1. Given I need to track pattern evolution, when patterns change over time, then each generation records a hash of the source pattern content.
2. Pattern hash changes when DSL file is modified.
3. Metadata links generated data to specific pattern version.
4. CLI command `td diff <old-hash> <new-hash>` shows pattern changes.
5. Generation history tracks pattern hash over time.
6. Breaking pattern changes are detectable from hash changes.
7. Unit tests verify hash calculation consistency.
8. Gherkin tests verify version tracking across pattern modifications.

## Tasks / Subtasks

- [x] Preserve immutable pattern versions alongside history instead of depending on current filesystem state (AC: 1, 2, 3, 4, 5)
  - [x] Define one canonical snapshot contract in core keyed by `metadata.patternHash` and containing enough stored content to reconstruct or diff the root pattern, imported patterns, and workspace-generator inputs already captured by Story 12.1 lineage.
  - [x] Use content-addressed or deduplicated persistence so repeated generations with the same `patternHash` do not rewrite identical snapshots.
  - [x] Keep `.td-history.jsonl` append-only; if snapshots are stored separately, make lookup deterministic from `patternHash` without depending on run-specific fields.

- [x] Integrate version snapshot persistence into the existing generation and history flow (AC: 1, 2, 3, 5, 7)
  - [x] Reuse `createGenerationMetadata()` and the existing lineage normalization in `packages/core/src/common/generationMetadata.ts`; do not introduce a second hash algorithm or recompute hashes from already-hashed history rows.
  - [x] Persist snapshot data after metadata is finalized so later `td diff` works even if source files were edited, moved, or deleted after generation.
  - [x] Ensure repeated generations of the same pattern stay on the same `patternHash`, while changes to root pattern content, imported pattern content, or workspace-generator definitions produce a new hash and a new stored version.

- [x] Implement deterministic version lookup and `td diff <old-hash> <new-hash>` (AC: 3, 4, 5, 6)
  - [x] Add core helpers to resolve stored versions by hash and compare two versions deterministically.
  - [x] Render a human-readable diff that at minimum identifies added, removed, and modified lineage components with their identifiers and old/new hashes; if stored content is available, include concise diff excerpts from the preserved snapshot rather than reading live files.
  - [x] Add a dedicated CLI command, register it in `packages/cli/bin/td.ts`, and return a clear non-zero error when either hash is unknown or required snapshot data is missing.
  - [x] Handle identical hashes as a first-class no-op path with a clear `no changes` message.

- [x] Detect potentially breaking changes honestly and conservatively (AC: 4, 6)
  - [x] Flag removed lineage components and modified root or imported pattern sources as potentially breaking by default; do not label changes as non-breaking unless backed by deterministic comparison logic.
  - [x] If a deeper DSL-aware comparison is implemented, build it on the existing core parsing and validation pipeline rather than ad-hoc string heuristics.
  - [x] Avoid scope creep into remote history backends, generalized version control features, or future platform export workflows.

- [x] Add focused regression coverage without creating dormant acceptance assets (AC: 7, 8)
  - [x] Add core unit tests for hash lookup, snapshot persistence and deduplication, identical-hash comparisons, modified root-pattern content, imported-pattern changes, and workspace-generator definition changes.
  - [x] Add CLI unit tests for `td diff` success paths, missing-hash errors, identical-hash output, and workspace-relative history or snapshot resolution.
  - [x] Extend `packages/cli/features/historyCommand.feature` and `packages/cli/features/step_definitions/history.steps.ts` in place, or wire any new feature file into `packages/cli/tests/run-cucumber.ts`; do not add an unwired feature.

### Review Findings

- [x] [Review][Patch] Validate `patternHash` before resolving snapshot paths [packages/core/src/history/patternVersionStore.ts:77]
- [x] [Review][Patch] Verify loaded snapshot identity matches the requested hash [packages/core/src/history/patternVersionStore.ts:175]

## Dev Notes

### Story Foundation

- Epic 12 is the auditability and platform-readiness epic. Story 12.1 established canonical generation metadata and deterministic `patternHash`. Story 12.2 established append-only generation history and the `td history` command. Story 12.3 should extend those foundations instead of replacing them.
- PRD requirements FR23, FR30, and FR31 require traceable metadata, future platform lift, and exportable generation history. This story is the missing version-tracking bridge between metadata and audit history.
- No dedicated UX planning artifact matching `*ux*.md` exists in planning artifacts. Follow the repo's existing CLI help and output style instead of inventing a new presentation model.
- The critical gap in the current implementation is historical content availability. Today's history entries keep `patternHash` and lineage hashes, but not the old source content required to explain what changed between two historical versions.

### Technical Requirements

- Reuse `GenerationMetadata` from `packages/core/src/common/generationMetadata.ts` as the authoritative source of `patternHash`, `sourcePattern`, and lineage semantics.
- `patternHash` must remain the canonical version identifier. Do not introduce a second version id or a parallel hashing algorithm in CLI code.
- Do not implement `td diff` by rereading current files at `metadata.sourcePattern`. That would compare current disk state, not the historical pattern version that originally generated the dataset.
- Preserve immutable version snapshots at generation time. A content-addressed snapshot store keyed by `patternHash` is preferable to duplicating full pattern text into every `.td-history.jsonl` line.
- Snapshot content must cover the lineage inputs that contribute to `patternHash`: root pattern source, imported pattern sources, and workspace-generator definitions. Without that, a diff can only say that hashes differ, not what changed.
- Keep generation history chronological and append-only. If history entries are extended with optional snapshot references, the log format must remain backward-compatible and deterministic.
- If multiple history entries share the same `patternHash`, treat them as the same pattern version and reuse the stored snapshot instead of creating duplicate version records.
- If a DSL-aware diff is implemented, prefer comparing preserved lineage components and parsed structure through existing core primitives. Do not build a bespoke parser inside the CLI.
- Breaking-change detection must be conservative and truthful. It is acceptable to report `potentially breaking` when a root or imported pattern changed or disappeared; it is not acceptable to report `non-breaking` without deterministic evidence.
- Keep output deterministic for testability. The diff command should produce stable ordering across lineage components and stable formatting for identical inputs.

### Architecture Compliance

- Keep the current package boundary intact: reusable version lookup, snapshot persistence, and diff computation belong in `@testdata-ai/core`; CLI owns command parsing, config resolution, path resolution, and terminal output.
- Core must not depend on Commander or CLI config types. Pass resolved paths and options from CLI to core helpers.
- Preserve strict TypeScript, ESM-only modules, and export-boundary discipline through `index.ts` files.
- Preserve the existing metadata pipeline in `packages/cli/src/commands/generate.ts`. Pattern-version persistence should happen in that orchestration seam after metadata is known, not inside output adapters.
- Do not move version-tracking logic into JSON, CSV, or SQL adapters. Output metadata remains about the generated dataset; version storage and diffing are audit concerns.
- Keep the history log location behavior aligned with `packages/cli/src/historySupport.ts`. If a version-snapshot store is added, colocate or resolve it consistently with the configured history directory unless there is a strong architectural reason not to.
- Avoid changing CLI parse lifecycle from `program.parse()` to `program.parseAsync()` unless you validate the full command surface. Commander recommends `parseAsync()` for async actions, but that is a repo-wide concern, not a Story 12.3-only requirement.

### Library / Framework Requirements

- Runtime and tests remain Bun-first. Use `bun test`, the package-scoped test scripts, and the existing Cucumber runners already wired in the repository.
- The workspace remains on TypeScript `^5.9.3`, Commander `^14.0.2`, and `@types/bun` `^1.3.5`. Commander `14.0.3` exists upstream, but this story does not require a dependency upgrade.
- Commander supports explicit subcommand registration with `addCommand()`, required command arguments, and dedicated action handlers. Implement `td diff` using those existing patterns rather than a hidden flag under `td history`.
- Bun documentation still recommends `Bun.file()` and `Bun.write()` for optimized file I/O and `node:fs` for directory operations. Use whichever is simplest and safest for an immutable snapshot store, but preserve append-only behavior for the history log itself.

### File Structure Requirements

Primary implementation files likely to change:

- `packages/core/src/common/generationMetadata.ts` only if a small shared helper is genuinely required to preserve lineage inputs or snapshot payload shape
- `packages/core/src/history/generationHistory.ts`
- `packages/core/src/history/index.ts`
- `packages/core/src/index.ts`
- `packages/core/src/history/patternVersionStore.ts` or similar new core module for immutable snapshot persistence
- `packages/core/src/history/patternDiff.ts` or similar new core module for deterministic version comparison
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/diff.ts` as a new CLI command
- `packages/cli/bin/td.ts`
- `packages/cli/src/historySupport.ts` if snapshot-store path resolution helpers are factored there
- `docs/api.md` if new public core exports are added
- `docs/configuration.md` only if a user-visible snapshot-storage configuration knob is introduced

Primary test and BDD files likely to change:

- `packages/core/src/history/generationHistory.test.ts`
- `packages/core/src/history/patternDiff.test.ts` or equivalent new core test file
- `packages/cli/src/commands/history.test.ts` and or `packages/cli/src/commands/diff.test.ts`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/features/historyCommand.feature`
- `packages/cli/features/step_definitions/history.steps.ts`
- `packages/cli/tests/run-cucumber.ts` only if a new feature file is added and must be wired into the active runner

Likely unnecessary unless failing tests prove otherwise:

- output adapter implementations under `packages/core/src/adapters/`
- parser, scanner, or analyzer internals unrelated to optional DSL-aware diff enrichment
- config types and defaults, unless snapshot storage needs to be user-configurable beyond the existing history directory behavior
- generated `dist/` artifacts directly

### Testing Requirements

- Unit tests must verify `patternHash` stability for unchanged lineage inputs and verify hash changes when root pattern content, imported pattern content, or workspace-generator definitions change.
- Unit tests must verify stored version snapshots are deduplicated by `patternHash` and remain loadable even after the source files on disk are modified or removed.
- Unit tests must verify diff lookup behavior for both existing hashes, missing hashes, malformed snapshot data, and identical hashes.
- Unit tests must verify diff output ordering is deterministic and that added, removed, and modified lineage components are surfaced clearly.
- If breaking-change detection is implemented, unit tests must verify only conservative claims are made by default.
- CLI unit tests must verify `td diff <old-hash> <new-hash>` produces readable output, exits non-zero for unknown hashes, and uses workspace-relative history resolution correctly.
- CLI BDD scenarios must verify pattern-version tracking across real pattern modifications, including at minimum a changed root `.td` file and one imported-pattern or workspace-generator change path.
- Keep acceptance coverage in the active CLI runner. Extending `historyCommand.feature` is simpler and safer than adding a new unwired feature file.

### Previous Story Intelligence

- Story 12.1 already implemented the hard determinism contract in `packages/core/src/common/generationMetadata.ts`: lineage entries are normalized, hashed with SHA-256, and combined into a stable `patternHash`.
- Story 12.2 established the append-only audit trail in `packages/core/src/history/generationHistory.ts`, integrated history writes in `packages/cli/src/commands/generate.ts`, and added `td history` in `packages/cli/src/commands/history.ts`.
- The main limitation left by Story 12.2 is deliberate: history entries store metadata and lineage hashes, not historical pattern content. Story 12.3 should close that gap without redesigning the whole history system.
- Repository memory confirms `packages/cli/tests/run-cucumber.ts` is the active CLI BDD runner, and only explicitly listed features execute.
- Existing CLI history tests and BDD steps already create temporary workspaces and run `td generate` and `td history`; extend those seams instead of creating an entirely separate harness.

### Git Intelligence Summary

- Recent work followed a narrow, disciplined sequence: `create story 12.1`, `dev-story 12.1`, `code-review 12.1`, then `dev-story 12.2`, `code-review story 12.2`.
- Practical implication: keep Story 12.3 tightly scoped around version snapshots, diff lookup, and tests. Do not mix in platform export or broad history-query redesign.

### Latest Technical Information

- Commander upstream is currently 14.0.3 and continues to support dedicated subcommands, argument parsing, negatable boolean options, and async action handlers via `parseAsync()`. The repo remains pinned to `^14.0.2`, which is sufficient for this story.
- Bun's current file-I/O guidance still centers on `Bun.file()` and `Bun.write()` for optimized reads and writes, with `node:fs` recommended for directory operations such as `mkdir` and `readdir`.
- Nothing in the latest upstream guidance requires a dependency upgrade to implement immutable snapshot storage or a new `td diff` command.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern discipline for validation and analysis flows, while following existing repository conventions for filesystem helper errors.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/common/generationMetadata.ts` already contains the canonical `patternHash` derivation from normalized lineage inputs. Story 12.3 should build on that exact behavior rather than re-specifying hash semantics elsewhere.
- `packages/core/src/history/index.ts` and `packages/core/src/index.ts` already expose history helpers publicly. Any new version-store or diff helpers should follow the same export path.
- `packages/cli/src/historySupport.ts` centralizes history-log path resolution using the configured history directory and workspace root. Reuse that resolution model for any colocated version-snapshot store.
- `packages/cli/bin/td.ts` currently registers `generate`, `history`, `validate`, `init`, and `config`. `td diff` must be registered explicitly there.
- `packages/cli/src/commands/history.test.ts` and `packages/cli/features/historyCommand.feature` already cover history querying with temporary workspaces and repeated generations. They are the safest seams to extend for version-diff coverage.
- `packages/cli/src/commands/generate.ts` already captures finalized metadata, history enablement, and workspace-aware resolution. That command is the correct orchestration point for persisting immutable pattern-version snapshots.
- No dedicated UX artifact exists, so command output should remain terse, terminal-friendly, and deterministic.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-12-platform-ready-metadata-audit-trail.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Project boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/12-2-generation-history-logging.md`
- Package versions: `package.json`
- Canonical metadata helper: `packages/core/src/common/generationMetadata.ts`
- Core history implementation: `packages/core/src/history/generationHistory.ts`
- Core history exports: `packages/core/src/history/index.ts`
- Core package exports: `packages/core/src/index.ts`
- CLI generate command: `packages/cli/src/commands/generate.ts`
- CLI history command: `packages/cli/src/commands/history.ts`
- CLI history path resolution: `packages/cli/src/historySupport.ts`
- CLI entrypoint: `packages/cli/bin/td.ts`
- CLI config types: `packages/cli/src/config/types.ts`
- CLI history unit tests: `packages/cli/src/commands/history.test.ts`
- CLI history feature: `packages/cli/features/historyCommand.feature`
- CLI history steps: `packages/cli/features/step_definitions/history.steps.ts`
- Active CLI BDD runner: `packages/cli/tests/run-cucumber.ts`
- Repository memory: `/memories/repo/testing-notes.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Plan

- Add a core, immutable pattern-version snapshot layer keyed by the existing canonical `patternHash`.
- Persist those snapshots from the `td generate` orchestration flow so historical diffs are independent of later filesystem edits.
- Implement core diff helpers plus a new `td diff <old-hash> <new-hash>` CLI command with deterministic, human-readable output.
- Extend unit and CLI BDD coverage around real pattern modifications and missing-hash error paths.

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `12-3-pattern-version-tracking`.
- Discovery sources loaded: BMM config, full sprint status, Epic 12 shard, PRD FR23 and FR30 and FR31 section, architecture index and core implementation-pattern and project-boundary files, project context, previous Story 12.2 artifact, repository memory, current CLI and core history source files, current CLI history test harness, recent git history, and a read-only code exploration subagent report.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- Current implementation state confirmed: deterministic `patternHash` already exists in generation metadata, append-only generation history already persists the hash, `td history` already queries recent runs, and there is currently no immutable pattern-version snapshot store and no `td diff` command.
- Current CLI BDD runner confirmed to execute `generateCommand.feature`, `historyCommand.feature`, and `saveGeneratedContext.feature`; any new acceptance coverage must extend one of those active assets or be wired into the runner explicitly.
- Upstream Bun and Commander documentation reviewed for current file-I/O and subcommand behavior. No dependency upgrade is required for this story.
- Implemented a new immutable snapshot store in core keyed by `patternHash`, wired generation to persist preserved lineage content, and kept `.td-history.jsonl` append-only.
- Added deterministic core diff helpers and a dedicated `td diff <old-hash> <new-hash>` CLI command with identical-hash no-op handling, missing-hash failures, stable output ordering, and concise excerpt lines from preserved content.
- Validation executed successfully with focused Bun tests for the new core and CLI unit coverage plus `bun run --cwd packages/cli test:bdd` with 18 scenarios and 130 steps passing.

### Completion Notes List

- Added `PatternVersionSnapshot` storage and `comparePatternVersions()` in core, with deduplicated persisted snapshots that preserve root pattern, imported pattern, and workspace-generator content by canonical `patternHash`.
- Wired `packages/cli/src/commands/generate.ts` to persist snapshots beside the configured history directory and added `td diff` to resolve stored versions without rereading the current filesystem.
- Added regression coverage for root-pattern, imported-pattern, and workspace-generator hash changes; snapshot persistence and malformed snapshot handling; CLI diff success, identical-hash, missing-hash, and workspace-relative resolution; and active Cucumber scenarios for root and imported pattern modifications.

### File List

- `_bmad-output/implementation-artifacts/12-3-pattern-version-tracking.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/api.md`
- `packages/core/src/common/generationMetadata.test.ts`
- `packages/core/src/history/index.ts`
- `packages/core/src/history/patternDiff.test.ts`
- `packages/core/src/history/patternDiff.ts`
- `packages/core/src/history/patternVersionStore.test.ts`
- `packages/core/src/history/patternVersionStore.ts`
- `packages/cli/bin/td.ts`
- `packages/cli/features/historyCommand.feature`
- `packages/cli/features/step_definitions/history.steps.ts`
- `packages/cli/src/commands/diff.test.ts`
- `packages/cli/src/commands/diff.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/historySupport.ts`

### Change Log

- 2026-04-05: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-05: Implemented immutable pattern-version snapshots, added `td diff`, extended unit and CLI BDD coverage, and updated sprint status to `review`.