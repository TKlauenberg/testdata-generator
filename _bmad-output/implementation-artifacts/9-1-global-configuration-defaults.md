# Story 9.1: Global Configuration Defaults

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **global defaults that apply to all my projects**,
so that **I don't repeat common settings in every schema**.

## Acceptance Criteria

1. A global config file location is defined in `packages/cli/src/config/defaults.ts`, for example `~/.tdconfig.json`.
2. Global config supports default generator settings.
3. Global config supports default output format and count.
4. Global config supports user-scope context defaults where appropriate.
5. Global config is loaded automatically by the CLI.
6. Global config values have the lowest priority and are overridden by all other levels.
7. Missing global config file is not an error; the CLI falls back to built-in defaults.
8. Unit tests verify global config loading.
9. Documentation explains global config options.

## Tasks / Subtasks

- [ ] Establish a focused CLI global-config contract and built-in defaults layer (AC: 1, 2, 3, 4, 6, 7)
  - [ ] Add `packages/cli/src/config/defaults.ts` to define the built-in defaults, the global config filename/path resolver, and the normalized config shape used by the CLI.
  - [ ] Add `packages/cli/src/config/types.ts` if needed so config data remains explicit, readonly, and future-safe for Stories 9.2-9.4.
  - [ ] Keep the initial contract intentionally scoped to user-level concerns already present in the repo: record count, output format, and context-directory defaults, while also defining a validated place for generator-default mappings that later stories can apply more broadly.
  - [ ] Treat global config as the lowest-priority layer only. Do not implement workspace or schema merging logic in this story beyond establishing a clean boundary for future composition.

- [ ] Implement global-config loading and validation in a dedicated CLI config module (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] Add `packages/cli/src/config/configLoader.ts` to resolve the user home directory, read the global config JSON if it exists, and return built-in defaults when it does not.
  - [ ] Use Bun/Node standard library path utilities only; no external config dependency is needed.
  - [ ] Fail clearly when the file exists but contains invalid JSON or unsupported values, with actionable error messages that match the CLI's existing style.
  - [ ] Validate supported values explicitly, including the currently supported output format(s), positive integer count semantics, and any context-directory path string fields.
  - [ ] Preserve a normalized config object that carries generator-default mappings even if some generator-level application remains limited until later Epic 9 stories.

- [ ] Wire global defaults into the live CLI command flow without broad refactors (AC: 3, 4, 5, 6, 7)
  - [ ] Update `packages/cli/src/commands/generate.ts` so omitted CLI flags fall back to resolved global defaults instead of hard-coded literals.
  - [ ] Keep explicit CLI flags as higher priority than global config.
  - [ ] Reconcile global context defaults with the existing `--save-context-dir` behavior introduced in Story 8.5 so user-level defaults can supply the directory when the flag is omitted.
  - [ ] Keep current generate behavior intact for validation, stdout/output-file handling, and save-context side effects.
  - [ ] Avoid introducing config side effects into commands that do not need them yet unless a small shared helper materially reduces duplication.

- [ ] Define generator-default support in a way that does not break current architecture (AC: 2, 6)
  - [ ] Reuse existing concepts already present in the repo, especially `DefaultSpec` / profile-style default mappings in `packages/core/src/parser/ast.ts`, instead of inventing a second generator-default vocabulary.
  - [ ] Keep ownership boundaries clear: the CLI global config may define user-level generator defaults, but schema-level application and precedence against schema and field defaults belong to later Epic 9 stories.
  - [ ] If any generator-default behavior is surfaced in this story, keep it additive and forward-compatible with the future precedence model `field > schema > workspace > global > built-in`.

- [ ] Add focused unit coverage for global-config loading and command integration (AC: 7, 8)
  - [ ] Add tests alongside the new CLI config module for path resolution, missing-file fallback, invalid JSON handling, invalid value handling, and normalization of supported config fields.
  - [ ] Extend `packages/cli/src/commands/generate.test.ts` to prove global defaults are used when flags are omitted and overridden when flags are provided.
  - [ ] Add regression coverage proving Story 8.5 save-context behavior still works when the save directory comes from global config defaults.

