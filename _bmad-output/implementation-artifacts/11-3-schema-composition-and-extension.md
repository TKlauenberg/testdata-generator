# Story 11.3: Schema Composition and Extension

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA tester,
I want to extend existing schemas with additional fields,
so that I can reuse base schemas with variations.

The live codebase already supports imported schemas, workspace-aware validation and generation entry points, schema-level defaults, workspace generators, cross-field templates, uniqueness constraints, and dependency-aware field generation. It does not yet support `schema ExtendedUser extends User { ... }` syntax, inherited field visibility, or inheritance-aware semantic validation. This story should add single-schema extension on top of the existing import-aware core pipeline without introducing a second composition model, mutating base schemas, or bypassing analyzer and generator contracts.

## Acceptance Criteria

1. Given I have a base schema to extend, when I implement schema extension syntax and the DSL supports `schema ExtendedUser extends User { ... }` syntax, then the parser recognizes the `extends` keyword.
2. Extended schema inherits all fields from the base schema.
3. Extended schema can add new fields.
4. Extended schema can override field definitions from the base schema.
5. The semantic analyzer validates that the base schema exists.
6. Extension creates a new independent schema and does not modify the base schema.
7. Unit tests verify field inheritance and override behavior.
8. Gherkin tests verify extended schemas generate correctly.

## Tasks / Subtasks

- [x] Extend scanner, AST, and parser support for single-schema inheritance syntax (AC: 1)
  - [x] Add `extends` to the DSL keyword set in `packages/core/src/scanner/tokens.ts` so the parser can distinguish it from identifiers without adding new operator tokens.
  - [x] Extend `SchemaNode` in `packages/core/src/parser/ast.ts` with an additive optional base-schema property such as `extendsSchema?: string`, preserving existing schema shape for non-inheriting declarations.
  - [x] Update `packages/core/src/parser/parser.ts` so `_parseSchemaDeclaration()` accepts `schema Name extends BaseName { ... }` between the schema name and opening brace, with clear parse errors for malformed or misplaced `extends` clauses.
  - [x] Preserve source locations for the derived schema and the base-schema reference so analyzer diagnostics for undefined or cyclic inheritance point to the actual `extends` clause.

- [x] Implement inheritance-aware semantic analysis and effective schema construction in core (AC: 2, 3, 4, 5, 6)
  - [x] Validate that the base schema exists in the merged program after Story 11.1 import resolution, so derived schemas can extend imported bases as well as local ones.
  - [x] Extend the existing dependency-graph and circular-dependency detection path in `packages/core/src/analyzer/analyzer.ts` to include inheritance edges in addition to schema-reference and template-reference edges.
  - [x] Build effective derived-schema field lists by flattening base fields plus derived overrides, keeping declaration order stable where possible and ensuring overrides replace the inherited field definition instead of producing duplicate-field errors.
  - [x] Keep the base `SchemaNode` immutable and independent: no mutation of the base AST node, symbol table entries, or validated field arrays when constructing the derived schema.
  - [x] Reuse existing validation passes for supported types, generators, templates, context references, uniqueness, and schema references against the effective field set so inherited fields behave like local fields during validation and generation.
  - [x] Keep scope bounded to single inheritance for this story. Do not introduce multiple inheritance, mixins, or a second schema-composition DSL.

- [x] Thread inherited-field behavior through validated output and generation without changing public API shape unnecessarily (AC: 2, 3, 4, 6)
  - [x] Update `packages/core/src/analyzer/types.ts` and validated-schema construction so generation receives the effective flattened field list for a derived schema rather than only the local AST fields.
  - [x] Ensure `packages/core/src/generator/generator.ts` continues to work through `sortFieldsByDependency(schema.fields)` using the validated effective field list, so inherited fields and overridden template dependencies generate in the correct order.
  - [x] Preserve field-level precedence semantics established in earlier stories: explicit derived field definitions override inherited field definitions, while unresolved fields still follow existing schema defaults, workspace generator, and built-in resolution rules.
  - [x] Avoid unnecessary CLI command changes unless a failing integration test proves otherwise; `validateSchema()` and `generateData()` already provide the shared core entry points for syntax and generation behavior.

