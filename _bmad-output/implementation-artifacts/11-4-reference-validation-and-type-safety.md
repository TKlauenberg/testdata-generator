# Story 11.4: Reference Validation and Type Safety

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA tester,
I want validation to catch broken references early,
so that I don't discover errors during generation.

The current codebase already performs several reference checks in the core pipeline: import path existence and circular import detection in the import resolver, schema and inheritance reference checks in the analyzer, template reference validation, context reference syntax and collection checks, and workspace generator validation with Levenshtein-based suggestions. This story should not rebuild that machinery. It should close the remaining gaps so that all supported reference classes fail before generation, produce the most specific available source location, and offer helpful alternatives consistently across imports, schemas, context collections, template fields, and workspace generators.

## Acceptance Criteria

1. Given I use imports, extensions, and references, when the semantic analyzer validates references, then all `@import` paths are validated to exist.
2. All schema references (`@schema:Name`) are validated.
3. All context references (`@context.collection`) are validated.
4. All template field references (`{{fieldName}}`) are validated.
5. All workspace generator references are validated.
6. Broken references report the location and suggest alternatives.
7. "Did you mean X?" suggestions for typos use fuzzy matching.
8. Validation catches all reference errors before generation starts (FR29).
9. Unit tests verify reference validation for all reference types.
10. Gherkin tests verify helpful error messages for broken references.

## Tasks / Subtasks

- [x] Audit and normalize the existing reference-validation entry points instead of introducing a second subsystem (AC: 1, 2, 3, 4, 5, 8)
  - [x] Reuse `packages/core/src/imports/importResolver.ts` for file-level import validation and `packages/core/src/analyzer/analyzer.ts` for semantic validation, keeping the pipeline `scan -> parse -> import resolution -> analyze -> generate` intact.
  - [x] Ensure `packages/core/src/validate.ts` and `packages/core/src/generateData.ts` continue to surface reference failures before generation starts rather than relying on generator-time exceptions.
  - [x] Keep diagnostic accumulation behavior so multiple broken references can be reported in one validation run.

