# Story 12.2: Generation History Logging

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA manager,
I want a log of all test data generations,
so that I can audit test data usage and troubleshoot issues.

Story 12.1 already established a canonical `GenerationMetadata` contract, deterministic `patternHash`, lineage tracking, and consistent metadata across CLI JSON, CSV, SQL, and saved contexts. Story 12.2 must build directly on that foundation instead of inventing a second audit schema. The new `.td-history.jsonl` file should be an append-only audit log where each line reuses the existing generation metadata contract and adds outcome details such as success or failure, concise error information, and raw performance metrics. The CLI is the orchestration layer: it resolves config and flags, captures runtime context, and invokes a core history module to persist and query entries.

This story also introduces the first history-facing CLI surface with `td history`. Keep it intentionally narrow: one stable log file, one stable entry contract, default-on logging with `--no-history` opt-out, and one query primitive `--last <n>`. Do not broaden scope into export workflows, diffing, platform migration payloads, or adapter-specific history sidecars. The goal is a trustworthy, reusable audit trail that later Story 12.3 and platform-preparation work can extend without refactoring the contract.

## Acceptance Criteria

1. Given I need to track generation history, when I implement history logging, then each generation appends an entry to a `.td-history.jsonl` file.
2. History entries include all metadata plus generation outcome.
3. History log location is configurable, with project root as the default.
4. CLI flag `--no-history` disables history logging.
5. History entries include success or failure status.
6. History entries include error messages for failed generations.
7. History entries include performance metrics including duration and records per second.
8. The CLI provides a `td history` command to query generation history.
9. `td history --last 10` shows the last 10 generations.
10. Unit tests verify history logging and querying.
11. Gherkin tests verify history is maintained across multiple generations.

## Tasks / Subtasks

- [x] Define one canonical generation-history entry contract that composes Story 12.1 metadata rather than duplicating it (AC: 1, 2, 5, 6, 7)
  - [x] Add core history types under a dedicated history module that structurally reuse `GenerationMetadata` from `packages/core/src/common/generationMetadata.ts` for `timestamp`, `sourcePattern`, `count`, `format`, `seed`, `version`, `patternHash`, and `lineage`.
  - [x] Add outcome fields for at minimum `status`, `errorMessage`, `durationMs`, and `recordsPerSecond`, and decide whether optional runtime fields such as `outputPath`, `savedContextName`, or `historyPath` belong in the entry.
  - [x] Keep failure entries honest: if validation fails before full lineage or pattern-hash derivation is available, log only the metadata fields that are deterministically known instead of fabricating lineage data.

- [x] Implement append-only history persistence and parsing in core, with CLI orchestration around it (AC: 1, 2, 5, 6, 7, 8, 9)
  - [x] Add a core append helper that writes exactly one JSON line per invocation to `.td-history.jsonl` and never rewrites existing history.
  - [x] Add a core read/query helper that parses the same JSONL contract, tolerates blank trailing lines, and returns entries in append order so the CLI can slice or reverse them for display.
  - [x] Do not use `Bun.write()` for append semantics because it overwrites files; use an append-capable file API such as `node:fs/promises.appendFile()` or an explicitly append-opened writer.

- [x] Integrate history capture into `td generate` for both success and failure paths (AC: 1, 2, 4, 5, 6, 7)
  - [x] Add a Commander negatable option `--no-history` so logging is enabled by default and explicitly disabled per invocation.
  - [x] Capture raw numeric timing from the existing `performance.now()` seam in `packages/cli/src/commands/generate.ts`; store `durationMs` and compute `recordsPerSecond` from the actual generated record count, guarding against divide-by-zero.
  - [x] Log successful runs only after formatted output and optional `--save-context` persistence complete, so success means the full user-observable workflow finished.
  - [x] Log failed runs in validation, generation, output-writing, and save-context error paths when history is enabled, using concise machine-readable error text instead of colorized stderr output or stack traces.

