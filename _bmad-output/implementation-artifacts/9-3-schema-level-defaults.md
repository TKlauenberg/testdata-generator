# Story 9.3: Schema-Level Defaults

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to set defaults at the schema level**,
so that **all fields in a schema share common settings**.

## Acceptance Criteria

1. The DSL supports an `@defaults` section at the start of a schema.
2. The parser recognizes `@defaults` declarations.
3. Schema defaults can specify field generator defaults.
4. Schema defaults can specify uniqueness behavior.
5. Schema defaults override workspace and global config.
6. Field-level specifications override schema defaults.
7. The semantic analyzer applies defaults during validation.
8. Unit tests verify the default-application hierarchy.
9. Gherkin tests verify schema defaults work in real schemas.

## Tasks / Subtasks

- [ ] Extend the schema grammar and AST to represent schema-level defaults explicitly (AC: 1, 2, 3, 4)
  - [ ] Update `packages/core/src/parser/ast.ts` so `SchemaNode` can carry a dedicated schema-defaults structure instead of overloading field nodes or CLI config types.
  - [ ] Extend `packages/core/src/parser/parser.ts` to parse an `@defaults` block only at schema start, before regular field declarations, and reject misplaced defaults with parser diagnostics.
  - [ ] Reuse the existing `@` operator tokenization if possible; avoid inventing a parallel syntax or pushing schema-default semantics into scanner keywords unless the parser genuinely requires it.
  - [ ] Cover both supported schema-default dimensions from the epic: generator defaults by field type and uniqueness behavior.

- [ ] Resolve schema defaults in the core validation pipeline with explicit precedence (AC: 3, 4, 5, 6, 7)
  - [ ] Add analyzer-side types in `packages/core/src/analyzer/types.ts` for resolved schema defaults and effective field metadata.
  - [ ] Update `packages/core/src/analyzer/analyzer.ts` so validated fields reflect the effective generator and uniqueness settings after applying precedence.
  - [ ] Preserve the canonical order required by Epic 9: field-level > schema-level > workspace > global > built-in.
  - [ ] Keep override semantics shallow and explicit; do not introduce deep merging across config layers or schema defaults.

- [ ] Integrate schema defaults cleanly with the current CLI-configured generator-default flow (AC: 3, 5, 6, 7)
  - [ ] Refactor `packages/core/src/validate.ts` so CLI/workspace/global generator defaults are applied first, and schema defaults then override them before semantic analysis completes.
  - [ ] Ensure field-level generator declarations continue to win over every lower-priority layer.
  - [ ] Ensure schema-level uniqueness defaults flow into the validated program consumed by `packages/core/src/generator/generator.ts`, without duplicating runtime uniqueness logic.
  - [ ] Avoid moving schema semantics into `packages/cli/src/config/*`; CLI config remains responsible only for CLI/workspace/global defaults.

- [ ] Add parser, analyzer, and end-to-end regression coverage for precedence and real-world behavior (AC: 2, 7, 8)
  - [ ] Extend `packages/core/src/parser/parser.test.ts` with happy-path and failure cases for `@defaults` placement, syntax, and mixed field/default declarations.
  - [ ] Extend `packages/core/src/analyzer/analyzer.test.ts` to prove effective generator and uniqueness metadata are resolved correctly.
  - [ ] Extend `packages/core/src/validate.ts` coverage or adjacent validation tests to prove schema defaults override workspace/global defaults but not field-level declarations.
  - [ ] Add or extend generator-focused tests if needed to prove schema-level uniqueness defaults produce the same enforcement behavior as explicit field uniqueness.

- [ ] Add BDD coverage for schema defaults in realistic DSL usage (AC: 9)
  - [ ] Add a dedicated feature such as `packages/core/features/schema-defaults.feature`, or extend an existing feature only if that keeps the behavior easy to find.
  - [ ] Add or extend Screenplay step definitions under `packages/core/features/step_definitions/` and support tasks/questions under `packages/core/features/support/` rather than embedding business logic in step files.
  - [ ] Cover at least: schema default generator application, schema-level uniqueness defaulting, schema-over-workspace precedence, and field-over-schema precedence.

