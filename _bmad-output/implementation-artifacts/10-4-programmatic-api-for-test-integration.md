# Story 10.4: Programmatic API for Test Integration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a test automation developer,
I want to generate test data programmatically in my test scripts,
so that I can create data on-demand during test execution.

The repository already exposes a partial public API through `generateData()` in `packages/core/src/generateData.ts`. This story hardens that surface for external test integration by closing packaging, documentation, example, and acceptance-coverage gaps without breaking the existing streaming contract or duplicating CLI logic.

## Acceptance Criteria

1. The published core package continues to support `import { generateData } from '@testdata-ai/core'` from the package root, and the built package exports the public types needed for programmatic use.
2. `generateData()` continues to accept inline DSL schema source as a string and returns `AsyncIterable<Record<string, unknown>>` that consumers can iterate with `for await...of`.
3. Programmatic consumers can produce JSON, CSV, and SQL output using the existing core adapter surface without depending on the CLI; documentation and examples must use import paths that match the published package exports.
4. Validation failures expose typed diagnostics through a stable public contract. Preserve the existing `ValidationError` behavior; if a Result-style helper is added, it must be additive and must not break current callers.
5. Public TypeScript types for the programmatic API are exported and documented, including `GenerateOptions`, `ValidationError`, relevant adapter option types, context types used by examples, and any new helper types introduced by this story.
6. Canonical API documentation exists in `docs/api.md` and includes correct package-root imports, streaming examples, error-handling examples, and format-integration examples aligned with the live codebase.
7. Example programmatic integration scripts demonstrate usage in Bun-based tests and at least one additional common test framework style without introducing unnecessary runtime dependencies into the repository.
8. Automated coverage verifies the live programmatic API path, including success, deterministic seeding, invalid schema handling, multi-schema generation, context-aware generation, and the documented programmatic integration surface.
9. The existing public-API Gherkin coverage is wired into the actual core Cucumber runner so programmatic API scenarios execute in CI rather than remaining dormant feature files.

## Tasks / Subtasks

- [x] Finalize the public core API surface for programmatic use (AC: 1, 2, 4, 5)
  - [x] Confirm that the package-root export in `packages/core/src/index.ts` remains the canonical import surface for `generateData`, `ValidationError`, adapters, and related public types.
  - [x] Verify the published package metadata in `packages/core/package.json` matches the documented public API surface.
  - [x] Preserve the current `generateData(source, options)` streaming contract and avoid replacing it with a breaking Result-returning API.
  - [x] If a Result-style convenience API is genuinely needed for test integration, add it as a companion export instead of changing `generateData()` semantics.

- [x] Close documentation and example gaps for external consumers (AC: 3, 5, 6, 7)
  - [x] Create `docs/api.md` as the canonical programmatic API reference promised by the architecture docs.
  - [x] Update `docs/examples/generateData-examples.md` so every import path works with the published package surface; do not rely on undocumented subpath imports such as `@testdata-ai/core/adapters` unless this story explicitly adds and documents them.
  - [x] Add example integration scripts or snippets for Bun tests and at least one additional common framework style such as Playwright or Vitest/Jest-style setup.
  - [x] Update any README or docs links that currently point to missing or stale API documentation paths.

- [x] Ensure programmatic formatting guidance reuses the existing core adapters (AC: 3, 6, 7, 8)
  - [x] Reuse `JsonAdapter`, `CsvAdapter`, and `SqlAdapter` from `@testdata-ai/core`; do not recreate formatter logic in new helper files.
  - [x] Keep `generateData()` focused on raw record generation. If format-specific convenience is added, keep it narrowly scoped and layered on top of the existing adapters.
  - [x] Document the supported JSON, CSV, and SQL programmatic flows using the live adapter contracts and package exports.

- [x] Wire the dormant public-API acceptance coverage into the live test harness (AC: 8, 9)
  - [x] Register `packages/core/features/generateData-public-api.feature` in `packages/core/tests/run-cucumber.ts`.
  - [x] Register the existing step definitions and support files needed for the public API feature in the same runner.
  - [x] Extend the feature and step/support layers only where the current coverage misses required programmatic scenarios such as adapter-backed output examples or external-integration-specific flows.
  - [x] Keep `packages/core/src/generateData.test.ts` as the focused unit/integration suite for raw API behavior and add coverage only where the live gap remains.

- [x] Keep Story 10.4 scoped to core programmatic integration only (AC: 1, 3, 4, 6, 7, 8, 9)
  - [x] Do not modify CLI behavior or Commander option parsing in this story.
  - [x] Do not redesign the scanner, parser, analyzer, or generator pipeline.
  - [x] Do not duplicate adapter implementations or add format-specific libraries when the existing core adapters already satisfy the need.
  - [x] Avoid package export sprawl unless it is justified by a real published-package limitation and covered by tests and docs.

