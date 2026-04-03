# Story 11.1: DSL Import Statement Support

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA tester,
I want to import reusable schema definitions,
so that I don't duplicate common patterns.

The live codebase currently parses only top-level `schema` declarations, already uses `@` directives for schema defaults, and validates generation with synthetic or pathless filenames in key entry points. This story must add import support at the DSL level without breaking the existing sync validation/generation contract or duplicating file-resolution logic across CLI and core.

## Acceptance Criteria

1. Given I have reusable schema components, when I implement import syntax in the parser and the DSL supports `@import "path/to/schema.td"` at file top, then the parser resolves import declarations as valid top-level syntax.
2. Import paths resolve relative to the current file.
3. Imported schemas are parsed and included in the program.
4. Imported symbols, including schemas and profiles, are available in the current file.
5. Circular imports are detected and reported as errors.
6. Import paths support both relative syntax such as `./common.td` and workspace syntax such as `@workspace/common.td`.
7. The semantic analyzer validates all imported symbols.
8. Unit tests verify import resolution and circular detection.
9. Gherkin tests verify real import scenarios with file system fixtures.

## Tasks / Subtasks

- [ ] Extend the AST and parser for import declarations without disturbing existing directive syntax (AC: 1)
  - [ ] Add an `ImportNode` to `packages/core/src/parser/ast.ts` and allow `Program.declarations` to contain imports plus existing declarations.
  - [ ] Reuse the current `@defaults` parsing style by treating `@import` as `@` + identifier + string literal, unless a scanner keyword change is genuinely required.
  - [ ] Enforce file-top placement for imports so `@import` after a schema declaration produces a clear parse error instead of ambiguous behavior.
  - [ ] Preserve source locations so diagnostics for imported files still point to the originating file path and line.

- [ ] Add import resolution to the shared core validation path rather than only to CLI commands (AC: 2, 3, 4, 5, 6, 7)
  - [ ] Extend core validation inputs with additive context such as `currentFile` and `workspaceRoot` so relative and workspace imports resolve deterministically.
  - [ ] Resolve imports before semantic validation and merge imported declarations into the effective `Program` used by the analyzer.
  - [ ] Use canonical absolute paths during recursive resolution and cycle detection so `./a.td`, `../dir/../a.td`, and equivalent paths do not bypass circular-import checks.
  - [ ] Fail clearly when an import is used without enough file-system context to resolve it, rather than guessing from process cwd.
  - [ ] Keep the public sync contract stable for `validateSchema()` and `generateData()`; do not introduce a breaking async-only API for this story.

- [ ] Preserve semantic-analysis and symbol-table behavior across imported declarations (AC: 3, 4, 5, 7)
  - [ ] Make imported schemas and profiles visible to the importing file using the existing symbol-table and analyzer rules rather than a parallel lookup mechanism.
  - [ ] Report duplicate definitions across local and imported files with analyzer-style diagnostics.
  - [ ] Validate imported declarations with the same generator, template, uniqueness, context, and dependency checks as local declarations.
  - [ ] Keep imported declaration handling compatible with later Epic 11 stories for schema extension and reference validation.

- [ ] Thread source-file and workspace-root context through CLI entry points consistently (AC: 2, 6, 7)
  - [ ] Update `packages/cli/src/commands/validate.ts` to reuse the shared validation entry point instead of maintaining a separate scan/parse/analyze path with no filename/workspace context.
  - [ ] Update `packages/cli/src/commands/generate.ts` to pass the source file path and discovered workspace root into core validation/generation.
  - [ ] Reuse Epic 9 workspace discovery rules when resolving `@workspace/...` imports. The workspace root should come from the discovered `.tdconfig.json` location when available.
  - [ ] Define user-facing failure behavior for `@workspace/...` imports when no workspace root can be determined.

- [ ] Add unit and BDD regression coverage that actually runs in the current test harness (AC: 8, 9)
  - [ ] Extend parser and validation unit tests for valid imports, missing import paths, duplicate imported symbols, unresolved files, workspace imports, and circular imports.
  - [ ] Add filesystem-backed feature coverage under `packages/core/features/` using dedicated import fixtures.
  - [ ] Register any new feature files and step-definition files in `packages/core/tests/run-cucumber.ts`; do not add scenarios only to dormant features that are not executed by the current runner.
  - [ ] Keep unit coverage focused on parser/validation/import-graph behavior and use BDD coverage for real multi-file user workflows.

## Dev Notes

### Story Foundation