- [ ] Document the schema-defaults model where users already learn cascading behavior (AC: 5, 6)
  - [ ] Update `README.md` with an `@defaults` example and a concise precedence summary.
  - [ ] Add or update a concrete DSL example under `docs/examples/` if the README example becomes too compressed to serve as a practical reference.
  - [ ] Keep the documentation explicit that schema defaults are part of DSL semantics, not CLI config structure.

## Dev Notes

### Story Foundation

- Epic 9 defines the canonical cascading configuration system. Story 9.1 established global defaults, Story 9.2 added workspace defaults, and Story 9.3 now introduces schema-local defaults inside the DSL itself.
- The epic is explicit that schema defaults must live at schema start in an `@defaults` section and that they must override workspace/global configuration while still yielding to field-level declarations.
- This story is the first one where precedence crosses the CLI/core boundary directly: workspace/global defaults enter through CLI config, but schema defaults are core DSL semantics and must be resolved inside the core validation pipeline.

### Technical Requirements

- Keep runtime and language constraints unchanged: Bun 1.x, TypeScript strict mode, ESM-only modules, Result-based error handling.
- Do not add a new external parser/config library for this story. The existing handwritten scanner/parser/analyzer pipeline is the intended extension point.
- The existing CLI config model already supports `generatorDefaults`; schema defaults must compose with that flow rather than replacing it.
- Schema defaults should be modeled as explicit AST/analyzer data, not as hidden mutations that make precedence difficult to inspect or test.
- Uniqueness defaults must integrate with existing analyzer metadata and generator enforcement instead of introducing a second uniqueness mechanism.

### Architecture Compliance

- Respect the multi-pass boundary: scanner tokenizes, parser builds AST, analyzer resolves semantics, generator enforces runtime uniqueness and generation behavior.
- Keep schema-level defaults in `packages/core/`, not `packages/cli/`; Story 9.4 will depend on these boundaries staying clean for effective-config explainability.
- Avoid deep-merge semantics. Epic 9.4 explicitly requires complete override behavior at higher-priority layers.
- Preserve immutable AST and validated-program patterns. Apply defaults by producing enriched data, not by mutating shared state unpredictably.

### Library / Framework Requirements

- No additional dependency is required for this story; extend the existing Bun + TypeScript + Commander stack already in the repo.
- The current repository remains aligned to Bun 1.x, TypeScript 5.x strict mode, and Commander 14.x for the CLI surface.
- Continue using Bun unit tests and the existing Cucumber/SerenityJS Screenplay stack for acceptance coverage.

### File Structure Requirements