## Dev Notes

### Story Foundation

- Epic 10 originally split output work into core adapters, CLI integration, and then programmatic API support.
- Unlike the original planning assumption, the live repository already includes a public `generateData()` API in `packages/core/src/generateData.ts` and exports it from `packages/core/src/index.ts`.
- The current API already satisfies part of the epic intent:
  - package-root import exists
  - inline DSL source is accepted as a string
  - records stream as `AsyncIterable<Record<string, unknown>>`
  - invalid schemas surface as `ValidationError`
  - unit tests already cover basic generation, deterministic seeds, multi-schema behavior, context usage, and validation failures
- The primary gaps for Story 10.4 are not first-time API invention. They are public-surface hardening, documentation correctness, example integration, and ensuring existing BDD coverage actually executes.

### Technical Requirements

- Preserve the existing signature of `generateData(source, options)` unless there is a narrowly justified additive enhancement.
- `GenerateOptions` currently supports:
  - `count`
  - `seed?`
  - `maxRelationshipDepth?`
  - `context?`
  - `defaultGenerators?`
- There is currently no `format` option on `GenerateOptions`. Do not add a `format` flag that changes `generateData()` from raw-record streaming into formatted-file or formatted-string output.
- If the story needs to satisfy the epic's format expectations programmatically, do it by documenting and, if necessary, lightly simplifying the adapter-based composition path:
  - `generateData(...)` returns raw records
  - `JsonAdapter`, `CsvAdapter`, and `SqlAdapter` consume the stream
- Preserve the existing `ValidationError` contract, including the `diagnostics` payload. If a typed Result helper is introduced, it must be additive and clearly positioned as an alternative integration surface rather than a replacement.
- Keep TypeScript types exportable from the public surface. External consumers should not need to import from deep internal paths for common programmatic usage.
- Fix documented imports that are invalid against the published package configuration. `packages/core/package.json` currently exports only `.` and does not declare a published `./adapters` subpath.
- Keep examples honest about package behavior. If a doc sample needs `JsonAdapter`, it should import it through the package root export surface unless this story intentionally adds tested subpath exports.

### Architecture Compliance

- The core package owns generation, validation, context management, and output adapters.
- The CLI package depends on core; core must not gain CLI parsing or command concerns.
- Maintain the sequential pipeline already established in the architecture:
  - scanner
  - parser
  - analyzer
  - generator
- `generateData()` is a convenience layer that currently composes `validateSchema()` with `generate()`.
- Keep output formatting in adapters rather than embedding JSON, CSV, or SQL serialization logic directly inside the public API helper unless a very small wrapper is the cleanest way to expose existing adapter behavior.
- Do not hand-edit or rely on stale planning examples when they conflict with live source. The repository already uses `packages/core/src/adapters/types.ts` rather than the older planning-path examples.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language: TypeScript 5.9.x, ESM-only, strict mode.
- Core package testing: Bun test runner plus Cucumber 12.5.0 and SerenityJS 3.37.1 for BDD coverage.
- Avoid adding new production dependencies for this story.
- Prefer documentation or lightweight example scripts over pulling additional test frameworks into the repository purely for examples.
- If example files mention external frameworks such as Playwright or Vitest, keep them dependency-light and documentation-oriented unless the repository intentionally adopts those frameworks as real dev dependencies.

### File Structure Requirements

Primary implementation surface:

