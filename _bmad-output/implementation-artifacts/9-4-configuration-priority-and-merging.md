# Story 9.4: Configuration Priority and Merging

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **clear configuration priority rules**,
so that **configuration merging is predictable and correct**.

This story also closes the Epic 8 retrospective gap by defining the canonical configuration model for the product.

## Acceptance Criteria

1. Configuration priority is: field-level > schema-level > workspace > global > built-in.
2. Higher priority config completely overrides lower priority (no deep merging).
3. The merger validates configuration values are valid.
4. The implementation defines a canonical configuration model describing which settings belong at each layer.
5. The model explicitly covers Epic 8 context settings such as default context storage and `--save-context-dir`.
6. The model distinguishes CLI/workspace configuration from schema-level semantics.
7. The CLI displays effective configuration with `td config show` command.
8. The config show command indicates source of each setting.
9. Documentation includes a configuration scope matrix and precedence examples for common workflows.
10. Unit tests verify priority order for all config options.
11. Documentation clearly explains cascading rules.

## Tasks / Subtasks

- [ ] Add `td config show` command with per-setting source attribution (AC: 7, 8)
  - [ ] Create `packages/cli/src/commands/config.ts` with a Commander `config` command containing a `show` subcommand.
  - [ ] Add `EffectiveSettingSources` type to `packages/cli/src/config/types.ts` for per-section source attribution.
  - [ ] Implement `getSettingSources(effective: LoadedEffectiveCliConfig): EffectiveSettingSources` in `packages/cli/src/config/configLoader.ts` — derives the winning source (built-in, global, workspace) for each config section by replaying layer priority over `providedSections`.
  - [ ] Export `getSettingSources` and `EffectiveSettingSources` from `packages/cli/src/config/index.ts`.
  - [ ] Format output in the `show` subcommand: display priority legend, config-file paths with found/not-found status, then each setting annotated with `[source]`.
  - [ ] Register `configCommand` in `packages/cli/bin/td.ts`.

- [ ] Add priority verification tests for ALL config options (AC: 10)
  - [ ] Extend `packages/cli/src/config/configLoader.test.ts` to explicitly verify that each of the three sections (`defaults`, `context`, `generatorDefaults`) follows workspace > global > built-in priority, including cases where only one layer provides a section.
  - [ ] Add `packages/cli/src/commands/config.test.ts` with unit tests for the `show` command output: correct source labels, correct value display, correct file-path reporting for found/not-found configs.
  - [ ] Ensure no existing tests break (regression coverage for Stories 9.1, 9.2, 9.3 config behavior).

- [ ] Document the canonical configuration model (AC: 4, 5, 6, 9, 11)
  - [ ] Create `docs/configuration.md` with full 5-layer priority stack, a configuration scope matrix (which settings belong at which layers), Epic 8 context-settings clarification (`context.saveDirectory` vs `--save-context-dir`), and the CLI-vs-schema-semantics boundary.
  - [ ] Update `README.md` to include a concise `## Configuration` section linking to `docs/configuration.md` and showing a quick cascading rule summary and `td config show` example.

- [ ] Add BDD coverage for the configuration priority model (AC: 1, 2)
  - [ ] Create `packages/core/features/config-priority.feature` with scenarios exercising the full priority stack through the validation API: built-in defaults apply when nothing else is configured, global defaults apply when workspace defaults are absent, workspace defaults override global defaults, schema-level defaults override workspace defaults, and field-level declarations override schema defaults.
  - [ ] Add or extend step definitions in `packages/core/features/step_definitions/` only if new steps are needed; reuse existing steps where possible.

## Dev Notes

### Story Foundation

- Epic 9 defines the canonical cascading configuration system. Stories 9.1–9.3 built each layer individually; Story 9.4 is the capstone: it formally documents and exposes the complete layered model, verifies all priority combinations, and gives users a self-service `td config show` command.
- The key new user-facing feature is `td config show`, which calls `loadEffectiveConfig()` and annotates each output setting with its winning source layer.
- The canonical configuration model closes the Epic 8 retrospective gap: the model must explicitly cover where `context.saveDirectory` and `--save-context-dir` live (CLI/workspace/global layer), distinguishing them from schema-level DSL semantics that live in the `@defaults` block.

### Technical Requirements

- Runtime and language constraints are unchanged: Bun 1.x, TypeScript strict mode, ESM-only modules, Result-based error handling, Commander.js v14.
- Do not add any new external dependencies. All required functionality is already in the repository.
- `td config show` must use the existing `loadEffectiveConfig()` pipeline; do not introduce a separate config-loading path.
- The `config` command must follow the same Commander.js pattern as existing `generate`, `validate`, and `init` commands.

### Architecture Compliance

