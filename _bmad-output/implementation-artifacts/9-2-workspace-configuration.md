# Story 9.2: Workspace Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA team member**,
I want **team-shared workspace configuration**,
so that **all team members use consistent test data standards**.

## Acceptance Criteria

1. A `.tdconfig.json` file in project root is recognized as workspace config.
2. Workspace config overrides global defaults.
3. Workspace config supports all same options as global config.
4. Workspace config can define team-shared context defaults without conflicting with schema semantics.
5. Workspace config can specify default generator mappings.
6. Workspace config is version-controlled with the project.
7. The CLI automatically discovers workspace config from current directory or parent directories.
8. Unit tests verify workspace config loading and priority.
9. Gherkin tests verify workspace config overrides global defaults.

## Tasks / Subtasks

- [x] Extend the CLI config model to represent layered config sources cleanly (AC: 2, 3, 4, 5)
  - [x] Add explicit workspace-config path/source typing in `packages/cli/src/config/types.ts` so global vs workspace origin is inspectable in tests.
  - [x] Keep workspace options aligned with Story 9.1 keys only (`defaults`, `context`, `generatorDefaults`) and avoid introducing schema-level semantics in CLI config.
  - [x] Preserve forward compatibility for Story 9.4 precedence and Story 9.3 schema defaults.

- [x] Implement workspace config discovery and loading in CLI config module (AC: 1, 2, 3, 7)
  - [x] Add upward directory discovery in `packages/cli/src/config/configLoader.ts` that searches from the current working directory to filesystem root for `.tdconfig.json`.
  - [x] Parse and validate workspace config using the same validation contract as global config.
  - [x] Compose effective CLI config with precedence: workspace > global > built-in.
  - [x] Keep override semantics explicit and shallow (no deep merge), matching Epic 9 precedence direction and current acceptance criteria.

- [x] Wire workspace-aware config resolution into command execution (AC: 1, 2, 4, 7)
  - [x] Update `packages/cli/src/commands/generate.ts` to load effective config using current working directory context.
  - [x] Keep explicit CLI flags higher priority than workspace/global defaults.
  - [x] Ensure `--save-context-dir` fallback uses workspace config when present, then global, then built-in.

- [x] Add robust unit coverage for workspace discovery and precedence (AC: 8)
  - [x] Extend `packages/cli/src/config/configLoader.test.ts` for discovery from nested directories, no-config fallback, invalid workspace JSON, and permission failures.
  - [x] Add precedence tests proving workspace values override global values and global values override built-in defaults.
  - [x] Add path-resolution tests to ensure nearest `.tdconfig.json` is selected when multiple parent levels contain config files.

- [x] Add command-level integration coverage for effective config behavior (AC: 8)
  - [x] Extend `packages/cli/src/commands/generate.test.ts` with scenarios where workspace and global config differ and generated record counts/context save directories confirm precedence.
  - [x] Add a regression test proving explicit flags still override workspace config.

- [x] Add Gherkin acceptance coverage for workspace precedence (AC: 9)
  - [x] Extend `packages/cli/features/saveGeneratedContext.feature` (or add a dedicated workspace-config feature) with scenarios validating workspace-over-global behavior from nested working directories.
  - [x] Update `packages/cli/features/step_definitions/saveGeneratedContext.steps.ts` only as needed to set up both HOME and workspace config files per scenario.

- [x] Document workspace config usage for teams (AC: 6)
  - [x] Update `README.md` with `.tdconfig.json` workspace examples and precedence summary against global defaults.
  - [x] Clarify that workspace config belongs in version control and is intended for team-shared defaults.

## Dev Notes

### Story Foundation

- Epic 9 defines the cascading configuration model. Story 9.1 established global defaults; Story 9.2 adds team-shared workspace defaults with automatic discovery and higher precedence.
- The source epic explicitly requires workspace discovery from current directory and parent directories, making root-bound-only lookup insufficient.
- The implementation must preserve clear ownership boundaries: CLI/workspace configuration controls CLI defaults and behavior, while schema-level defaults remain in Story 9.3.

### Technical Requirements

- Keep runtime and language constraints unchanged: Bun 1.x, TypeScript strict mode, ESM modules.
- Use the existing `CliConfigError` pattern for actionable failures and correct exit codes.
- Reuse the same validation rules as global config for supported keys and value types.
- Missing workspace config file is normal and must not fail command execution.
- Invalid or unreadable discovered workspace config must fail clearly and consistently with Story 9.1 behavior.

### Architecture Compliance

- Keep config concerns under `packages/cli/src/config/`; do not move config semantics into core package.
- Keep layer responsibilities explicit for future Story 9.4 effective-config explainability work.
- Avoid deep merge behavior and avoid introducing new implicit defaults beyond built-in/global/workspace layering.

### Library / Framework Requirements

- Keep existing repository stack and pinned dependencies; no new config library dependency is required.
- Commander is pinned as `^14.0.2` in `packages/cli/package.json`; latest metadata lookup currently reports `14.0.3`, but no upgrade is required for this story.
- Use standard library path and filesystem modules for discovery (`node:path`, `node:fs/promises`).

### File Structure Requirements

- Primary files expected to change:
  - `packages/cli/src/config/configLoader.ts`
  - `packages/cli/src/config/types.ts`
  - `packages/cli/src/config/configLoader.test.ts`
  - `packages/cli/src/commands/generate.ts`
  - `packages/cli/src/commands/generate.test.ts`
  - `packages/cli/features/saveGeneratedContext.feature`
  - `packages/cli/features/step_definitions/saveGeneratedContext.steps.ts`
  - `README.md`