- [x] Add regression coverage in the active unit and BDD harnesses, and update docs if syntax examples become user-facing (AC: 7, 8)
  - [x] Extend parser, analyzer, and generation unit tests for valid inheritance, missing base schemas, inheritance cycles, additive fields, overrides, imported base schemas, and non-mutation of base schemas after derived-schema validation.
  - [x] Add generation-focused tests proving inherited fields appear in derived output, overridden fields replace base behavior, and template references from derived fields can depend on inherited fields.
  - [x] Add an executed core BDD feature for schema extension under `packages/core/features/` with real `.td` fixtures, and register both the feature and its step definitions in `packages/core/tests/run-cucumber.ts` instead of relying on dormant parser or semantic-analysis feature files.
  - [x] If the final syntax is surfaced in repository docs or examples, update only existing docs in `docs/api.md`, `docs/foundation-patterns.md`, or `docs/examples/generateData-examples.md` as appropriate; do not create speculative documentation surfaces.

## Dev Notes

### Story Foundation

- Epic 11 is about pattern composition and reusability across teams. Story 11.1 established import-aware schema visibility, and Story 11.2 established workspace-shared generators and validation threading.
- Story 11.3 is the first epic item that composes schemas themselves. It should treat imports plus inheritance as one coherent composition pipeline, not as separate special cases.
- Story 11.4 depends directly on this story's reference-validation behavior, especially clear diagnostics when base schemas are missing or inheritance cycles exist.
- The PRD requirement behind this story is FR21: users can compose patterns from reusable components and build complex patterns from simple pieces.
- No dedicated UX planning artifact matching `*ux*.md` exists in planning artifacts, so user-facing quality expectations come from epic acceptance criteria, PRD behavior, and the repository's existing diagnostic style.

### Technical Requirements

- Current DSL keywords in `packages/core/src/scanner/tokens.ts` do not include `extends`; parser support starts there.
- `packages/core/src/parser/parser.ts` currently parses schema declarations as `schema` + identifier + `{ ... }` and will reject `extends` until the grammar is widened.
- `packages/core/src/parser/ast.ts` already includes additive constructs such as `ImportNode`; schema inheritance should follow the same additive AST style instead of replacing existing schema semantics.
- `packages/core/src/analyzer/analyzer.ts` currently validates local schema fields, builds an effective field context for defaults and generators, and computes a dependency graph before topological sorting. Inheritance must feed into those existing passes rather than bolt on a second validation path.
- `packages/core/src/analyzer/symbolTable.ts` currently records only explicitly declared fields per schema. Use the symbol table for base-schema existence and local duplicate detection, but build inherited effective fields after symbol-table construction so intentional overrides do not look like duplicate local declarations.
- `packages/core/src/generator/generator.ts` already generates from validated schema fields in dependency order. The cleanest implementation is to give the generator a flattened validated field list for derived schemas, not to teach runtime generation about inheritance semantics directly.
- Imported schemas from Story 11.1 must be eligible inheritance targets. The analyzer should validate against the fully merged post-import program, not just declarations from the current file.
- Keep the story scoped to field inheritance and override behavior. Do not invent multiple inheritance, profile inheritance, or implicit plugin hooks.

### Architecture Compliance

- Maintain the current core pipeline: scanner -> parser -> import resolution -> analyzer -> generator.
- Keep inheritance semantics in core. CLI commands should continue delegating to core validation and generation rather than duplicating schema-extension logic.
- Preserve strict TypeScript, immutable AST data, Result-based fallible phases, and monorepo package boundaries.
- Avoid mutating source AST nodes or symbol table entries when constructing derived schemas; create new validated structures instead.
- Reuse existing circular-dependency and suggestion-style diagnostic patterns where possible so Story 11.4 can extend them consistently.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language and tooling: TypeScript `^5.9.3`, ESLint `^9.39.2`, Prettier `^3.7.4`.
- CLI framework: Commander is pinned at `^14.0.2` in the repository; npm currently shows `14.0.3`, but this core parser/analyzer story does not require a Commander upgrade.
- Bun's current test-runner guidance still supports co-located `*.test.ts` TypeScript tests with `bun test`; no test-framework change is needed for this story.
- No new third-party package should be required. Use the existing Bun, TypeScript, Node standard library, and current core/CLI packages.

### File Structure Requirements

Primary core files likely to change:

- `packages/core/src/scanner/tokens.ts`
- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/analyzer/types.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/generator/generator.ts`
- `packages/core/src/parser/index.ts` only if additive exports must stay aligned with AST type changes

Primary unit-test files likely to change:

- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/generator/generator.test.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/src/generateData.test.ts`

BDD coverage and fixtures likely to change:

- a new executed feature under `packages/core/features/`
- matching step definitions under `packages/core/features/step_definitions/`
- fixture `.td` files under `packages/core/features/fixtures/`
- `packages/core/tests/run-cucumber.ts`