- CLI config (`packages/cli/`) is responsible solely for CLI/workspace/global defaults. Schema-level semantics (`@defaults`) live exclusively in `packages/core/`. This boundary must stay clean.
- Source attribution for `td config show` is derived at the section level (not per individual key): the entire `defaults`, `context`, or `generatorDefaults` section is provided by a single layer. Do not introduce per-key tracking—it would not reflect the real override semantics.
- Keep composition purely additive (no deep merge across sections). The existing `applyLayer()` in `configLoader.ts` already implements this correctly; Story 9.4 must not change the composition algorithm, only add observability and documentation.
- Config validation continues to happen inside `normalizeCliConfig()` when each layer is loaded; it does not need to be re-run at composition time.

### Library / Framework Requirements

- **Commander.js v14.0.2** — Use `new Command('config').addCommand(new Command('show').action(...))` pattern to register the nested subcommand.
- **Bun test runner** — Use `describe`/`test`/`expect` for unit tests; no Jest, no Mocha.
- **Cucumber + SerenityJS Screenplay** — Continue using the existing pattern for BDD feature tests.
- No new npm package is required for this story.

### File Structure Requirements

The primary implementation surface:

- **New files:**
  - `packages/cli/src/commands/config.ts` — `td config` command (the `show` subcommand)
  - `packages/cli/src/commands/config.test.ts` — Unit tests for the config command
  - `packages/core/features/config-priority.feature` — BDD acceptance scenarios
  - `docs/configuration.md` — Canonical configuration model reference

- **Modified files:**
  - `packages/cli/src/config/types.ts` — Add `EffectiveSettingSources` type
  - `packages/cli/src/config/configLoader.ts` — Add `getSettingSources()` exported function
  - `packages/cli/src/config/configLoader.test.ts` — Add priority-verification tests
  - `packages/cli/src/config/index.ts` — Export `getSettingSources` and `EffectiveSettingSources`
  - `packages/cli/bin/td.ts` — Register `configCommand`
  - `README.md` — Add/update `## Configuration` section with cascade summary and `td config show` example

Do NOT create a new `config/` directory or extra helper files unless they are clearly necessary. Keep the `config.ts` command in the same `commands/` folder as `generate.ts`, `validate.ts`, and `init.ts`.

### Source Attribution Implementation

```typescript
// packages/cli/src/config/types.ts — add this type
export interface EffectiveSettingSources {
  readonly defaults: CliConfigSource;
  readonly context: CliConfigSource;
  readonly generatorDefaults: CliConfigSource;
}
```

```typescript
// packages/cli/src/config/configLoader.ts — add this function
export function getSettingSources(effective: LoadedEffectiveCliConfig): EffectiveSettingSources {
  let defaultsSource: CliConfigSource = 'built-in';
  let contextSource: CliConfigSource = 'built-in';
  let generatorDefaultsSource: CliConfigSource = 'built-in';

  // Apply global layer (if the global file was actually found)
  if (effective.layers.global.source === 'global') {
    if (effective.layers.global.providedSections.includes('defaults'))
      defaultsSource = 'global';
    if (effective.layers.global.providedSections.includes('context'))
      contextSource = 'global';
    if (effective.layers.global.providedSections.includes('generatorDefaults'))
      generatorDefaultsSource = 'global';
  }

  // Apply workspace layer (highest CLI priority)
  if (effective.layers.workspace !== undefined) {
    if (effective.layers.workspace.providedSections.includes('defaults'))
      defaultsSource = 'workspace';
    if (effective.layers.workspace.providedSections.includes('context'))
      contextSource = 'workspace';
    if (effective.layers.workspace.providedSections.includes('generatorDefaults'))
      generatorDefaultsSource = 'workspace';
  }

  return { defaults: defaultsSource, context: contextSource, generatorDefaults: generatorDefaultsSource };
}
```

### `td config show` Command Design

Reference implementation structure for `packages/cli/src/commands/config.ts`:

```typescript
import { Command } from 'commander';
import { CliConfigError, getSettingSources, loadEffectiveConfig } from '../config';
import type { LoadedEffectiveCliConfig, CliConfigSource } from '../config';

function sourceLabel(source: CliConfigSource): string {
  return `[${source}]`;
}

function configFileLine(label: string, path: string, found: boolean): string {
  const status = found ? '' : '(not found — using built-in defaults)';
  return `  ${label.padEnd(10)} ${path}  ${status}`.trimEnd();
}

function generatorDefaultsDisplay(effective: LoadedEffectiveCliConfig): string {
  const specs = effective.config.generatorDefaults;
  if (specs.length === 0) return '(none)';
  return specs.map((s) => `${s.fieldType}: ${s.generator.name}`).join(', ');
}

async function runConfigShow(): Promise<void> {
  const effective = await loadEffectiveConfig();
  const sources = getSettingSources(effective);

  console.log('Effective Configuration');
  console.log('═══════════════════════');
  console.log('');
  console.log('Layer priority:  field-level  >  schema-level  >  workspace  >  global  >  built-in');
  console.log('');
  console.log('Config files:');
  console.log(
    configFileLine('global', effective.layers.global.path, effective.layers.global.source === 'global'),
  );
  console.log(
    effective.layers.workspace !== undefined
      ? configFileLine('workspace', effective.layers.workspace.path, true)
      : '  workspace  (not found)',
  );
  console.log('');
  console.log('Settings:');
  console.log(`  defaults.count        ${String(effective.config.defaults.count).padEnd(12)} ${sourceLabel(sources.defaults)}`);
  console.log(`  defaults.format       ${effective.config.defaults.format.padEnd(12)} ${sourceLabel(sources.defaults)}`);
  console.log(`  context.saveDirectory ${effective.config.context.saveDirectory.padEnd(12)} ${sourceLabel(sources.context)}`);
  console.log(
    `  generatorDefaults     ${generatorDefaultsDisplay(effective).padEnd(12)} ${sourceLabel(sources.generatorDefaults)}`,
  );
}

export const configCommand = new Command('config')
  .description('Manage testdata-ai configuration')
  .addCommand(
    new Command('show')
      .description('Show effective configuration with source of each setting')
      .action(async () => {
        try {
          await runConfigShow();
        } catch (error: unknown) {
          if (error instanceof CliConfigError) {
            console.error(`Error: ${error.message}`);
            process.exit(error.exitCode);
          }
          throw error;
        }
      }),
  );
```

**Important:** `td config show` uses `loadEffectiveConfig()` with no arguments (defaults to `process.cwd()` and `os.homedir()`). Tests should mock the file system or use temp directories exactly as `configLoader.test.ts` does.

### Canonical Configuration Model (summary for implementation guidance)

The full priority stack, from highest to lowest:

| Priority | Layer | Where | Examples |
|---|---|---|---|
| 1 (highest) | field-level | DSL field declaration | `name: string generator=firstName()` |
| 2 | schema-level | DSL `@defaults` block | `@defaults { string generator=pick(...) }` |
| 3 | workspace | `.tdconfig.json` in project root (upward-discovered) | `generatorDefaults`, `context.saveDirectory` |
| 4 | global | `~/.tdconfig.json` | `defaults.count`, `defaults.format` |
| 5 (lowest) | built-in | Hardcoded in `defaults.ts` | count=10, format=json, saveDirectory=./contexts |

**Settings scope:**
- `defaults.count` and `defaults.format` — CLI/workspace/global config only (no DSL equivalent)
- `context.saveDirectory` — CLI/workspace/global config default; `--save-context-dir` CLI flag overrides at runtime
- `generatorDefaults` — CLI/workspace/global config; overridden by DSL `@defaults`; further overridden by field-level declarations
- Uniqueness defaults — schema-level DSL only (`@defaults { unique=true }`), no CLI config equivalent
- Field-level generators and uniqueness — DSL only, highest priority in all cases

**Epic 8 closure:** `context.saveDirectory` sets the default directory used when `--save-context` is provided without `--save-context-dir`. The `--save-context-dir` CLI flag is a runtime override that does NOT write to any config file; it affects only the current invocation. This is a CLI concern, not a schema/DSL semantics concern, and belongs in docs/configuration.md.

### Testing Requirements

**Unit tests (`configLoader.test.ts` additions):**
- Verify each section explicit priority:
  - `defaults`: workspace section wins over global section, which wins over built-in
  - `context`: workspace section wins over global section, which wins over built-in
  - `generatorDefaults`: workspace section wins over global section, which wins over built-in
- Verify `getSettingSources()` returns correct source labels for each combination (only global, only workspace, both, neither)
- Verify `getSettingSources()` marks sections as `built-in` when the global layer's source is `built-in` (no file found)

**Unit tests (`config.test.ts`):**
- `td config show` output includes the priority legend string
- `td config show` output includes the global config path
- `td config show` output shows `[built-in]` when no config files are found
- `td config show` output shows `[global]` when global config provides `defaults`
- `td config show` output shows `[workspace]` when workspace config provides `context`
- `td config show` output shows `(none)` for `generatorDefaults` when none are configured
- `td config show` output renders non-empty `generatorDefaults` as `fieldType: generatorName` entries
- `td config show` exits with the `CliConfigError.exitCode` when config loading fails