- Likely modified files:
  - `packages/core/src/index.ts`
  - `packages/core/src/generateData.ts`
  - `packages/core/src/generateData.test.ts`
  - `packages/core/tests/run-cucumber.ts`
  - `packages/core/features/generateData-public-api.feature`
  - `packages/core/features/step_definitions/generateData-public-api.steps.ts`
  - `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
  - `packages/core/features/support/tasks/GenerateDataPublicAPITasks.ts`
  - `packages/core/features/support/questions/GenerateDataPublicAPIQuestions.ts`
  - `docs/examples/generateData-examples.md`
  - `README.md`

- New files likely required:
  - `docs/api.md`
  - programmatic integration example files under `docs/examples/` if code examples are split out of markdown

- Avoid touching CLI files in this story unless a documentation link absolutely requires a small README update.

### Testing Requirements

- Keep `packages/core/src/generateData.test.ts` passing and use it as the primary raw API regression suite.
- Add or refine unit coverage for:
  - public type exports used by examples
  - any additive helper introduced for typed-result handling or adapter composition
  - package-surface behavior that could regress published imports
- Make the live BDD runner execute the existing public API feature:
  - add `packages/core/features/generateData-public-api.feature`
  - add the matching step-definition file path
  - keep the existing Screenplay support pattern intact
- Verify that the public API acceptance coverage actually runs under the repository's normal `bun run test:bdd` flow, not just as dormant files in `features/`.
- If example programmatic formatting flows are part of the acceptance criteria, cover them with focused unit or BDD tests only where they represent real public behavior rather than documentation prose.

### Previous Story Intelligence

- Story 10.3 intentionally kept programmatic API work out of scope and focused only on CLI integration.
- Story 10.3 reinforced a critical architectural boundary that also applies here: formatting behavior belongs in core adapters, not duplicated ad hoc in another layer.
- Story 10.3 also established live multi-format support at the CLI layer. Story 10.4 should align the programmatic documentation and examples with those same supported formats rather than inventing a separate format story.
- Story 10.3 review work showed that dormant or miswired acceptance coverage is a real regression risk. For 10.4, make sure the already-authored public API feature is part of the executed Cucumber suite.

### Git Intelligence Summary

- Recent commit flow is story-scoped and sequential:
  - `b77799f review story 10.3`
  - `d86230a dev story 10.3`
  - `9f190cf create-story 10.3`
  - `1efe4de code-review story 10.2`
  - `2731293 dev-story 10.2`
- Story 10.3 touched CLI command logic, CLI tests, package scripts, workflow CI, and its implementation artifact. Follow the same focused approach here: keep changes centered on core public API, docs, and executed tests.
- The review commit for 10.3 also touched CI and package scripts, which is a reminder to verify that any new BDD coverage or build-surface expectations are wired into the actual automated paths, not only into source files.

### Latest Technical Information

- External web lookup was not available in this workflow context, so technical version guidance is derived from the live repository manifests.
- Root toolchain is currently pinned to TypeScript 5.9.3, ESLint 9.39.2, and Prettier 3.7.4.
- `@testdata-ai/core` currently publishes only the root export path in `packages/core/package.json`.
- Core BDD dependencies are currently `@cucumber/cucumber` 12.5.0 and SerenityJS 3.37.1.
- The live public API docs example file exists at `docs/examples/generateData-examples.md`, but it currently includes at least one import path that does not match the published package exports.

### Project Context Reference

Apply the project rules captured in `_bmad-output/planning-artifacts/project-context.md`:

- Bun-first tooling and scripts
- strict TypeScript with no `any`
- ESM-only imports/exports
- public exports through package `index.ts` surfaces
- co-located `*.test.ts` unit tests
- Result-pattern discipline for fallible internal operations, but preserve live public API compatibility where a public exception contract already exists

### Project Structure Notes

- The architecture planning docs expect `docs/api.md`, but that file does not currently exist in the workspace.
- The live repository already contains these programmatic-API assets:
  - `packages/core/src/generateData.ts`
  - `packages/core/src/generateData.test.ts`
  - `packages/core/features/generateData-public-api.feature`
  - `packages/core/features/step_definitions/generateData-public-api.steps.ts`
  - `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
- The main execution gap is in `packages/core/tests/run-cucumber.ts`, which currently does not register the public API feature or its step-definition file even though they already exist.
- `docs/examples/generateData-examples.md` is the current public API examples document, but it is not a substitute for the missing canonical `docs/api.md` surface and needs import corrections.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-10-multi-format-output-programmatic-api.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Architecture structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Public API export surface: `packages/core/src/index.ts`
- Public API implementation: `packages/core/src/generateData.ts`
- Public API tests: `packages/core/src/generateData.test.ts`
- Validation pipeline: `packages/core/src/validate.ts`
- Generator options: `packages/core/src/generator/generator.ts`
- Adapter exports: `packages/core/src/adapters/index.ts`
- Adapter types: `packages/core/src/adapters/types.ts`
- Core package manifest: `packages/core/package.json`
- Existing API examples: `docs/examples/generateData-examples.md`
- Public API BDD feature: `packages/core/features/generateData-public-api.feature`
- Public API step definitions: `packages/core/features/step_definitions/generateData-public-api.steps.ts`
- Public API Screenplay ability: `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
- Core Cucumber runner: `packages/core/tests/run-cucumber.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Validation workflow file `_bmad/core/tasks/validate-workflow.xml` is not present in this repository snapshot, so checklist validation was performed manually during story creation.
- External web lookup was not available through the workflow context; technical guidance was derived from repository manifests, planning artifacts, live source files, and recent git history.
- Story selection was resolved automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog story: `10-4-programmatic-api-for-test-integration`.
- `packages/core/features/generateData-public-api.feature` needed step-language namespacing before it could be wired into the shared Cucumber suite without colliding with existing generic programmatic-generation steps.
- Repo-wide lint initially failed on a pre-existing `require-await` error in `packages/core/features/support/tasks/SqlAdapterTasks.ts`; the error was cleared and lint now completes with warnings only.