Likely unnecessary unless implementation proves otherwise:

- `packages/cli/src/commands/generate.ts`
- `packages/cli/src/commands/validate.ts`
- workspace config loader files under `packages/cli/src/config/`
- output adapters under `packages/core/src/adapters/`

### Testing Requirements

- Unit tests must cover:
  - parsing valid `extends` clauses,
  - rejecting malformed inheritance syntax,
  - undefined base-schema diagnostics,
  - circular inheritance detection,
  - effective inherited field availability,
  - derived-field override behavior,
  - imported base-schema inheritance,
  - stability of base-schema definitions after derived-schema validation and generation.
- Generation-focused tests must verify that inherited fields participate in dependency ordering, template evaluation, uniqueness behavior, and runtime output the same way local fields do.
- BDD scenarios must use real fixture files on disk and prove end-to-end generation from an extended schema, not just parser snapshots or inline strings.
- Any new feature scenarios must be wired into `packages/core/tests/run-cucumber.ts`; the active runner currently executes `import-resolution.feature` and `workspace-generators.feature`, but not dormant parser or semantic-analysis feature files.

### Previous Story Intelligence

- Story 11.1 already established the post-import merged-program model and the `currentFile` / `workspaceRoot` threading through `validateSchema()` and `generateData()`. Inheritance should ride on that merged program rather than introducing a second file-resolution path.
- Story 11.2 already extended analyzer and generation flows with effective per-field metadata and workspace-generator resolution. Derived schemas should reuse that effective-field machinery so inherited fields continue to honor generator precedence and diagnostics.
- Repository memory notes confirm that `packages/core/tests/run-cucumber.ts` is the active core BDD runner and new feature files must be registered there explicitly.
- Story 11.4 will build on this story's base-schema validation and error-message quality, so avoid hard-coding inheritance checks in ways that will be difficult to generalize.

### Git Intelligence Summary

- Recent commits show the current Epic 11 implementation sequence: `d3142a5` created Story 11.2, `ad55035` implemented it, and `078d0a0` completed code review for it after Story 11.1's `033bbb4` / `9d39949` implementation and review cycle.
- Practical implication: Story 11.3 should extend the same parser/analyzer/generation seams changed by 11.1 and 11.2, because this area has fresh conventions and active regression coverage.

### Latest Technical Information

- Bun's current test-runner guidance continues to recommend `bun test` for co-located `*.test.ts` files and supports path filters for focused runs. That matches the repository's root scripts and does not require a harness change for this story.
- npm currently lists Commander `14.0.3`, while the repo pins `^14.0.2`. Since this story is core syntax and semantic-analysis work, there is no dependency-driven reason to upgrade Commander.
- No external package or runtime upgrade is needed to implement schema extension safely.

### Project Context Reference

Apply `_bmad-output/planning-artifacts/project-context.md` exactly:

- Bun-first commands and tooling.
- strict TypeScript and no `any`.
- ESM-only imports and exports.
- Result-pattern handling for fallible operations.
- co-located `*.test.ts` unit tests.
- package boundary: CLI may depend on core; core must not depend on CLI.

### Project Structure Notes