- [x] Close the remaining diagnostic and suggestion gaps across all supported reference classes (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Extend missing-context diagnostics in `packages/core/src/analyzer/analyzer.ts` to use fuzzy matching against available collection names instead of only dumping the collection list.
  - [x] Improve import-path diagnostics in `packages/core/src/imports/importResolver.ts` so common typos and wrong suffix/path cases can suggest a nearby `.td` file or workspace-relative alternative when one is detectable.
  - [x] Reuse the existing Levenshtein-based `findSimilar()` helper for schema names, template field names, context collections, and workspace generators rather than adding a third-party fuzzy-matching package.
  - [x] Preserve the most precise available locations already tracked by the parser and AST, especially import declarations and `extends` clauses; only add finer-grained location tracking if an acceptance criterion cannot be satisfied without it.

- [x] Strengthen regression coverage in the active unit and BDD harnesses (AC: 6, 7, 8, 9, 10)
  - [x] Extend `packages/core/src/analyzer/analyzer.test.ts` to cover misspelled schema references, template fields, context collections, workspace generators, and multi-error accumulation in the same validation pass.
  - [x] Add a co-located `packages/core/src/imports/importResolver.test.ts` to cover unresolved relative imports, workspace imports without a workspace root, circular imports, and typo-driven suggestion behavior.
  - [x] Add or extend an executed feature under `packages/core/features/` with real fixtures proving helpful broken-reference diagnostics for imports, inherited schemas, context references, template references, and workspace generators.
  - [x] Register any new feature and matching step definitions in `packages/core/tests/run-cucumber.ts`; existing dormant feature files are not sufficient because the active runner is curated.

- [x] Keep the story scoped to semantic validation quality and pre-generation safety (AC: 6, 7, 8)
  - [x] Do not introduce a new reference DSL, runtime fallback resolver, or post-generation validation pass.
  - [x] Do not change CLI command behavior unless a failing acceptance test proves the public entry points are not surfacing analyzer/import diagnostics correctly.
  - [x] Update docs only if current user-facing docs or examples already describe reference-validation behavior and need correction or clarification.

### Review Findings

- [x] [Review][Patch] Missing-import suggestions synchronously crawl the importer directory and workspace on every unresolved import [packages/core/src/imports/importResolver.ts:182]
- [x] [Review][Patch] Import suggestion ranking can return unrelated or self-import paths based on traversal order instead of relevance [packages/core/src/imports/importResolver.ts:206]
- [x] [Review][Patch] Workspace import suggestions still miss detectable wrong-path cases beyond small typos because matching stops at edit distance 3 [packages/core/src/common/suggestions.ts:13]
- [x] [Review][Patch] Curated BDD coverage does not assert diagnostic location or message quality for the new broken-reference scenarios [packages/core/features/step_definitions/reference-validation.steps.ts:174]

## Dev Notes

### Story Foundation

- Epic 11 is the composition and reusability epic. Story 11.1 established import-aware loading, Story 11.2 established workspace generator references, and Story 11.3 established schema extension and inheritance-aware diagnostics. Story 11.4 should unify and finish the reference-validation experience across those capabilities instead of re-implementing them separately.
- The epic and requirements inventory map this story directly to FR29, but the acceptance criteria broaden the practical scope beyond context references alone: import paths, schema references, template references, and workspace generators all need the same pre-generation safety bar and suggestion quality.
- The live codebase already contains partial implementation for most acceptance criteria. The main work is to remove inconsistency in diagnostic quality, close suggestion gaps, and add active acceptance coverage for the behavior users will rely on.
- No dedicated UX planning artifact matching `*ux*.md` exists in planning artifacts. User-facing behavior should therefore follow epic acceptance criteria, FR17 actionable diagnostics, and the repository's existing error-message style.

### Technical Requirements

- `packages/core/src/imports/importResolver.ts` already validates import existence, workspace-root availability, file readability, and circular imports before semantic analysis runs. Extend that seam rather than duplicating import validation inside the analyzer.
- `packages/core/src/analyzer/analyzer.ts` already contains reusable validators and helpers relevant to this story, including `validateBaseSchemas()`, `validateGenerators()`, `validateTemplateReferences()`, `validateContextReferences()`, `findSimilar()`, and `levenshteinDistance()`.
- `packages/core/src/context/contextReference.ts` already parses and rejects malformed `@context...` expressions. Keep syntax validation there and use the analyzer only for semantic checks such as collection existence and suggestion quality.
- `packages/core/src/analyzer/analyzer.test.ts` already covers many unit-level cases for template references, context references, schema references, workspace generators, and inherited fields. Expand it for missing acceptance gaps instead of scattering new tests into unrelated modules.
- `packages/core/tests/run-cucumber.ts` explicitly enumerates the executed core feature files. `semantic-analysis.feature` exists in the repository but is not currently wired into the active runner, so new BDD coverage must be registered intentionally.
- Preserve Result-based error handling and diagnostic accumulation. Broken references are expected validation failures and must not become thrown exceptions in core validation paths.

### Architecture Compliance

- Preserve the library-first, multi-pass core pipeline: scanner -> parser -> import resolution -> analyzer -> generator.
- Keep reference validation in core. The CLI should keep delegating to `validateSchema()` and `generateData()` rather than introducing separate command-level reference-resolution logic.
- Maintain strict TypeScript, immutable AST and validated structures, ESM-only module boundaries, and one-way package boundaries where CLI may depend on core but core must not depend on CLI.
- Reuse existing diagnostic patterns, codes, and suggestion fields where possible so new behavior remains consistent with prior stories and existing error formatting.
- Fail before generation. Story 11.4 is specifically about preventing generation-time discovery of broken references.

### Library / Framework Requirements

- Runtime and test runner remain Bun 1.x. Current Bun documentation still recommends `bun test` with file and test-name filters, which matches this repository's test approach and does not require a harness change.
- Language and tooling remain TypeScript `^5.9.3`, ESLint `^9.39.2`, Prettier `^3.7.4`, and `@types/bun` `^1.3.5` as pinned in the workspace.
- Commander is pinned at `^14.0.2` in the repo while the latest published version is `14.0.3`; this story is analyzer/import-resolver work and does not justify a Commander upgrade.
- Do not add a third-party fuzzy-matching or path-suggestion dependency. Existing Levenshtein-based matching is already present and should be extended if needed.

### File Structure Requirements

Primary core files likely to change:

- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/imports/importResolver.ts`
- `packages/core/src/context/contextReference.ts` only if semantic-validation needs reveal a parser/diagnostic boundary issue
- `packages/core/src/validate.ts`
- `packages/core/src/generateData.ts`

Primary unit-test files likely to change:

- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/imports/importResolver.test.ts` (new, co-located)

BDD coverage and fixtures likely to change:

- one new or updated executed feature under `packages/core/features/`
- matching step definitions under `packages/core/features/step_definitions/`
- fixture `.td` files under `packages/core/features/fixtures/`
- `packages/core/tests/run-cucumber.ts`

Likely unnecessary unless failing tests prove otherwise:

- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/commands/generate.ts`
- generator runtime files under `packages/core/src/generator/`
- workspace config loader files under `packages/cli/src/config/`

### Testing Requirements

- Unit tests must verify import-path failures, misspelled schema references, missing context collections, broken template field references, and missing workspace generators.
- Unit tests must verify fuzzy suggestions where a plausible typo exists, and no misleading suggestion when no close match exists.
- Unit tests must verify location quality for each broken reference type using the most specific available source span already preserved by the parser or import resolver.
- Unit tests must verify multiple broken references are accumulated in a single validation pass and surfaced before generation begins.
- BDD scenarios must use real fixture files on disk and demonstrate helpful error messages for broken imports, broken inherited-schema references, broken `@context` references, broken template references, and broken workspace generator references.
- Any new acceptance scenarios must be wired into `packages/core/tests/run-cucumber.ts`; a feature file that is never registered does not satisfy the story.

### Previous Story Intelligence

- Story 11.1 already established `currentFile` and `workspaceRoot` threading through the public validation and generation entry points. Reuse that path for import-aware diagnostics and do not invent a parallel file-resolution API.
- Story 11.2 already established workspace generator lookup and analyzer-driven undefined-generator diagnostics. Story 11.4 should extend that user-facing diagnostic quality, not replace workspace-generator validation.
- Story 11.3 already established inheritance-aware schema resolution, `extends` location tracking, and flattened effective fields. Missing-base-schema and inherited reference diagnostics should build on those seams.
- Repository memory confirms `packages/core/tests/run-cucumber.ts` is the active BDD runner and new core feature files must be registered there explicitly.

### Git Intelligence Summary

- Recent history shows the expected workflow sequence for this epic area: `59ddbb1 create story 11.3`, `e21b713 dev story 11.3`, and `d57b31c code review story 11.3`, following `ad55035 dev-story 11.2` and `078d0a0 code-review story 11.2`.
- Practical implication: keep Story 11.4 changes in the same parser/import/analyzer/test seams used by Stories 11.1 through 11.3 so the implementation stays aligned with fresh code and review conventions.

### Latest Technical Information

- Bun's current test-runner guidance still supports `bun test`, file-path filters, and `--test-name-pattern` for focused runs, so the existing unit-test workflow remains the right fit for this story.
- The latest published Commander release is `14.0.3`, but this story is core semantic-validation work and the repository's pinned `^14.0.2` does not block it.
- No external package or runtime upgrade is required to deliver better reference-validation diagnostics.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern handling for fallible operations.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/imports/importResolver.ts` currently emits actionable diagnostics for missing `currentFile`, missing workspace root, file-not-found, permission errors, and circular imports, but it does not yet appear to suggest nearby existing import paths.
- `packages/core/src/analyzer/analyzer.ts` already validates schema references, template references, context references, workspace generators, and inherited schemas, but context-collection suggestions are weaker than the other reference types.
- `packages/core/src/context/contextReference.ts` already enforces supported `@context` syntax and AND-only tag filter rules, so Story 11.4 should not duplicate that parser logic in the analyzer.
- `packages/core/src/analyzer/analyzer.test.ts` already contains focused reference-validation suites, which makes it the right place to extend unit coverage for this story.
- `packages/core/tests/run-cucumber.ts` currently executes `import-resolution.feature`, `workspace-generators.feature`, and `schema-extension.feature`, but not `semantic-analysis.feature`. Helpful broken-reference coverage must therefore be added to the curated runner intentionally.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-11-pattern-composition-reusability.md`
- Epic index: `_bmad-output/planning-artifacts/epics/index.md`
- Requirements inventory: `_bmad-output/planning-artifacts/epics/requirements-inventory.md`
- Epic list summary: `_bmad-output/planning-artifacts/epics/epic-list.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architecture: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Project boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Architecture validation: `_bmad-output/planning-artifacts/architecture/architecture-validation-results.md`
- Context and FR analysis: `_bmad-output/planning-artifacts/architecture/project-context-analysis.md`
- Previous story: `_bmad-output/implementation-artifacts/11-3-schema-composition-and-extension.md`
- Repository memory: `/memories/repo/testing-notes.md`
- Package versions: `package.json`
- Import resolver: `packages/core/src/imports/importResolver.ts`
- Analyzer: `packages/core/src/analyzer/analyzer.ts`
- Context reference parser: `packages/core/src/context/contextReference.ts`
- Analyzer unit tests: `packages/core/src/analyzer/analyzer.test.ts`
- Public validation API: `packages/core/src/validate.ts`
- Public generation API: `packages/core/src/generateData.ts`
- Active BDD runner: `packages/core/tests/run-cucumber.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Plan

- Centralize fuzzy matching in a shared core helper so analyzer and import resolution diagnostics use the same similarity rules.
- Improve analyzer context diagnostics without changing the validation pipeline or weakening multi-error accumulation.
- Add import-path suggestion logic only on unresolved-file failures so the existing resolver flow stays intact.
- Extend unit and curated BDD coverage with real fixtures for imports, inheritance, context references, template references, and workspace generators.

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `11-4-reference-validation-and-type-safety`.
- Discovery sources loaded: BMM config, sprint status, create-story workflow helpers, Epic 11 shard, requirements inventory, PRD matches for FR29, architecture shards, project context, repository memory notes, Story 11.3 artifact, current analyzer/import/context code, active BDD runner, recent git history, and current Bun and Commander reference pages.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- Current code already implements major parts of reference validation; the story is intentionally framed to close diagnostic-quality and acceptance-coverage gaps without duplicating existing analyzers and resolvers.
- Added `packages/core/src/common/suggestions.ts` and reused it from the analyzer plus import resolver suggestion paths.
- Extended unresolved import handling to suggest nearby relative or workspace `.td` files while preserving import declaration locations.
- Registered `packages/core/features/reference-validation.feature` in the curated core BDD runner with fixture-backed scenarios.
- Validation commands run: targeted `bun test` for analyzer/import resolver, curated core Cucumber runner, workspace `bun run test`, workspace `bun run test:bdd`, and workspace `bun run lint`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story file created for `11-4-reference-validation-and-type-safety` with status `ready-for-dev`.
- Sprint tracking advanced this story from `backlog` to `ready-for-dev`.
- Added shared fuzzy-matching utilities and used them for schema, template, context, workspace generator, and import-path suggestions.
- Added import resolver regression tests for unresolved relative imports, missing workspace roots, circular imports, and workspace-path typos.
- Added fixture-backed BDD coverage for broken imports, inheritance references, context collections, template fields, and workspace generators in the active runner.
- Confirmed reference failures still surface before generation via the existing validation pipeline and full workspace regression checks.

### File List

- `_bmad-output/implementation-artifacts/11-4-reference-validation-and-type-safety.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/common/suggestions.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/imports/importResolver.ts`
- `packages/core/src/imports/importResolver.test.ts`
- `packages/core/features/reference-validation.feature`
- `packages/core/features/step_definitions/reference-validation.steps.ts`
- `packages/core/features/fixtures/reference-validation/imports/typo/main.td`
- `packages/core/features/fixtures/reference-validation/imports/typo/common/profile.td`
- `packages/core/features/fixtures/reference-validation/inheritance/missing-base.td`
- `packages/core/features/fixtures/reference-validation/context/missing-collection.td`
- `packages/core/features/fixtures/reference-validation/templates/missing-field.td`
- `packages/core/features/fixtures/reference-validation/workspace/project/.tdconfig.json`
- `packages/core/features/fixtures/reference-validation/workspace/project/apps/user-with-typo.td`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-04-05: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-05: Implemented shared reference suggestion handling, import typo diagnostics, active fixture-backed BDD coverage, and regression tests for Story 11.4; status advanced to `review`.