- Epic 11 introduces reusable, shared pattern composition. Story 11.1 is the foundation story for every later Epic 11 capability.
- Story 11.2 depends on imported profiles and shared definitions being visible through the same resolution pipeline built here.
- Story 11.3 depends on imported schemas being available before `extends`-style validation happens.
- Story 11.4 depends directly on this story's import graph and file-resolution behavior for broader reference validation.
- The PRD contains an older FR21 example, `@import: ./common/user.td`, but the Epic 11 acceptance criteria define the canonical syntax for this story as `@import "path/to/schema.td"`. Treat the Epic syntax as the source of truth unless backward compatibility is intentionally added and tested.

### Technical Requirements

- The current parser already supports `@defaults` using `@` plus an identifier. Reuse that pattern for `@import` instead of inventing a second directive model.
- `packages/core/src/scanner/tokens.ts` already supports the `@` operator. Avoid unnecessary scanner churn unless implementation proves a keyword token for `import` is required.
- Preserve `SourceLocation.file` for imported nodes so diagnostics show the actual imported file path.
- Relative imports must resolve from the importing file's directory, not process cwd.
- Workspace imports must resolve from a stable workspace root. The most defensible definition in the current repo is the directory containing the discovered `.tdconfig.json` from Epic 9 workspace-config logic.
- If a caller has inline source only and no real file path, relative imports must fail with a clear diagnostic instead of silently resolving against cwd.
- Avoid a breaking public-API shift to async validation. If file loading is required in core, keep the sync surface stable or add new APIs additively.
- Do not implement a second symbol-resolution path for imports. Imported declarations should flow through the same analyzer and symbol-table checks as local declarations.
- Keep diagnostic naming aligned with existing analyzer conventions such as `analyzer.undefinedSchema`, `analyzer.circularDependency`, and duplicate-definition diagnostics. Parser syntax errors currently use the generic `PARSE_ERROR` pattern; do not invent a conflicting parser diagnostic scheme unless that refactor is explicitly in scope.

### Architecture Compliance

- Maintain the established stage boundary: scanner -> parser -> validation/import resolution -> analyzer -> generator.
- Keep CLI concerns, including workspace discovery and user-facing command behavior, in `packages/cli/`.
- Keep DSL semantics, import graph construction, and declaration merging in core.
- Prefer a small internal helper module for import resolution over bloating `analyzer.ts` or `validate.ts` with all file-graph logic.
- Do not break the existing `generateData()` streaming contract while adding file-backed import awareness.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language: TypeScript 5.9.x, ESM-only, strict mode.
- CLI framework: Commander `^14.0.2`.
- Use standard filesystem and path modules already in the repo (`node:fs`, `node:fs/promises`, `node:path`) rather than adding a new path-resolution dependency.
- Continue using Bun unit tests plus Cucumber and SerenityJS Screenplay for BDD coverage.

### File Structure Requirements

Primary core files likely to change:

- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/validate.ts`
- `packages/core/src/generateData.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/symbolTable.ts`
- `packages/core/src/index.ts` only if additive public options/types need export changes
- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/analyzer/symbolTable.test.ts` if duplicate import conflicts are validated at symbol-table level

Primary CLI files likely to change:

- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/commands/validate.test.ts`
- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/generate.test.ts`

BDD coverage and fixtures likely to change:

- a new import-focused feature under `packages/core/features/` or a wired update to an existing executed feature
- matching step definitions under `packages/core/features/step_definitions/`
- new fixture files under `packages/core/features/fixtures/imports/`
- `packages/core/tests/run-cucumber.ts`

Likely unnecessary unless implementation proves otherwise:

- `packages/core/src/scanner/tokens.ts`
- broad CLI config-schema changes
- output adapter modules

### Testing Requirements

- Unit tests must cover:
  - parsing valid top-level import declarations,
  - rejecting imports after non-import declarations,
  - relative import resolution,
  - workspace import resolution,
  - missing imported files,
  - circular file imports,
  - duplicate imported/local symbol collisions,
  - imported profile visibility,
  - propagation of real file paths into diagnostics.
- Gherkin tests must use actual fixture files on disk, not only inline DSL strings.
- Any new feature scenarios must be registered in `packages/core/tests/run-cucumber.ts`; current parser and semantic-analysis feature files exist in the repo but are not part of the active runner.
- Keep Screenplay steps thin and reuse existing fixture-resolution patterns like `resolveFixturePath()` from the context-reference feature.

### Previous Story Intelligence

