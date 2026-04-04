# Story 11.2: Shared Generator Definitions

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA team,
I want to define custom generators that are shared across the team,
so that we have consistent test data patterns.

The current codebase already supports upward-discovered workspace config, workspace-root threading, and field-type `generatorDefaults`, but it does not support named workspace generators or `@workspace.generators.*` references. This story should add team-shared generator definitions on top of the existing config and import-aware validation pipeline without overloading `generatorDefaults`, reading config files from core, or bypassing analyzer/generator precedence rules.

## Acceptance Criteria

1. Given I need team-specific generators, when I implement shared generator references and workspace config can define generator mappings, then `@workspace.generators.customEmail` references a workspace-defined generator.
2. Workspace config specifies generator as template or composition.
3. Generators can compose multiple built-in generators.
4. Generator definitions are validated during config loading.
5. Undefined generator references result in clear error messages.
6. Unit tests verify workspace generator resolution.
7. Gherkin tests verify custom generators work in real schemas.

## Tasks / Subtasks

- [x] Extend the workspace-config model for named shared generators and validate definitions during config loading (AC: 2, 4)
  - [x] Add an additive `.tdconfig.json` section for named shared generator definitions, preferably `generators`, rather than repurposing the existing `generatorDefaults` field-type mapping section.
  - [x] Define and validate the allowed workspace generator shapes at load time: template-backed definitions and composition-backed definitions that stay within built-in generators for this story.
  - [x] Reject duplicate names, invalid payloads, reserved or built-in name collisions unless explicit shadowing is intentionally supported and fully tested, and circular generator definitions before validation or generation begins.
  - [x] Keep config ownership in `packages/cli/src/config/`; core should receive typed, already-normalized workspace generator definitions instead of reading `.tdconfig.json` directly.
  - [x] Update `docs/configuration.md` and any relevant config examples once the final JSON shape is settled, because this story introduces a new team-facing config surface.

- [x] Extend DSL parsing and AST support so fields can reference workspace generators via the existing `generator=` slot (AC: 1, 5)
  - [x] Update parser and AST support so a field can express `generator=@workspace.generators.customEmail` or an equivalent syntax that preserves the epic's reference form, without introducing a second generator declaration model.
  - [x] Preserve existing `generator=name(...)` grammar for built-ins and add parser errors or suggestions for malformed workspace generator references.
  - [x] Ensure diagnostics retain real source locations and clearly distinguish malformed reference syntax from an undefined workspace generator.

- [x] Resolve workspace generator references and compositions in the shared core validation and generation pipeline (AC: 1, 2, 3, 4, 5)
  - [x] Introduce additive core options and types to accept normalized workspace generator definitions in `validateSchema()`, `generateData()`, analyzer options, and any generation helpers used by CLI and programmatic consumers.
  - [x] Validate `@workspace.generators.*` references in analyzer semantics alongside built-in generator recognition, with suggestion-style errors for undefined names.
  - [x] Expand or normalize workspace generator references before runtime generation so `generateRecord()` and the built-in registry can keep operating on concrete executable generator plans rather than ad hoc string lookups.
  - [x] Preserve the current precedence model: explicit field declaration > schema `@defaults` > workspace/global field-type `generatorDefaults` > built-in fallback. A field that explicitly references a workspace generator is still a field-level declaration, not a config default.
  - [x] Keep Story 11.1 file and workspace context threading intact; do not add a second workspace-root or config-discovery mechanism.

- [x] Add regression coverage that runs in the active harness (AC: 4, 5, 6, 7)
  - [x] Extend CLI config tests for valid workspace generator definitions, invalid shapes, duplicate names, cyclic definitions, and nearest-workspace discovery behavior.
  - [x] Add parser, analyzer, validate, and generateData unit tests for parsing `@workspace.generators.*`, resolving valid custom generators, rejecting undefined references, and executing template-backed and composition-backed definitions.
  - [x] Add Gherkin scenarios using real `.tdconfig.json` fixtures plus `.td` schema files to prove custom workspace generators work end to end in actual schemas.
  - [x] Register any new core feature file and step definitions in `packages/core/tests/run-cucumber.ts`; do not rely on dormant features such as `config-priority.feature` unless they are explicitly wired into the active runner.

## Dev Notes

### Story Foundation