- [x] Add history configuration without overengineering the config model (AC: 3, 4)
  - [x] Extend CLI config types, built-in defaults, normalization, source reporting, and `td config show` with a new history section such as `history.logDirectory`.
  - [x] Keep the filename fixed as `.td-history.jsonl`; make only the directory configurable unless implementation pressure proves a stronger need.
  - [x] Resolve the history directory relative to the discovered workspace root when a workspace config exists, otherwise relative to the current working directory. Do not piggyback on `context.saveDirectory`.
  - [x] Update `docs/configuration.md` to document the new section, its default resolution behavior, and how `--no-history` interacts with config.

- [x] Implement the `td history` command using existing CLI command patterns (AC: 8, 9)
  - [x] Add `packages/cli/src/commands/history.ts` and register it in `packages/cli/bin/td.ts` using the same `addCommand()` pattern as other commands.
  - [x] Support `td history --last <n>` with a practical default output that is readable in terminals, shows newest entries first, and includes timestamp, status, source pattern, format, count, duration, and error summary when present.
  - [x] Provide a clear empty-state message when the history file does not exist yet rather than treating it as a hard failure.

- [x] Add focused regression coverage in unit and BDD layers, and wire new BDD assets into the active runner (AC: 10, 11)
  - [x] Add core unit tests for entry creation, append behavior, read/query behavior, malformed-line handling, and multiple-generation accumulation.
  - [x] Extend CLI unit tests to cover default logging, `--no-history`, configurable history directory, failed-generation logging, and `td history --last <n>` output.
  - [x] Extend `packages/cli/features/generateCommand.feature` for default history creation and multi-run accumulation, add a dedicated `packages/cli/features/historyCommand.feature`, and update `packages/cli/tests/run-cucumber.ts` plus step definitions so the feature actually runs.
  - [x] Do not add dormant feature files that are not referenced by the active CLI Cucumber runner.

## Dev Notes

### Story Foundation

- Epic 12 is about platform-ready auditability. Story 12.1 established trustworthy metadata; Story 12.2 must persist that metadata over time as an auditable history rather than redefining it.
- PRD requirements FR23, FR30, and FR31 collectively require traceable metadata, future platform lift, and generation-history export foundations. This story is the first concrete audit-trail implementation for those requirements.
- No dedicated UX planning artifact matching `*ux*.md` exists in planning artifacts. User-facing behavior should therefore follow the epic acceptance criteria, existing CLI interaction patterns, and current command output style.
- Keep scope disciplined: implement append-only local history and CLI querying now. Do not implement `td diff`, platform export payloads, dataset lifecycle management, or remote storage in this story.

### Technical Requirements

- Reuse `GenerationMetadata` from `packages/core/src/common/generationMetadata.ts` as the authoritative metadata vocabulary. History entries should compose around it, not flatten a duplicate contract with slightly different field names.
- Add the new history logic in core so future programmatic consumers and later stories can reuse the same entry contract and parser. CLI should handle config resolution, option parsing, and terminal rendering only.
- `packages/cli/src/commands/generate.ts` already measures elapsed time with `performance.now()` and knows the real generated record count, output format, output path, seed, and save-context options. Reuse that seam for history metrics and runtime details.
- Logging failures needs two paths:
  - Validation or early setup failures: log best-effort metadata based on known CLI inputs and source file path, with `status: 'failure'` and a concise error message.
  - Post-validation failures: log the validated metadata and the failure outcome before exiting.
- Store performance metrics as raw numeric values such as `durationMs` and `recordsPerSecond`; do not persist rounded display strings like `0.1s` because later tooling will need machine-readable values.
- Preserve append order in the file. `td history --last 10` can display the newest entries first, but the persisted log itself should remain chronological append-only history.
- Keep error payloads concise and deterministic. Prefer plain messages or normalized validation summaries over captured ANSI-colored stderr or stack traces.
- The history file must be separate from generated output files and adapter metadata comments. Do not embed history inside JSON, CSV, or SQL output artifacts.
- If the history helpers are exported from `@testdata-ai/core`, add them through module `index.ts` files and the package root export surface. Do not make CLI deep-import core internals.