- [ ] Document the user-facing global config surface (AC: 9)
  - [ ] Update `README.md` and any relevant docs with the global config location, supported keys, and examples.
  - [ ] Document that missing global config is allowed, global config is the lowest-priority layer, and this story does not yet include workspace/schema precedence.
  - [ ] Include at least one example showing how a user can set default count, default format, and a default context/save directory.

- [ ] Add acceptance-focused BDD coverage where it adds clear value (AC: 5, 7, 9)
  - [ ] Add or extend CLI feature coverage if command-boundary behavior is the clearest way to prove automatic loading and CLI-overrides-global precedence.
  - [ ] Keep BDD scope focused on user-visible behavior; detailed config parsing edge cases should remain unit tests.

## Dev Notes

### Story Foundation

- Epic 9 closes the configuration gap left open by Epic 8. Story 9.1 establishes the user-level global layer that later stories will extend with workspace defaults, schema defaults, and final precedence/inspection behavior.
- The business goal is reduced repetition across projects: users should be able to set a personal baseline once and have the CLI honor it automatically.
- The current repo does **not** yet contain the planned CLI config module from the architecture docs. `packages/cli/src/config/defaults.ts` and `packages/cli/src/config/configLoader.ts` must be created in this story.
- The live CLI already has user-facing defaults embedded directly in `packages/cli/src/commands/generate.ts`: `--count` defaults to `10`, `--format` defaults to `json`, and `--save-context-dir` falls back to `./contexts`. Story 9.1 should centralize those defaults instead of duplicating more literals.
- Story 8.5 already introduced configuration-sensitive behavior via `--save-context-dir`. Story 9.1 must make that user-level default configurable without pulling in the full multi-layer merge system early.

### Technical Requirements

- Runtime and language remain Bun 1.x, TypeScript strict mode, and ESM-only modules.
- Use explicit types and readonly data for config contracts; avoid `any` and avoid untyped JSON plumbing.
- Keep expected validation failures actionable and user-friendly. A missing global config file is a valid state; an unreadable or malformed existing file should produce a clear CLI error.
- Preserve the existing command contract: explicit CLI flags always win over config defaults.
- Treat global config as a shallow, explicit layer over built-in defaults. Do not introduce deep-merging behavior in this story.
- Current live output support in the generate command is JSON-only in practice. If config exposes `defaultFormat`, validate it against the formats actually supported by the current command surface and keep future formats as later-story work.
- User-scope context defaults should be grounded in existing behavior. The concrete current need is the default directory used by `--save-context-dir`; avoid inventing unrelated context semantics.

### Architecture Compliance

- Keep config ownership in `packages/cli/src/config/`; the core package must remain independent of CLI concerns.
- Reuse existing core concepts where they already model defaults, particularly `DefaultSpec` in `packages/core/src/parser/ast.ts`, rather than creating incompatible generator-default terminology.
- Preserve the current package boundary: CLI may read config and translate it into command options, but core must not import CLI config code.
- Export new CLI config helpers cleanly and keep module boundaries obvious; if a new `packages/cli/src/config/index.ts` barrel helps, use it.
- Favor a minimal extension of the current generate command instead of refactoring all commands around a global application object.

### Library / Framework Requirements

- Reuse the repository-pinned stack already present: Bun, TypeScript, Commander.js, Cucumber, and SerenityJS.
- `packages/cli/package.json` currently depends on `commander` `^14.0.2`; lightweight external lookup shows the latest package metadata at `14.0.3`, but no upgrade is required for this story.
- Use standard library facilities for config-path resolution and file access (`node:path`, `node:os` and/or Bun-compatible equivalents).
- No new external dependency is needed for config loading, home-directory resolution, or JSON parsing.

### File Structure Requirements

- New files likely required:
  - `packages/cli/src/config/defaults.ts`
  - `packages/cli/src/config/configLoader.ts`
  - `packages/cli/src/config/configLoader.test.ts`
  - `packages/cli/src/config/types.ts` and/or `packages/cli/src/config/index.ts` if useful for clarity