- Epic 11 adds composition and reusability for shared test-data patterns. Story 11.1 already introduced import-aware validation and workspace-root threading; Story 11.2 should build on that same core pathway, not a CLI-only alias system.
- The PRD emphasizes progressive team-shared pattern libraries and Git-friendly reuse. Named workspace generators are part of that team-library story, not just a convenience alias.
- Story 11.3 depends on reusable building blocks remaining composable. Story 11.4 will depend directly on this story's reference-validation behavior and error-message quality.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts, so the user-facing quality bar comes from the PRD plus the existing CLI diagnostic and help patterns.

### Technical Requirements

- Current workspace config already supports `generatorDefaults` as field-type mappings only. `docs/configuration.md` documents that meaning; preserve it and add a distinct named-generator surface rather than redefining the existing section.
- The current parser only accepts an identifier after `generator=` in `_parseGeneratorSpec()` inside `packages/core/src/parser/parser.ts`. Supporting `@workspace.generators.customEmail` is an additive parser and AST change, not just analyzer wiring.
- `ValidationOptions`, `GenerateDataOptions`, and `AnalyzeOptions` already thread `defaultGenerators`, `currentFile`, and `workspaceRoot`. Add a parallel typed option for workspace generator definitions instead of making core load config from disk.
- `packages/core/src/analyzer/analyzer.ts` currently hardcodes `RECOGNIZED_GENERATORS` and uses that same list for suggestion logic. Extend that path for workspace generators so undefined names produce the same class of actionable diagnostic.
- `packages/core/src/generator/generator.ts` currently dispatches through `field.resolvedGenerator ?? field.resolvedType` against built-in behavior and `GENERATOR_REGISTRY`. Prefer normalizing workspace definitions to concrete built-in execution plans or a small resolver helper instead of mutating the built-in registry globally.
- Validate shared generator definitions during config loading, including malformed template or composition shapes and cycles, so users fail before schema validation or generation begins.
- Keep scope bounded: the acceptance criteria require template-backed or composition-backed definitions and composition of multiple built-in generators. Do not introduce a general plugin system or runtime code execution model in this story.

### Architecture Compliance

- Keep workspace config discovery and JSON normalization in `packages/cli/src/config/`; core should remain filesystem-agnostic except for the already-established source-file and workspace-root context from Story 11.1.
- Maintain the established pipeline: scanner -> parser -> import resolution -> analyzer -> generator.
- Shared generator references must flow through the same analyzer and generator contracts as built-ins and defaults; do not create a separate preprocessor that bypasses semantic analysis.
- Preserve ESM strict TypeScript, Result-based fallible operations, and monorepo boundaries. If new core types become public, export them through the correct `index.ts` barrels only.
- Keep the implementation compatible with future Story 11.4 reference validation and suggestion logic.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language and tooling: TypeScript `^5.9.3`, ESLint `^9.39.2`, Prettier `^3.7.4`.
- CLI framework: Commander is pinned at `^14.0.2` in the repo; npm currently lists `14.0.3`, but this story does not require a Commander upgrade.
- No new dependency should be necessary. Use the existing Bun, TypeScript, and Node standard library stack plus the current core and CLI packages.

### File Structure Requirements

Primary CLI/config files likely to change:

- `packages/cli/src/config/types.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/config/configLoader.test.ts`
- `packages/cli/src/config/defaults.ts` if an explicit built-in empty generator-definition section needs representation
- `packages/cli/src/commands/generate.ts` and `packages/cli/src/commands/validate.ts` only if additive workspace-generator options must be threaded through command entry points
- `docs/configuration.md` and example config snippets if the final config shape is user-visible

Primary core files likely to change:

- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/analyzer/types.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/validate.ts`
- `packages/core/src/generateData.ts`
- `packages/core/src/generator/generator.ts`
- potentially a small new helper module under `packages/core/src/analyzer/` or `packages/core/src/generator/` for workspace generator normalization or resolution

BDD and unit coverage likely to change:

- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/src/generateData.test.ts`
- `packages/core/features/support/abilities/ValidateSchemaAbility.ts`
- `packages/core/features/support/tasks/ValidationTasks.ts`
- a new executed feature under `packages/core/features/`
- matching step definitions and `.tdconfig.json` plus `.td` fixtures
- `packages/core/tests/run-cucumber.ts`

Likely unnecessary unless implementation proves otherwise:

- import-resolution code in `packages/core/src/imports/`
- built-in generator modules under `packages/core/src/generator/generators/` unless composition execution exposes a missing built-in capability
- scanner token model if parser can consume the new reference form with existing tokens