### Architecture Compliance

- Preserve the existing pipeline boundary: validate and generate in core, orchestrate in CLI, format output through adapters, and persist audit history as a sidecar concern.
- Core must not depend on CLI configuration types or Commander. CLI passes resolved paths and runtime flags into core helpers.
- Keep strict TypeScript, ESM-only modules, and existing export-boundary discipline through `index.ts` files.
- Reuse established file-I/O patterns from `packages/core/src/context/contextManager.ts` for directory creation and error wrapping, but use true append semantics for the history file.
- Do not move metadata generation into adapters or mutate generated records. History is an audit trail about a generation run, not part of the generated dataset payload.
- Do not expand the config model with unnecessary toggles like `history.enabled` unless implementation proves they are necessary. Acceptance criteria only require configurable location and runtime `--no-history`.

### Library / Framework Requirements

- Runtime and tests remain Bun-first. Use `bun test`, package-scoped Bun test commands, and the existing Cucumber runners already wired in the repository.
- The workspace remains on TypeScript `^5.9.3`, ESLint `^9.39.2`, Prettier `^3.7.4`, `@types/bun` `^1.3.5`, and Commander `^14.0.2`. The latest Commander documentation reflects `14.0.3`, but this story does not justify a dependency upgrade.
- Commander supports negatable boolean options like `--no-history` and explicit subcommand registration with `addCommand()`. Use those existing patterns rather than custom flag parsing.
- Commander documentation recommends `parseAsync()` when action handlers are async. The current CLI entrypoint still uses `program.parse()` despite existing async actions; if this story changes CLI parsing behavior, treat it as a repo-wide decision and validate all commands, not only history.
- Bun documentation recommends `Bun.file()` and `Bun.write()` for optimized read/write operations and `node:fs` for directory operations. For append-only history, use append-capable file APIs rather than overwrite-oriented `Bun.write()`.

### File Structure Requirements

Primary implementation files likely to change:

- `packages/core/src/history/index.ts`
- `packages/core/src/history/generationHistory.ts`
- `packages/core/src/history/generationHistory.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/common/generationMetadata.ts` only if a small shared helper is genuinely needed for fallback metadata creation or shared type reuse
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/history.ts`
- `packages/cli/bin/td.ts`
- `packages/cli/src/config/types.ts`
- `packages/cli/src/config/defaults.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/commands/config.ts`
- `docs/configuration.md`
- `docs/api.md` if new core history helpers become part of the public package-root API

Primary test and BDD files likely to change:

- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/src/commands/history.test.ts`
- `packages/cli/features/generateCommand.feature`
- `packages/cli/features/historyCommand.feature`
- `packages/cli/features/step_definitions/generateCommand.steps.ts`
- `packages/cli/features/step_definitions/history.steps.ts`
- `packages/cli/tests/run-cucumber.ts`

Likely unnecessary unless failing tests prove otherwise:

- output adapter implementations in `packages/core/src/adapters/`
- parser, scanner, or analyzer logic unrelated to validation-failure summaries
- context loaders beyond borrowing patterns from `contextManager`
- generated `dist/` artifacts directly

### Testing Requirements

- Unit tests must verify each successful generation appends exactly one JSON line and preserves existing history entries.
- Unit tests must verify failed generations produce `status: 'failure'` entries with an error message and without fabricated lineage or hash data when unavailable.
- Unit tests must verify history path resolution honors config and runtime defaults, while `--no-history` prevents file creation and append behavior.
- Unit tests must verify `td history --last <n>` returns the requested number of entries and orders them newest-first in displayed output.
- Unit tests must verify query behavior when the file is absent, empty, or contains a blank trailing line.
- CLI BDD scenarios must verify history is created by default across multiple `td generate` runs, persists between runs in the same workspace, and can be queried through `td history --last 10`.
- CLI BDD scenarios must verify `--no-history` disables logging without affecting generated output or exit codes.
- Keep CLI acceptance coverage in the active runner `packages/cli/tests/run-cucumber.ts`; new feature files and step definitions must be wired there explicitly.

