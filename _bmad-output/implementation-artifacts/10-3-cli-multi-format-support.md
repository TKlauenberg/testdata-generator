# Story 10.3: CLI Multi-Format Support

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to specify output format in the CLI**,
so that **I can generate data in the format I need**.

This story owns the CLI wiring only. The core CSV and SQL adapters already exist from Stories 10.1 and 10.2; Story 10.4 owns the separate programmatic API work.

## Acceptance Criteria

1. `td generate ... --format json` continues to generate JSON output, with JSON remaining the default when no stronger signal is present.
2. `td generate ... --format csv` generates CSV output through the existing core CSV adapter.
3. `td generate ... --format sql` generates SQL `INSERT` statements through the existing core SQL adapter.
4. The CLI selects the effective output format with this precedence: explicit `--format` flag, then supported `--output` file extension (`.json`, `.csv`, `.sql`), then the effective config default.
5. SQL generation accepts a CLI table-name option and passes the resolved table name into `SqlAdapter`.
6. All three formats support both file output and stdout without changing existing exit-code or validation behavior.
7. `--save-context` continues to persist the generated records as reusable JSON context data regardless of the selected output format.
8. Gherkin and CLI tests verify JSON, CSV, and SQL generation paths from `td generate`, including format inference and SQL table-name handling.

## Tasks / Subtasks

- [x] Resolve effective format and SQL-specific CLI options (AC: 1, 4, 5)
  - [x] Add an explicit SQL table option to the generate command as `--table-name <name>`.
  - [x] Implement one format-resolution path in `packages/cli/src/commands/generate.ts` with precedence `--format` > inferred output extension > effective config default.
  - [x] Support extension inference only for `.json`, `.csv`, and `.sql`; unknown extensions should fall back to the validated config/default format rather than inventing new formats.
  - [x] Resolve SQL table names with precedence `--table-name` > `--output` file stem > input schema file stem.
  - [x] Reject `--table-name` when the effective format is not `sql` instead of silently ignoring it.

- [x] Route CLI output through the correct formatting path while preserving current JSON behavior (AC: 1, 2, 3, 6, 7)
  - [x] Preserve the current CLI JSON contract: stdout and file output remain a plain JSON array of records, not the metadata-wrapped shape currently emitted by `JsonAdapter`.
  - [x] Reuse `CsvAdapter` and `SqlAdapter` from `@testdata-ai/core` rather than duplicating CSV escaping or SQL quoting logic inside the CLI package.
  - [x] Keep stdout support for CSV and SQL. If the existing file-path-based adapter contract requires a CLI bridge for stdout, keep that bridge localized to the CLI and clean up any temporary artifacts.
  - [x] Preserve the current `--save-context` semantics by saving raw generated records to the JSON context envelope independently of the selected output format.
  - [x] Keep large-generation progress reporting on stderr and preserve the existing exit-code behavior for validation, runtime, and file-system failures.