- Primary implementation surface is expected to include:
  - `packages/core/src/parser/ast.ts`
  - `packages/core/src/parser/parser.ts`
  - `packages/core/src/parser/parser.test.ts`
  - `packages/core/src/analyzer/types.ts`
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/analyzer/analyzer.test.ts`
  - `packages/core/src/validate.ts`
  - `packages/core/src/generator/generator.test.ts` or adjacent generation/validation tests if uniqueness precedence needs runtime regression coverage
  - `packages/core/features/schema-defaults.feature` or another clearly named feature file
  - `packages/core/features/step_definitions/*`
  - `packages/core/features/support/tasks/*`
  - `packages/core/features/support/questions/*`
  - `README.md`
  - `docs/examples/*` if an example artifact is added

### Testing Requirements

- Unit tests must verify:
  - valid `@defaults` syntax at schema start,
  - invalid placement or malformed defaults produce parser/analyzer diagnostics,
  - schema default generator mappings apply when fields omit explicit generators,
  - field-level generators override schema defaults,
  - schema defaults override CLI/workspace/global generator defaults,
  - schema default uniqueness marks fields as unique when configured,
  - explicit field uniqueness settings remain highest-priority at field scope.
- BDD coverage must verify user-visible schema-default behavior in realistic schemas rather than only isolated parser internals.
- Regression tests should preserve Story 9.1 and 9.2 behavior when schemas do not define `@defaults`.

### Previous Story Intelligence

- Story 9.2 established the current effective config composition in `packages/cli/src/config/configLoader.ts` and command integration in `packages/cli/src/commands/generate.ts`.
- The current validation path in `packages/core/src/validate.ts` already applies CLI-configured `generatorDefaults` to fields before analysis. Story 9.3 should build on this path, not fork it.
- Story 9.2 review fixes matter here:
  - config discovery boundaries between HOME/global and workspace are already correct and should remain untouched,
  - config-provided generator defaults only apply when a field lacks an explicit generator,
  - precedence behavior is already covered in CLI tests and should remain stable while schema defaults are added above that layer.
- Reuse the existing temporary-directory and end-to-end test patterns rather than inventing a separate configuration test harness.

### Git Intelligence Summary

- Recent commits show the immediate progression for this feature area:
  - `2fe67b6` created Story 9.2 context.
  - `8590baa` implemented Story 9.2.
  - `4d69dbe` applied code-review fixes for Story 9.2.
- Practical implication: the codebase already has a stable layered-config baseline. Story 9.3 should extend precedence into the DSL layer with minimal disruption, not redesign the config system.

### Latest Technical Information

- Local project context confirms the active stack is Bun 1.x, TypeScript 5.x strict mode, ESM modules, Bun unit tests, and Cucumber/SerenityJS for BDD coverage.
- No repository evidence suggests a required dependency upgrade for this story. The work is structural and semantic, not dependency-driven.
- The scanner currently tokenizes `@` as an operator and does not reserve `defaults` as a keyword. Prefer using that existing capability unless implementation pressure proves a dedicated keyword is materially clearer.

### Project Context Reference

- Follow project rules in `_bmad-output/planning-artifacts/project-context.md`:
  - strict typing and no `any`,
  - ESM-only imports/exports,
  - Result-based fallible operations,
  - co-located unit tests,
  - Bun test runner for unit coverage,
  - Screenplay-pattern BDD coverage for acceptance criteria,
  - public exports through `index.ts` only.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-9-cascading-configuration-system.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Previous story: `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Pattern rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project rules: `_bmad-output/planning-artifacts/project-context.md`
- Current parser AST: `packages/core/src/parser/ast.ts`
- Current parser: `packages/core/src/parser/parser.ts`
- Current analyzer: `packages/core/src/analyzer/analyzer.ts`
- Current validated types: `packages/core/src/analyzer/types.ts`
- Current validation pipeline: `packages/core/src/validate.ts`
- Current generator enforcement: `packages/core/src/generator/generator.ts`
- Current CLI config types: `packages/cli/src/config/types.ts`
- Current CLI config loader: `packages/cli/src/config/configLoader.ts`
- Current parser feature coverage: `packages/core/features/parser.feature`
- Current semantic-analysis feature coverage: `packages/core/features/semantic-analysis.feature`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story selected automatically from sprint tracking as the first backlog story key: `9-3-schema-level-defaults`.
- Discovery and analysis sources loaded: Epic 9 shard, PRD, architecture shards, project context rules, previous story 9.2 artifact, sprint status, current parser/analyzer/validate/generator sources, and recent git history.
- Key implementation constraint identified: CLI/workspace/global defaults already flow through `packages/core/src/validate.ts`; schema defaults must extend that path without collapsing CLI/core ownership boundaries.
- Key regression risk identified: uniqueness defaults must reuse existing analyzer metadata and generator enforcement instead of creating parallel runtime behavior.

### Completion Notes List

- Story file generated for `9-3-schema-level-defaults` with status `ready-for-dev`.
- Sprint tracking updated: `9-3-schema-level-defaults` moved from `backlog` to `ready-for-dev`.
- Story guidance includes concrete extension points for parser, analyzer, validation pipeline, BDD support, and precedence regression coverage.

### File List

- `_bmad-output/implementation-artifacts/9-3-schema-level-defaults.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`