### Previous Story Intelligence

- Story 12.1 already solved the hard part of trustworthy metadata: a shared `GenerationMetadata` contract, deterministic `patternHash`, lineage tracking, and metadata-aware output formatting. Story 12.2 should reuse those exact concepts instead of recreating them.
- Story 12.1 also aligned saved contexts and generated output metadata. That makes `packages/core/src/context/contextManager.ts` a useful reference for file persistence, envelope design, and shared metadata fields.
- `packages/cli/src/commands/generate.ts` already centralizes validation, generation, metadata construction, output writing, optional context persistence, and summary reporting. History logging belongs in that orchestration seam, not in each adapter.
- Repository memory confirms `packages/cli/tests/run-cucumber.ts` is the active CLI BDD runner and only executes explicitly listed features. Any new history feature file must be added there.

### Git Intelligence Summary

- Recent workflow cadence is consistent and narrow in scope: `da1296f create story 12.1`, `6d781aa dev-story 12.1`, `a66a343 code-review 12.1`, preceded by the same create-story -> dev-story -> code-review sequence for Story 11.4.
- Practical implication: keep Story 12.2 sharply scoped, explicit about file targets and tests, and avoid mixing later Epic 12 work into the first history implementation.

### Latest Technical Information

- Bun file-I/O guidance still recommends `Bun.file()` and `Bun.write()` for fast reads and writes, and `node:fs` for directory operations such as `mkdir`. That fits this repo's current mix of Bun and `node:fs/promises`.
- Bun's documented write APIs are overwrite-oriented; append-only history should use append-capable semantics rather than rewriting the full log on each generation.
- Commander's current documentation still supports negatable options like `--no-history`, registered subcommands with `addCommand()`, and async handlers with `parseAsync()`. Those capabilities exist without requiring a repo dependency upgrade.
- Commander 14.0.3 is available upstream, but the workspace remains pinned to `^14.0.2`; there is no story requirement to upgrade Commander in order to implement history logging.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern discipline for validation and analysis flows, while following existing repository conventions for filesystem helper errors.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/common/generationMetadata.ts` is already the canonical source for timestamp, source pattern, format, seed, version, deterministic hash, and lineage. History should compose around it rather than extending adapter-specific comment formats.
- `packages/core/src/common/index.ts` and `packages/core/src/index.ts` already expose metadata helpers publicly. If history utilities live in core, export them through the same index layers instead of deep imports.
- `packages/cli/src/commands/generate.ts` already records start and end timing, actual record counts, and runtime output details. Reuse those values for history metrics rather than recomputing from formatted output.
- `packages/cli/src/config/configLoader.ts` and `packages/cli/src/commands/config.ts` implement shallow section-level override semantics and source reporting. Any new `history` section must be wired into both places or config behavior will be misleading.
- `packages/cli/tests/run-cucumber.ts` currently executes only `generateCommand.feature` and `saveGeneratedContext.feature`. A new history feature file will be dead unless the runner and step definition imports are updated.
- `docs/configuration.md` currently documents defaults, context, generator defaults, and generators. History configuration will be user-visible and must be added there.
- No dedicated UX artifact exists, so CLI output and help text should follow the repository's existing command style instead of inventing a new presentation model.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-12-platform-ready-metadata-audit-trail.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Project boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/12-1-generation-metadata-tracking.md`
- Package versions: `package.json`
- Core package root exports: `packages/core/src/index.ts`
- Common exports: `packages/core/src/common/index.ts`
- Canonical metadata helper: `packages/core/src/common/generationMetadata.ts`
- Context persistence reference: `packages/core/src/context/contextManager.ts`
- CLI entrypoint: `packages/cli/bin/td.ts`
- CLI generate command: `packages/cli/src/commands/generate.ts`
- CLI config types: `packages/cli/src/config/types.ts`
- CLI config defaults: `packages/cli/src/config/defaults.ts`
- CLI config loader: `packages/cli/src/config/configLoader.ts`
- CLI config command: `packages/cli/src/commands/config.ts`
- CLI generate unit tests: `packages/cli/src/commands/generate.test.ts`
- CLI generate feature: `packages/cli/features/generateCommand.feature`
- CLI generate steps: `packages/cli/features/step_definitions/generateCommand.steps.ts`
- Active CLI BDD runner: `packages/cli/tests/run-cucumber.ts`
- Repository memory: `/memories/repo/testing-notes.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Plan

- Define a single history-entry contract in core that reuses Story 12.1 metadata and adds outcome fields for success, failure, and performance.
- Extend CLI config and `td generate` to resolve the history path, honor `--no-history`, and append an entry for both success and failure flows.
- Add `td history --last <n>` using the same core parser and a minimal human-readable display.
- Add focused unit and CLI BDD coverage, and wire the new BDD feature into the active runner.

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `12-2-generation-history-logging`.
- Discovery sources loaded: BMM config, full sprint status, Epic 12 shard, PRD FR23/FR30/FR31 section, architecture index and core implementation-pattern files, project context, previous Story 12.1 artifact, repository memory, current CLI/config/core source files, CLI test harness files, and recent git history.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- Current implementation state confirmed: Story 12.1 metadata exists in core and CLI output paths, but there is no history module, no `.td-history.jsonl` persistence, no `--no-history` option, and no `td history` command.
- Current CLI BDD runner confirmed to execute only `generateCommand.feature` and `saveGeneratedContext.feature`; new history acceptance coverage must be wired explicitly.
- Current config model confirmed to be shallow, section-level overrides with built-in, global, and workspace layers; any new history section must participate in the same normalization and source-reporting flow.
- Upstream Bun and Commander documentation reviewed for append-capable file I/O, negatable options, subcommand registration, and async command lifecycle behavior.
- Full repository unit tests passed with `bun test packages/` after updating the config loader expectations for the new `history` section.
- Full BDD suite passed with `bun run test:bdd`, including the active CLI runner now executing `historyCommand.feature`.
- `bun run lint` reports 0 errors and 107 pre-existing warnings in unrelated files; no remaining lint errors were introduced by Story 12.2 changes.

### Completion Notes List

- Implemented a core append-only generation history module, exported it from `@testdata-ai/core`, and kept failure metadata best-effort when full lineage or pattern hashes are unavailable.
- Integrated default-on history logging into `td generate`, added `--no-history`, added `history.logDirectory` config resolution, and introduced the `td history --last <n>` query command.
- Added unit and CLI BDD coverage for success/failure logging, multi-run accumulation, configurable history paths, and newest-first history display.
- Validation completed with `bun test packages/` and `bun run test:bdd` passing; `bun run lint` still exits on a pre-existing warning backlog outside this story's change set.

### File List

- `_bmad-output/implementation-artifacts/12-2-generation-history-logging.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/api.md`
- `docs/configuration.md`
- `packages/core/src/history/generationHistory.ts`
- `packages/core/src/history/generationHistory.test.ts`
- `packages/core/src/history/index.ts`
- `packages/core/src/index.ts`
- `packages/cli/bin/td.ts`
- `packages/cli/features/generateCommand.feature`
- `packages/cli/features/historyCommand.feature`
- `packages/cli/features/step_definitions/generateCommand.steps.ts`
- `packages/cli/features/step_definitions/history.steps.ts`
- `packages/cli/src/commands/config.test.ts`
- `packages/cli/src/commands/config.ts`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/history.test.ts`
- `packages/cli/src/commands/history.ts`
- `packages/cli/src/config/configLoader.test.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/config/defaults.ts`
- `packages/cli/src/config/index.ts`
- `packages/cli/src/config/types.ts`
- `packages/cli/src/historySupport.ts`
- `packages/cli/tests/run-cucumber.ts`

### Change Log

- 2026-04-05: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-05: Development started for Story 12.2 and sprint status updated to `in-progress`.
- 2026-04-05: Implemented append-only generation history logging, `td history`, config/docs updates, and regression coverage; moved story to `review`.