### Testing Requirements

- Unit tests must cover:
  - config-load validation of workspace generator definitions,
  - duplicate and cyclic shared generator definitions,
  - parser acceptance and rejection for `generator=@workspace.generators.*`,
  - analyzer diagnostics for undefined shared generators with suggestions,
  - precedence interactions between explicit field references, schema defaults, `generatorDefaults`, and built-ins,
  - runtime generation using template-backed and composition-backed workspace generators.
- Gherkin tests must use real schema and config fixtures on disk, including a `.tdconfig.json` in a discovered workspace root and schema files that reference shared generators.
- Because `config-priority.feature` is not currently in the active core Cucumber runner, add any new shared-generator feature to `packages/core/tests/run-cucumber.ts` or extend an already-executed feature and wire its step definitions explicitly.
- Preserve current CLI/config and import-resolution regressions from Stories 9.2 and 11.1.

### Previous Story Intelligence

- Story 11.1 already added `currentFile` and `workspaceRoot` threading through `validateSchema()` and `generateData()` and created `packages/core/src/imports/importResolver.ts`. Reuse that workspace-root context instead of re-discovering workspace state in core.
- Story 9.2 already established upward `.tdconfig.json` discovery, shallow section overrides, and a clear CLI/core ownership boundary. Extend that system rather than adding a parallel configuration subsystem.
- Existing BDD support already has workspace-default generator plumbing in `ValidateSchemaAbility` and `ValidationTasks`, but it only covers `generatorDefaults`; extend that test harness rather than creating a second validation ability.

### Git Intelligence Summary

- Recent commits show Story 11.1 progression in sequence: `7b1dc78` create-story 11.1, `033bbb4` dev-story 11.1, and `9d39949` code review story 11.1.
- Practical implication: Story 11.2 should extend the freshly landed import-aware validation and generation path and keep its conventions consistent, because this area changed very recently.

### Latest Technical Information