### Testing Requirements

- Unit tests must cover:
  - discovery of nearest workspace config from nested directories,
  - no-workspace fallback behavior,
  - invalid workspace JSON/object/value handling,
  - layer precedence workspace > global > built-in,
  - preservation of Story 9.1 global behavior when workspace config is absent.
- Command-level tests must validate generated output count/save directory precedence behavior.
- BDD scenarios must validate user-facing behavior that workspace defaults override global defaults.

### Previous Story Intelligence

- Story 9.1 already created a strong config foundation in `packages/cli/src/config/` with:
  - centralized defaults in `defaults.ts`,
  - strict normalization and validation in `configLoader.ts`,
  - CLI integration through `generate.ts`,
  - both unit and BDD coverage patterns.
- Story 9.1 review fixes should be preserved:
  - strict integer parsing for CLI numeric flags,
  - clear path-resolution error handling,
  - config-provided `generatorDefaults` must apply only when a field does not already declare its own generator.
- Reuse existing test helper patterns that create temporary HOME/workspace directories and spawn CLI subprocesses.

### Git Intelligence Summary

- Recent commits show the active code surface for configuration changes:
  - `33579ec` created Story 9.1 artifact and sprint tracking update.
  - `5b71f11` implemented global config loading, tests, and BDD behavior.
  - `3c2c12b` tightened code-review fixes in config loader and generate command.
- Practical implication: Story 9.2 should build incrementally on the current config module and test structure, not introduce a new configuration subsystem.

### Latest Technical Information

- Latest registry metadata check: `commander` currently reports `14.0.3`; repository dependency remains `^14.0.2` and is acceptable for this story.
- No additional library upgrades are required to satisfy workspace discovery and precedence acceptance criteria.

### Project Context Reference

- Follow project context rules in `_bmad-output/planning-artifacts/project-context.md`:
  - strict typing and no `any`,
  - ESM-only imports/exports,
  - co-located unit tests,
  - Bun-based test execution,
  - maintain module boundaries and index exports.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-9-cascading-configuration-system.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Previous story: `_bmad-output/implementation-artifacts/9-1-global-configuration-defaults.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Pattern rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Current CLI config loader: `packages/cli/src/config/configLoader.ts`
- Current CLI defaults: `packages/cli/src/config/defaults.ts`
- Current generate command: `packages/cli/src/commands/generate.ts`
- Current config tests: `packages/cli/src/config/configLoader.test.ts`
- Current command tests: `packages/cli/src/commands/generate.test.ts`
- Current BDD feature: `packages/cli/features/saveGeneratedContext.feature`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story selected automatically from sprint tracking as the first backlog story key: `9-2-workspace-configuration`.
- Discovery and analysis sources loaded: Epic 9 shard, PRD, architecture shards, project context rules, previous story 9.1 artifact, sprint status, and recent git history.
- Implemented layered CLI config loading with explicit built-in/global/workspace source metadata and upward `.tdconfig.json` discovery from the current working directory.
- Review fix applied: excluded the HOME-level global config path from workspace discovery so user-level config is not misclassified as a workspace layer.
- Review fix applied: config `generatorDefaults` now flow through validation and generation for fields without explicit generators, while explicit field generators remain higher priority.
- Validation rerun summary: targeted CLI/config tests passed and `bun run --cwd packages/cli test:bdd` passed after the review fixes.

### Completion Notes List

- Story file generated for `9-2-workspace-configuration` with status `ready-for-dev`.
- Sprint tracking updated: `9-2-workspace-configuration` moved from `backlog` to `ready-for-dev`.
- Added workspace-aware CLI config composition with shallow section precedence `workspace > global > built-in` and explicit layer/source metadata for future explainability work.
- Wired `td generate` to resolve effective config from the current working directory while preserving explicit flag precedence and workspace-aware context save-directory fallback.
- Added unit, command-level, and Gherkin coverage for nested workspace discovery, precedence, invalid workspace config handling, and explicit flag overrides.
- Updated README with workspace `.tdconfig.json` usage, precedence rules, and version-control guidance for team-shared defaults.
- Fixed workspace discovery so the global HOME config does not masquerade as a workspace layer when running inside directories under HOME.
- Applied config `generatorDefaults` at runtime for fields without explicit generators, while preserving field-level generator precedence.
- Added regression coverage for the HOME/workspace boundary and generator-default runtime behavior.
- Story review findings are resolved and the acceptance criteria validate as done.

### File List

- `README.md`
- `packages/cli/features/saveGeneratedContext.feature`
- `packages/cli/features/step_definitions/saveGeneratedContext.steps.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/generate.test.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/config/configLoader.test.ts`
- `packages/cli/tsconfig.json`
- `packages/core/src/generateData.ts`
- `packages/core/src/validate.ts`
- `packages/core/src/generator/generator.ts`
- `packages/cli/src/config/index.ts`
- `packages/cli/src/config/types.ts`
- `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-09: Created Story 9.2 context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-03-09: Implemented workspace configuration discovery, layered CLI config precedence, README guidance, and CLI-focused test coverage.
- 2026-03-10: Fixed code-review findings by excluding the HOME-level global config from workspace discovery and applying config generator defaults during runtime validation/generation.