- `packages/core/src/scanner/tokens.ts` currently reserves only `schema`, `profile`, `context`, `unique`, and `template` as DSL keywords.
- `packages/core/src/parser/parser.ts` currently expects the opening `{` immediately after a schema name.
- `packages/core/src/analyzer/analyzer.ts` currently builds validated fields from local schema fields and counts dependencies with `buildDependencyGraph(...)`; inheritance must become part of that same effective-schema path.
- `packages/core/src/analyzer/types.ts` already models validated field metadata separately from raw AST fields, which is the right seam for flattening inherited fields before generation.
- `packages/core/src/generator/generator.ts` currently calls `sortFieldsByDependency(schema.fields)`, so the validated field list for derived schemas must already include inherited and overridden fields in final form.
- `packages/core/src/analyzer/symbolTable.ts` scopes duplicate-field detection per schema using explicitly declared fields. That is useful for local duplicates but should not be reused naively for inherited override detection.
- `packages/core/tests/run-cucumber.ts` currently executes a curated list of core features, including `import-resolution.feature` and `workspace-generators.feature`. New schema-extension scenarios must be added explicitly or they will not run in CI.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-11-pattern-composition-reusability.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Architecture decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Previous story: `_bmad-output/implementation-artifacts/11-1-dsl-import-statement-support.md`
- Previous story: `_bmad-output/implementation-artifacts/11-2-shared-generator-definitions.md`
- Previous config precedent: `_bmad-output/implementation-artifacts/9-2-workspace-configuration.md`
- Token definitions: `packages/core/src/scanner/tokens.ts`
- Parser AST: `packages/core/src/parser/ast.ts`
- Parser implementation: `packages/core/src/parser/parser.ts`
- Parser exports: `packages/core/src/parser/index.ts`
- Analyzer types: `packages/core/src/analyzer/types.ts`
- Analyzer implementation: `packages/core/src/analyzer/analyzer.ts`
- Symbol table: `packages/core/src/analyzer/symbolTable.ts`
- Shared validation API: `packages/core/src/validate.ts`
- Public generation API: `packages/core/src/generateData.ts`
- Generator engine: `packages/core/src/generator/generator.ts`
- Active BDD runner: `packages/core/tests/run-cucumber.ts`
- Docs surface: `docs/api.md`
- Docs surface: `docs/foundation-patterns.md`
- Docs examples: `docs/examples/generateData-examples.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `11-3-schema-composition-and-extension`.
- Discovery sources loaded: Epic 11 shard, PRD, architecture shards, project context, repository memory notes, Stories 9.2, 11.1, and 11.2 implementation artifacts, current parser/analyzer/generator code, active BDD runner, recent git history, and current Bun and Commander reference pages.
- No dedicated UX planning artifact matching `*ux*.md` was found in planning artifacts.
- Current code already supports imports and workspace generators, but schema declarations still parse only `schema Name { ... }`, the analyzer still derives validated fields from local schema fields, and generation still consumes the validated field list directly.
- The active BDD runner is curated and does not auto-run dormant parser or semantic-analysis feature files, so schema-extension acceptance coverage must be registered explicitly.
- The story is intentionally scoped to additive single-schema inheritance with clear undefined-base and cycle diagnostics, flattened effective fields for generation, and no mutation of base schemas.
- Implemented `extends` as a reserved keyword, added additive AST metadata for base-schema name and extends-clause source location, and widened parser grammar plus parser diagnostics for malformed or misplaced inheritance clauses.
- Refactored analyzer validation to build local effective fields, extend dependency graphs with inheritance edges, flatten inherited validated fields without mutating base schemas, inherit composite uniqueness metadata, and point undefined-base/circular-inheritance diagnostics at the actual extends clause.
- Added unit coverage across scanner, parser, analyzer, validate, and generateData; added executed fixture-backed BDD coverage under `packages/core/features/schema-extension.feature`; updated `docs/api.md` with user-facing inheritance syntax.
- Verification completed with focused Bun test files, the active cucumber runner (`82 scenarios`, `441 steps`, all passing), full `bun test` regression, and `bun run lint` with only pre-existing repository warnings outside this story's files.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story file created for `11-3-schema-composition-and-extension` with status `ready-for-dev`.
- Sprint tracking advanced this story from `backlog` to `ready-for-dev`.
- Added end-to-end single inheritance support for `schema Child extends Base { ... }`, including extends-clause location tracking and clear parse/analyzer diagnostics.
- Flattened inherited fields into validated derived schemas so generation, template dependency ordering, and override behavior reuse the existing core pipeline without CLI changes.
- Confirmed imported base schemas are valid inheritance targets and that derived schema validation does not mutate base schema definitions.
- Added executed acceptance coverage with real fixture files plus regression tests for valid inheritance, overrides, missing bases, cycles, imported bases, and inherited template references.
- Documented the new inheritance syntax in the programmatic API docs and advanced the story to `review`.

### File List

- `_bmad-output/implementation-artifacts/11-3-schema-composition-and-extension.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/api.md`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/types.ts`
- `packages/core/src/generateData.test.ts`
- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/scanner/scanner.test.ts`
- `packages/core/src/scanner/tokens.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/tests/run-cucumber.ts`
- `packages/core/features/schema-extension.feature`
- `packages/core/features/step_definitions/schema-extension.steps.ts`
- `packages/core/features/fixtures/schema-extension/apps/extended.td`
- `packages/core/features/fixtures/schema-extension/circular.td`
- `packages/core/features/fixtures/schema-extension/common/base.td`
- `packages/core/features/fixtures/schema-extension/missing-base.td`

### Change Log

- 2026-04-04: Created story context artifact via create-story workflow and updated sprint status to `ready-for-dev`.
- 2026-04-04: Implemented schema extension syntax and inheritance-aware validation/generation, added unit plus executed BDD regression coverage, updated API docs, and moved story to `review`.