- Existing files likely to update:
  - `packages/cli/src/commands/generate.ts`
  - `packages/cli/src/commands/generate.test.ts`
  - `packages/cli/bin/td.ts` only if a shared config bootstrap hook is warranted
  - `README.md`
  - CLI feature files / Cucumber runner only if command-boundary BDD coverage is added

### Testing Requirements

- Unit tests must verify:
  - global config path resolution targets the user-home config file location,
  - missing global config returns built-in defaults without error,
  - malformed JSON and unsupported values fail clearly,
  - normalized config exposes default count, default format, supported context defaults, and generator-default mappings,
  - explicit CLI flags override global defaults,
  - save-context directory behavior still works when the directory comes from config.
- BDD tests should verify the user-visible flow where a global config file is discovered automatically and omitted CLI flags inherit from it.
- Keep detailed parsing/validation edge cases in unit tests; do not force every malformed-config scenario through BDD.

### Latest Technical Information

- Repository-pinned CLI dependency: `commander` `^14.0.2` in `packages/cli/package.json`.
- Lightweight registry lookup shows `commander` `14.0.3` as the current latest metadata entry. No migration is needed here; use the existing pinned dependency line and current command API patterns.
- The current CLI entrypoint in `packages/cli/bin/td.ts` registers `generate`, `validate`, and `init` commands directly. Story 9.1 should fit into that structure rather than introducing a new framework layer.

### Project Context Reference

- Follow `_bmad-output/planning-artifacts/project-context.md` rules:
  - strict TypeScript, no `any`, ESM-only modules,
  - exports through `index.ts` barrels where appropriate,
  - co-located unit tests and acceptance-focused BDD coverage,
  - Bun-based commands and test workflows.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-9-cascading-configuration-system.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Patterns/rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Sprint state: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Live CLI entrypoint: `packages/cli/bin/td.ts`
- Live generate command: `packages/cli/src/commands/generate.ts`
- Live generate tests: `packages/cli/src/commands/generate.test.ts`
- Live context persistence behavior: `packages/core/src/context/contextManager.ts`
- Existing default-spec concept: `packages/core/src/parser/ast.ts`
- Recent completed context story: `_bmad-output/implementation-artifacts/8-5-save-generated-data-as-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Context assembled from sprint status, Epic 9, PRD, project-context rules, architecture shards, current CLI entrypoint and generate command, current core context persistence code, parser default-spec types, recent git history, and lightweight Commander package metadata.
- Discovery results used for this story: Epic 9 loaded from `_bmad-output/planning-artifacts/epics/epic-9-cascading-configuration-system.md`, PRD from `_bmad-output/planning-artifacts/prd.md`, architecture from `_bmad-output/planning-artifacts/architecture/`, project rules from `_bmad-output/planning-artifacts/project-context.md`, sprint state from `_bmad-output/implementation-artifacts/sprint-status.yaml`, and current implementation paths from `packages/cli/bin/td.ts`, `packages/cli/src/commands/generate.ts`, `packages/core/src/context/contextManager.ts`, and `packages/core/src/parser/ast.ts`.
- No UX-specific artifact was present for this story.

### Implementation Plan

- Create a dedicated CLI config module that defines built-in defaults, resolves the global config path, and loads/validates user-level config from the home directory.
- Move generate-command defaults to the new effective-config path while preserving explicit CLI flag precedence.
- Support user-scope context defaults by wiring config into the existing save-context directory behavior introduced in Story 8.5.
- Keep generator-default support forward-compatible with the existing `DefaultSpec` concept and later Epic 9 precedence stories.
- Add focused unit and command-boundary acceptance coverage plus user documentation for the new global config surface.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Auto-selected the first backlog story from sprint tracking: `9-1-global-configuration-defaults`.
- Marked Story 9.1 as `ready-for-dev` and advanced sprint tracking from `backlog` to `ready-for-dev` for this story while setting Epic 9 to `in-progress`.

### File List

- `_bmad-output/implementation-artifacts/9-1-global-configuration-defaults.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-08: Created Story 9.1 context artifact via create-story workflow and set sprint status to `ready-for-dev`.