### Implementation Plan

- Reconcile the Epic 10.4 acceptance criteria with the live repository state by treating `generateData()` as an existing public API that must be stabilized, documented, and fully covered rather than invented from scratch.
- Close the highest-risk public-consumer gaps first: canonical docs, correct imports, executed BDD coverage, and explicit guidance for adapter-backed JSON/CSV/SQL programmatic flows.
- Add only narrowly scoped API surface changes if a real published-package limitation remains after the docs and test-harness fixes.

### Completion Notes List

- Added canonical programmatic API documentation in `docs/api.md` with package-root imports, streaming usage, `ValidationError` handling, adapter composition, context-aware generation, and Bun plus Playwright-style integration snippets.
- Corrected the existing examples doc to use only published package-root imports and expanded it with CSV and SQL adapter usage linked from the README.
- Tightened public API regression coverage with root-surface export assertions, adapter-composition tests, and explicit `ValidationError.diagnostics` checks while preserving the existing `generateData(source, options)` streaming contract.
- Wired the dormant public-API Gherkin feature into `packages/core/tests/run-cucumber.ts`, switched the Screenplay ability to consume the package-root export surface, and namespaced the feature steps so they execute cleanly in the shared Cucumber harness.
- Fixed code-review findings by aligning `packages/core/package.json` with the emitted `dist/src` entrypoints, correcting the documented `GenerateOptions.defaultGenerators` type and JSONL metadata example, and turning the public-API memory-efficiency BDD scenario into an asserted streaming check instead of a placeholder step.
- Validation passed with focused `runTests` on the public API unit and runner files (`24` passing), `bun run build` in `packages/core`, `bun run test:bdd` in `packages/core` (`1` passing), and an explicit dist-entrypoint existence check for `dist/src/index.js` and `dist/src/index.d.ts`.

### File List

- `_bmad-output/implementation-artifacts/10-4-programmatic-api-for-test-integration.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `README.md`
- `docs/api.md`
- `docs/examples/generateData-examples.md`
- `packages/core/features/generateData-public-api.feature`
- `packages/core/features/step_definitions/generateData-public-api.steps.ts`
- `packages/core/features/support/abilities/UseGenerateDataAPI.ts`
- `packages/core/features/support/questions/GenerateDataPublicAPIQuestions.ts`
- `packages/core/features/support/tasks/SqlAdapterTasks.ts`
- `packages/core/package.json`
- `packages/core/src/generateData.test.ts`
- `packages/core/src/index.test.ts`
- `packages/core/src/index.ts`
- `packages/core/tests/run-cucumber.ts`

## Change Log

- 2026-04-01: Hardened the core programmatic API surface with canonical docs, package-root example fixes, adapter-backed regression coverage, and live Cucumber execution for the public API feature.
- 2026-04-01: Code review complete. Fixed the packaged core entrypoint metadata, corrected public API documentation drift, and replaced the placeholder public-API memory assertions with validated streaming checks. Story moved to `done`.

## Senior Developer Review (AI)

**Reviewer:** Tobi on 2026-04-01

**Outcome:** Changes Requested -> Fixed

### Findings

| # | Severity | Description | File | Fixed |
| --- | --- | --- | --- | --- |
| H1 | HIGH | Published package metadata pointed at `dist/index.*` even though the build emits `dist/src/index.*`, breaking the package-root import contract for built consumers. | `packages/core/package.json` | ✅ Auto-fixed |
| M1 | MEDIUM | Canonical API docs published the wrong `GenerateOptions.defaultGenerators` shape, which did not match the exported type surface. | `docs/api.md` | ✅ Auto-fixed |
| M2 | MEDIUM | The JSONL example documented a `metadata` envelope even though the live adapter writes `_metadata` on the first line. | `docs/examples/generateData-examples.md` | ✅ Auto-fixed |
| M3 | MEDIUM | The public-API memory-efficiency Gherkin steps were placeholders with no assertions, so the documented acceptance coverage overstated what CI actually verified. | `packages/core/features/step_definitions/generateData-public-api.steps.ts` | ✅ Auto-fixed |

### Post-fix Verification

- **Focused unit tests:** 24 pass
- **Core build:** `bun run build` passes
- **BDD suite:** `bun run test:bdd` passes (1 runner test invoking the shared Cucumber suite)
- **Packaging sanity check:** `dist/src/index.js` and `dist/src/index.d.ts` exist at the paths declared in `packages/core/package.json`
- **Git discrepancies:** 0