- Bun docs still position Bun as the all-in-one runtime, package manager, and test runner for this project; no runtime or tooling change is needed for Story 11.2.
- npm currently lists Commander `14.0.3`, while the repo pins `^14.0.2`. This story is config and model work and does not need a Commander upgrade.
- No external package is needed for shared generator definitions; the current Bun + TypeScript + Node standard library stack is sufficient.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern handling for fallible operations.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/parser/parser.ts` currently parses only identifier-based generator names after `generator=` and will reject the `@workspace.generators.*` reference form until extended.
- `packages/core/src/analyzer/analyzer.ts` currently treats recognized generator names as a hardcoded set and uses that same list for suggestion logic.
- `packages/core/src/generator/generator.ts` currently dispatches generation by `field.resolvedGenerator ?? field.resolvedType` against built-in runtime behavior; shared generators need a normalized path into that runtime.
- `packages/cli/src/config/configLoader.ts` already validates global and workspace config and discovers the nearest `.tdconfig.json`; this is the correct place for eager workspace generator-definition validation.
- `packages/core/features/config-priority.feature` exists but is not part of the active core runner; end-to-end acceptance coverage for this story must be wired explicitly.
- `docs/configuration.md` currently documents `generatorDefaults` only as field-type defaults. If Story 11.2 introduces a new `generators` section, the docs must stay aligned.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-11-pattern-composition-reusability.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Existing workspace-config story: `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- Existing import-resolution story: `_bmad-output/implementation-artifacts/11-1-dsl-import-statement-support.md`
- Config reference: `docs/configuration.md`
- CLI config types: `packages/cli/src/config/types.ts`
- CLI config loader: `packages/cli/src/config/configLoader.ts`
- CLI generate command: `packages/cli/src/commands/generate.ts`
- CLI validate command: `packages/cli/src/commands/validate.ts`
- Parser AST: `packages/core/src/parser/ast.ts`
- Parser implementation: `packages/core/src/parser/parser.ts`
- Analyzer types: `packages/core/src/analyzer/types.ts`
- Analyzer implementation: `packages/core/src/analyzer/analyzer.ts`
- Shared validation API: `packages/core/src/validate.ts`
- Public generation API: `packages/core/src/generateData.ts`
- Generator engine: `packages/core/src/generator/generator.ts`
- Active BDD runner: `packages/core/tests/run-cucumber.ts`
- Existing validation ability: `packages/core/features/support/abilities/ValidateSchemaAbility.ts`
- Existing validation tasks: `packages/core/features/support/tasks/ValidationTasks.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story selected automatically from sprint tracking as the first backlog story key: `11-2-shared-generator-definitions`.
- Discovery sources loaded: Epic 11 shard, PRD, architecture shards, project context, Story 9.2 and 11.1 implementation artifacts, current config, analyzer, parser, generator code, active BDD runner, repository configuration docs, recent git history, and current Bun and Commander reference pages.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- The current parser only accepts identifier-based generator names, and the current analyzer and generator path only understands built-in names plus field-type `generatorDefaults`; named workspace generators are not implemented.
- `config-priority.feature` currently exists but is not executed by the active core Cucumber runner, so AC-level BDD coverage for this story must be wired explicitly.
- Existing workspace config discovery and workspace-root threading from Stories 9.2 and 11.1 are the critical reuse paths for this story.
- Added a dedicated `generators` config section with eager normalization for template-backed and composition-backed workspace generators, including duplicate-name, built-in-collision, undefined-reference, and cycle detection during config loading.
- Extended scanner, parser, AST, analyzer, validation, and generation paths so `generator=@workspace.generators.<name>` is parsed with source-aware metadata, validated with suggestion-style diagnostics, and executed without making core read `.tdconfig.json` directly.
- Kept core package boundaries intact after an initial test-helper misstep by removing a direct CLI import from the new core BDD step definitions and replacing it with local fixture normalization.
- Full verification completed successfully after iterative fixes: workspace build passed, focused changed-file unit tests passed, targeted ESLint on changed TypeScript files passed, `bun test packages/` passed, and `bun run test:bdd` passed.

### Implementation Plan

- Extend workspace config with a typed, eagerly validated named-generator surface while preserving existing `generatorDefaults` semantics.
- Add additive parser and AST support for `@workspace.generators.*` references in the existing `generator=` slot.
- Thread normalized workspace generator definitions through core validation and runtime generation without making core read config files directly.
- Add unit and executed BDD coverage for definition validation, reference resolution, composition or template execution, and clear diagnostics.

### Completion Notes List

- Added workspace-scoped shared generator definitions through a new `generators` config section, keeping `generatorDefaults` limited to field-type fallback mappings.
- Implemented `generator=@workspace.generators.<name>` parsing and analyzer validation with clear malformed-syntax and undefined-reference diagnostics.
- Threaded normalized workspace generator definitions through `validateSchema()` and `generateData()` so CLI commands and programmatic consumers share the same analyzer and runtime behavior.
- Implemented template-backed and composition-backed shared generator execution in the core generator runtime without mutating the built-in generator registry.
- Added regression coverage across CLI config loading, parser, analyzer, validation, generateData, and active Cucumber scenarios using real `.tdconfig.json` plus `.td` fixtures.
- Verification completed successfully with workspace build, targeted lint, focused changed-file tests, full package unit tests, and the full BDD suite.
- Sprint status advanced from `ready-for-dev` to `in-progress` during execution and is now ready to move to `review`.

### File List

- `_bmad-output/implementation-artifacts/11-2-shared-generator-definitions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/configuration.md`
- `packages/cli/src/commands/config.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/config/configLoader.d.ts`
- `packages/cli/src/config/configLoader.test.ts`
- `packages/cli/src/config/configLoader.ts`
- `packages/cli/src/config/defaults.d.ts`
- `packages/cli/src/config/defaults.ts`
- `packages/cli/src/config/index.d.ts`
- `packages/cli/src/config/types.d.ts`
- `packages/cli/src/config/types.ts`
- `packages/core/features/fixtures/workspace-generators/project/.tdconfig.json`
- `packages/core/features/fixtures/workspace-generators/project/apps/ticket.td`
- `packages/core/features/fixtures/workspace-generators/project/apps/user.td`
- `packages/core/features/step_definitions/workspace-generators.steps.ts`
- `packages/core/features/workspace-generators.feature`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/types.ts`
- `packages/core/src/generateData.test.ts`
- `packages/core/src/generateData.ts`
- `packages/core/src/generator/generator.ts`
- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/index.ts`
- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/scanner/scanner.test.ts`
- `packages/core/src/scanner/tokens.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/src/validate.ts`
- `packages/core/tests/run-cucumber.ts`

## Change Log

- 2026-04-04: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-04: Implemented shared workspace generator definitions, added parser or analyzer or runtime support for `@workspace.generators.*`, updated docs, added unit and BDD coverage, and completed build, lint, unit, and BDD verification.