**BDD (`config-priority.feature`):**
- Built-in defaults apply when no config is provided: field without explicit generator receives no resolved generator (validates successfully without defaults)
- Global-level defaults apply when workspace defaults are absent: configured generator defaults from global level are applied to matching field types
- Workspace defaults override global defaults: when workspace provides a different generator default for `string`, the workspace value wins
- Schema-level defaults override workspace-level defaults: `@defaults` in DSL takes priority over configured `generatorDefaults`
- Field-level declarations override all lower-priority layers: explicit field generator wins over schema defaults and workspace defaults

All BDD scenarios should reuse existing step definitions (`Given I have a schema file with the content:`, `And I validate using configured generator defaults:`, `When I validate the schema`, `Then the validation should succeed`, `And field "X" in schema "Y" should resolve generator "Z"`). Do not add new step definitions unless a new step is truly required.

### Previous Story Intelligence

- Story 9.3 left the config architecture in a clean state:
  - `packages/core/src/validate.ts` applies `generatorDefaults` (from CLI/workspace/global) to fields before analysis, then schema defaults override those, then field-level declarations override schema defaults.
  - `packages/cli/src/config/configLoader.ts` provides `loadEffectiveConfig()`, `composeEffectiveConfig()`, and `applyLayer()` — no changes needed to these functions.
  - `LoadedEffectiveCliConfig` already exposes all three layers (builtIn, global, workspace) with their `providedSections`, making source attribution straightforward.
- Code review fixes from Story 9.3 confirmed:
  - Config discovery (HOME vs workspace) is correct and must remain untouched.
  - Section-level override semantics (shallow, not deep) are correct.
  - The `ValidateSchemaAbility` in BDD resets `_defaultGenerators` only when a new schema source is set; this ordering must not be broken by any new BDD steps.
- Story 9.2 review established that config-related tests should use temporary directories created with `fs.mkdtemp(path.join(os.tmpdir(), ...))` and cleaned up in `afterEach`. Story 9.4 unit tests must follow this exact pattern.

### Git Intelligence Summary

- HEAD (`3b9e243`): code review Story 9.3 — fixed M1/M2 duplicate parser diagnostics, L3 BDD ability reset, L4 scenario regression. 8 new tests added, total 104 tests in core.
- `b5a2877`: dev-story 9.3 — implemented `@defaults` parsing, schema-level precedence in analyzer/validate, BDD coverage.
- The working tree has 2 uncommitted changes (as indicated by `main *2` prompt). Stash or handle any dirty files before starting Story 9.4 implementation.
- Follow the commit naming convention observed: `create story X.Y`, `dev-story X.Y`, `code review X.Y`.

### Latest Technical Information

- **Commander.js v14.0.2** supports nested subcommands via `.addCommand()` — the `configCommand.addCommand(showCommand)` pattern is the correct way to create `td config show`.
- **Bun 1.x test runner**: `afterEach` cleanup of temp directories is the established pattern; use `fs.rm(directory, { recursive: true, force: true })` as done in `configLoader.test.ts`.
- No external dependency changes are needed. All required APIs are in the existing stack.
- The project is currently on ESLint flat-config (v9); follow the existing linting rules and do not introduce `any` casts.

### Project Context Reference

Follow project rules in `_bmad-output/planning-artifacts/project-context.md`:
- Strict TypeScript, no `any`
- ESM-only (`import`/`export`, never `require`)
- Result-based fallible operations (no thrown exceptions for expected errors)
- Co-located unit tests (`*.test.ts` next to source)
- Bun test runner for unit coverage
- Screenplay-pattern BDD for acceptance criteria
- Public exports only through `index.ts`
- Private class members: `private` keyword + underscore prefix
- File names: `camelCase.ts`

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-9-cascading-configuration-system.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Previous story: `_bmad-output/implementation-artifacts/9-3-schema-level-defaults.md`
- Previous story (9.2): `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- Architecture: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- CLI config types: `packages/cli/src/config/types.ts`
- CLI config loader: `packages/cli/src/config/configLoader.ts`
- CLI config defaults: `packages/cli/src/config/defaults.ts`
- CLI config index: `packages/cli/src/config/index.ts`
- CLI config loader tests: `packages/cli/src/config/configLoader.test.ts`
- CLI entry point: `packages/cli/bin/td.ts`
- Existing generate command: `packages/cli/src/commands/generate.ts`
- BDD step definitions: `packages/core/features/step_definitions/validation.steps.ts`
- BDD validation ability: `packages/core/features/support/abilities/ValidateSchemaAbility.ts`
- BDD validation tasks: `packages/core/features/support/tasks/ValidationTasks.ts`
- BDD validation questions: `packages/core/features/support/questions/ValidationQuestions.ts`
- Schema-defaults feature (reference for BDD style): `packages/core/features/schema-defaults.feature`
- Core validation pipeline: `packages/core/src/validate.ts`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