- [x] Add focused automated coverage for CLI multi-format behavior (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Extend `packages/cli/src/commands/generate.test.ts` with JSON, CSV, and SQL cases for stdout and file output.
  - [x] Add tests for format inference from `.json`, `.csv`, and `.sql` output paths and explicit `--format` precedence over inferred extensions.
  - [x] Add tests for SQL table-name resolution, including explicit `--table-name`, inferred output-file stem, inferred input-file stem, and invalid non-SQL usage.
  - [x] Add at least one save-context scenario proving non-JSON output still saves reusable JSON context correctly.
  - [x] Expand CLI BDD coverage by wiring `packages/cli/features/generateCommand.feature` into the live Cucumber runner and adding the missing step definitions needed for multi-format scenarios.

- [x] Keep Story 10.3 scoped to CLI integration only (AC: 1, 2, 3, 5, 6, 7)
  - [x] Do not add the programmatic generation API promised by Story 10.4.
  - [x] Do not redesign the adapter architecture broadly unless a very small shared abstraction is the only clean way to support stdout.
  - [x] Do not change JSON output to metadata-enveloped or JSONL CLI output in this story.
  - [x] Do not change context file formats, metadata-tracking behavior, or Epic 12 concerns in this story.

## Dev Notes

### Story Foundation

- Epic 10 introduces multi-format output in phases: Story 10.1 added CSV output in core, Story 10.2 added SQL output in core, and Story 10.3 is the CLI integration layer that exposes those capabilities through `td generate`.
- The live CLI already validates `--format` through `validateOutputFormat()` and config defaults, but it still formats output with the local `formatRecords()` helper that only returns JSON.
- The current `generate` command in `packages/cli/src/commands/generate.ts` materializes all generated records into an array before output. That is compatible with `saveAsContext()` today, because `saveAsContext()` currently requires `readonly Record<string, unknown>[]` rather than an `AsyncIterable`.
- The current JSON CLI output shape is a plain JSON array. That behavior is already covered by unit tests and Gherkin scenarios, so Story 10.3 must preserve it.
- The core adapter implementations already exist and are the authoritative references for CSV and SQL formatting behavior:
  - `packages/core/src/adapters/csvAdapter.ts`
  - `packages/core/src/adapters/sqlAdapter.ts`
- The CLI package already contains feature files such as `packages/cli/features/generateCommand.feature`, but the current Cucumber runner only executes `saveGeneratedContext.feature`. Multi-format BDD coverage must be registered explicitly or it will remain dead documentation.

### Technical Requirements

- Effective output-format precedence for this story must be:
  1. explicit `--format`
  2. inferred `--output` extension when it is one of `.json`, `.csv`, or `.sql`
  3. effective config `defaults.format`
- Preserve config semantics from `docs/configuration.md`: `defaults.format` remains a CLI/workspace/global default, but a runtime CLI flag should still win.
- Add `--table-name <name>` for SQL output. Do not rely on a hidden constant or hard-coded table name.
- SQL table-name resolution must be deterministic:
  - explicit `--table-name` wins
  - otherwise use the `--output` file stem when an output file is provided
  - otherwise use the input schema file stem
- If the effective format is `sql` and the resolved table name comes from a file stem, pass it through to `SqlAdapter` as-is and let the adapter's existing quoting rules handle safe SQL identifier output.
- If `--table-name` is provided while the effective format is `json` or `csv`, fail fast with a user-facing CLI error and exit code `1`.
- Preserve the existing JSON CLI contract. `JsonAdapter` currently emits metadata-enveloped JSON or JSONL; that is not the current CLI behavior and should not be introduced here unless the CLI adds an explicit mode for it in a separate story.
- Reuse existing core formatting behavior where it is already correct:
  - CSV escaping, delimiter handling, header selection, and output truncation belong to `CsvAdapter`
  - SQL batching, quoting, null handling, and dialect-specific identifier rules belong to `SqlAdapter`
- Preserve save-context behavior exactly: the context file remains JSON and stores the raw generated records, not CSV text or SQL text.
- Keep stdout support for all formats. If adapter reuse for stdout requires a contained bridge, prefer a minimal CLI-only solution over duplicating CSV or SQL serializers.
- Keep parent-directory creation for `--output`, current progress reporting threshold behavior, and current validation/runtime/file-system exit-code semantics.

### Architecture Compliance

- Prefer the live repo over stale planning examples when they conflict:
  - the live core adapter contract lives in `packages/core/src/adapters/types.ts`
  - the live generate command currently owns output formatting in `packages/cli/src/commands/generate.ts`
  - the live CLI BDD runner is `packages/cli/tests/run-cucumber.ts`
- Keep CLI-specific format resolution and option parsing inside the CLI package. Do not push Commander or CLI parsing concerns into `@testdata-ai/core`.
- Reuse `@testdata-ai/core` adapter implementations rather than introducing parallel CSV/SQL formatter utilities under `packages/cli/src/`.
- Avoid broad core-surface changes. If a minimal shared helper is needed to reduce duplication, keep it narrowly scoped and consistent with the existing package boundary where CLI depends on core, not the reverse.
- Do not hand-edit generated `dist/` output.
- Do not change programmatic API exports, adapter metadata formats, or context-manager persistence format in this story.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language: TypeScript 5.9.x, ESM-only, strict mode.
- CLI framework: Commander.js 14.0.2.
- Tests: Bun test runner for command/unit coverage, Cucumber 12.5.0 for CLI Gherkin coverage.
- Dependencies: do not add CSV, SQL, ORM, or query-builder packages for this story. The required format logic already exists in core adapters.
- Use the versions pinned in the repository `package.json` files as authoritative. Do not opportunistically upgrade CLI or test tooling while implementing Story 10.3.

### File Structure Requirements

Primary implementation surface:

- Modified files:
  - `packages/cli/src/commands/generate.ts`
  - `packages/cli/src/commands/generate.test.ts`
  - `packages/cli/features/generateCommand.feature`
  - `packages/cli/tests/run-cucumber.ts`

- New files likely required:
  - `packages/cli/features/step_definitions/generateCommand.steps.ts`

- Additional files only if implementation genuinely requires them:
  - minimal new test fixtures under `packages/cli/fixtures/`
  - small CLI helper modules under `packages/cli/src/commands/` or `packages/cli/src/` if extracting output-format resolution keeps `generate.ts` readable

- Avoid modifying core files unless there is a narrowly justified adapter-support helper with no broader API redesign.

### Testing Requirements

- Keep the existing JSON generate tests passing. Story 10.3 must extend coverage, not replace it.
- Add CLI unit/integration tests for:
  - default JSON output
  - explicit `--format csv` and `--format sql`
  - inferred format from `.csv` and `.sql` output paths
  - explicit `--format` overriding an output-file extension
  - SQL table-name resolution from explicit option, output-file stem, and input-file stem
  - invalid `--table-name` usage with non-SQL formats
  - file output and stdout behavior for all supported formats
  - save-context behavior with at least one non-JSON output format
- Add or update CLI Gherkin scenarios so acceptance coverage proves:
  - JSON generation still works through `td generate`
  - CSV generation works from the CLI
  - SQL generation works from the CLI with table-name handling
  - file-extension inference works through the user-facing command
- Important current repo reality:
  - `packages/cli/features/generateCommand.feature` exists, but there is no matching step-definition file today
  - `packages/cli/tests/run-cucumber.ts` currently runs only `saveGeneratedContext.feature`
  - Story 10.3 must wire any new multi-format CLI Gherkin coverage into the actual runner or the acceptance criteria remain unverified

### Previous Story Intelligence

- Story 10.1 established the core CSV adapter behavior and scope boundary:
  - CSV formatting belongs in core adapters, not the CLI command
  - reused output paths should be truncated before writing
  - leading empty records should be skipped until headers are discovered
- Story 10.2 established the core SQL adapter behavior and scope boundary:
  - SQL formatting belongs in core adapters, not hand-built CLI string templates
  - table names are required by `SqlAdapter`
  - identifier quoting, null handling, and batching are already implemented and tested in core
- Both prior stories intentionally left `packages/cli/src/commands/generate.ts` untouched. Story 10.3 is where CLI integration should happen, and it should build on those existing implementations instead of re-solving formatting.
- `saveAsContext()` still accepts a concrete record array, so a fully streaming CLI path is not required in every mode today. Keep that tradeoff explicit rather than pretending it does not exist.

### Git Intelligence Summary

- Recent story flow is tightly scoped and sequential:
  - `44dce7a create-story 10.2`
  - `2731293 dev-story 10.2`
  - `1efe4de code-review story 10.2`
  - `fc521a7 review story 10.1`
  - `eec5d82 dev-story 10.1`
- Follow that same pattern here: implement Story 10.3 as a focused CLI change set rather than mixing in Story 10.4 programmatic API work or unrelated cleanup.

### Latest Technical Information

- Root tooling is currently pinned to TypeScript 5.9.3, ESLint 9.39.2, and Prettier 3.7.4.
- CLI dependencies are currently `@testdata-ai/core` via workspace, `commander` 14.0.2, and `chalk` 5.6.2.
- Core BDD dependencies are pinned to Cucumber 12.5.0 and SerenityJS 3.37.1, but the CLI package currently uses plain Cucumber wiring in `packages/cli/tests/run-cucumber.ts`.
- External web lookup was not available in this workflow context, so latest-technology guidance is derived from the repo's pinned manifests and live source tree.

### Project Context Reference

Apply the project rules captured in `_bmad-output/planning-artifacts/project-context.md`:

- Bun-first execution, not Node-first implementation choices.
- Strict TypeScript, no `any`, ESM-only imports/exports.
- Public exports through `index.ts` surfaces where the package already uses them.
- Co-located `*.test.ts` unit tests.
- Keep private class members with both `private` and underscore prefix where classes are introduced.
- Prefer the live package structure and existing command/test patterns over older planning examples.

### Project Structure Notes

- The architecture planning docs describe the intended long-term shape, but the live repo is the source of truth for this story.
- Important live patterns to preserve:
  - `packages/cli/src/commands/generate.ts` is the single command implementation surface
  - `packages/cli/src/commands/generate.test.ts` is the existing command test harness
  - `packages/cli/features/` holds CLI Gherkin specifications
  - `packages/cli/tests/run-cucumber.ts` is the actual runner that determines which features execute
  - core adapters already live in `packages/core/src/adapters/`
- The planning docs still mention some stale structure examples such as `adapter.ts`; the live repo uses `packages/core/src/adapters/types.ts` instead.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-10-multi-format-output-programmatic-api.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Configuration rules: `docs/configuration.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architectural decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Existing CLI generate command: `packages/cli/src/commands/generate.ts`
- Existing CLI command tests: `packages/cli/src/commands/generate.test.ts`
- Existing CLI feature spec: `packages/cli/features/generateCommand.feature`
- Existing CLI Cucumber runner: `packages/cli/tests/run-cucumber.ts`
- Existing CLI save-context feature: `packages/cli/features/saveGeneratedContext.feature`
- Existing core CSV adapter: `packages/core/src/adapters/csvAdapter.ts`
- Existing core SQL adapter: `packages/core/src/adapters/sqlAdapter.ts`
- Existing core JSON adapter behavior reference: `packages/core/src/adapters/jsonAdapter.ts`
- Existing core adapter types: `packages/core/src/adapters/types.ts`
- Existing public generation API: `packages/core/src/generateData.ts`
- Existing context save API: `packages/core/src/context/contextManager.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Validation workflow file `_bmad/core/tasks/validate-workflow.xml` is not present in this repository snapshot, so checklist validation was performed manually during story creation.
- External web lookup was not available through the workflow context; latest technical guidance was derived from repo-pinned package manifests, planning artifacts, and the live source tree.
- `packages/cli/features/generateCommand.feature` is now wired into the live Cucumber runner with dedicated step definitions covering JSON, CSV, SQL, precedence, and save-context behavior.

### Implementation Plan

- Add output-format resolution and SQL table-name handling to `td generate` without breaking the existing JSON default path.
- Route CSV and SQL output through the core adapters while preserving current JSON-array CLI behavior and save-context semantics.
- Extend CLI unit and Gherkin coverage so JSON, CSV, SQL, and format inference are all exercised by the live test harness.

### Completion Notes List

- Implemented CLI format resolution with precedence `--format` > supported output-file extension > effective config default and widened config validation to accept `json`, `csv`, and `sql` defaults.
- Added SQL-specific CLI handling with `--table-name`, deterministic fallback to output/schema file stems, and a fast-fail validation path when `--table-name` is used outside SQL output.
- Routed CSV and SQL output through the existing core adapters while preserving plain JSON CLI output, stdout support via a temporary CLI-local bridge, and JSON save-context persistence.
- Added focused unit coverage and live Cucumber scenarios for JSON, CSV, SQL, format inference, explicit precedence, SQL table-name resolution, and non-JSON save-context behavior.
- Fixed senior-review findings by writing stdout without an extra newline, running CLI BDD against the built `dist/td.js` entrypoint, and wiring CLI BDD plus dist verification into the normal CI flow.
- Validation passed with `runTests` on the targeted CLI tests, `runTests` across the full repository suite (`774` passing), `bun run test:bdd` in `packages/cli` (`11` scenarios passing), and targeted ESLint on the edited CLI TypeScript files.

### File List

- `_bmad-output/implementation-artifacts/10-3-cli-multi-format-support.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.github/workflows/ci.yml`
- `docs/configuration.md`
- `package.json`
- `packages/cli/dist/td.js`
- `packages/cli/features/generateCommand.feature`
- `packages/cli/features/step_definitions/generateCommand.steps.ts`
- `packages/cli/package.json`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/config/configLoader.test.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/config/types.ts`
- `packages/cli/tests/run-cucumber.ts`

## Change Log

- 2026-03-31: Implemented CLI multi-format support with adapter-backed CSV and SQL output, SQL table-name resolution, config default widening, live Cucumber coverage, and updated configuration guidance.

## Senior Developer Review (AI)

### Reviewer

GPT-5.4

### Outcome

Approved after fixes.

### Notes

- Fixed the stale packaged CLI risk by rebuilding `packages/cli/dist/td.js` and adding CI verification that the generated artifact stays committed.
- Switched CLI Gherkin coverage to execute the built `dist/td.js` entrypoint and updated the package-level `test:bdd` script to build before running scenarios.
- Removed the extra stdout newline for adapter-backed CSV and SQL output and added regression tests that compare stdout and file output byte-for-byte.