- There is no previous Story 11.x implementation artifact to inherit from because this is the first story in Epic 11.
- The most relevant prior story is Story 9.2, which established upward workspace-config discovery through `.tdconfig.json` and already distinguishes built-in, global, and workspace layers.
- Reuse the Epic 9 workspace-discovery behavior rather than inventing a second workspace-root mechanism for imports.
- The current CLI `validate` command still duplicates validation logic instead of using `packages/core/src/validate.ts`; this is a likely regression point if not corrected as part of import-aware validation.

### Git Intelligence Summary

- Recent commits are centered on Story 10.4 and BMAD installation updates, so there is no live Epic 11 implementation precedent yet.
- Practical implication: follow current core/parser/analyzer patterns in the repo itself rather than expecting a recent import-related code path to extend.

### Latest Technical Information

- The live repository pins TypeScript `^5.9.3`, ESLint `^9.39.2`, and Prettier `^3.7.4` at the workspace root.
- The CLI currently depends on Commander `^14.0.2` and the core package as a workspace dependency.
- No additional third-party library is needed for this story's import resolution. The existing Bun/TypeScript/Node standard library stack is sufficient.

### Project Context Reference

Apply the project rules from `_bmad-output/planning-artifacts/project-context.md`:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports/exports.
- co-located `*.test.ts` unit tests.
- Result-pattern handling for fallible internal operations.
- package boundaries: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/parser/parser.ts` currently only parses `schema` declarations at the top level and explicitly rejects `profile` and `context` as not yet implemented.
- `packages/core/src/generateData.ts` currently validates source as `inline-schema.td`, which is insufficient for resolving relative imports unless additive file-context options are introduced.
- `packages/cli/src/commands/validate.ts` currently reimplements scan -> parse -> analyze directly instead of using the shared core `validateSchema()` entry point.
- `packages/core/tests/run-cucumber.ts` currently executes only a subset of feature files; import scenarios must be added to the active list or they will not run in CI.
- Existing fixture-loading steps already resolve paths relative to `packages/core/features/fixtures/`, which should be reused for import fixtures.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-11-pattern-composition-reusability.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Existing workspace-config story: `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- Parser AST: `packages/core/src/parser/ast.ts`
- Parser implementation: `packages/core/src/parser/parser.ts`
- Scanner tokens: `packages/core/src/scanner/tokens.ts`
- Shared validation entry point: `packages/core/src/validate.ts`
- Public generation API: `packages/core/src/generateData.ts`
- Analyzer: `packages/core/src/analyzer/analyzer.ts`
- Symbol table: `packages/core/src/analyzer/symbolTable.ts`
- CLI validate command: `packages/cli/src/commands/validate.ts`
- CLI generate command: `packages/cli/src/commands/generate.ts`
- CLI config loader: `packages/cli/src/config/configLoader.ts`
- CLI config types: `packages/cli/src/config/types.ts`
- Active BDD runner: `packages/core/tests/run-cucumber.ts`
- Existing fixture step pattern: `packages/core/features/step_definitions/context-reference-resolution.steps.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `11-1-dsl-import-statement-support`.
- Epic 11 is the first backlog epic, so sprint tracking was advanced from `epic-11: backlog` to `epic-11: in-progress` while setting Story 11.1 to `ready-for-dev`.
- Discovery sources loaded: Epic 11 shard, PRD, project context, architecture shards, active core and CLI source files, active BDD runner, and recent git history.
- No previous Epic 11 implementation artifact exists, so workspace-config behavior from Story 9.2 was used as the closest relevant precedent.
- The repo contains parser and semantic-analysis feature files, but the active Cucumber runner does not currently execute them. This is a concrete test-wiring risk for this story.

### Implementation Plan

- Parse `@import` as a first-class top-level AST node while reusing the existing `@` directive model.
- Introduce additive file-context options in shared validation/generation surfaces so imports resolve deterministically for real files without breaking inline consumers.
- Resolve imports once in core, merge declarations, and feed the merged program through the existing analyzer/symbol-table pipeline.
- Wire CLI `validate` and `generate` to pass filename and workspace-root context consistently.
- Add real filesystem-backed unit and BDD coverage, and register the BDD scenarios in the active runner.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story file created for `11-1-dsl-import-statement-support` with implementation guardrails for parser, validation, analyzer, CLI, and BDD integration.
- Sprint tracking updated so Epic 11 is now `in-progress` and Story 11.1 is `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/11-1-dsl-import-statement-support.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`