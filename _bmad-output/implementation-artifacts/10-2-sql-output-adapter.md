# Story 10.2: SQL Output Adapter

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate SQL INSERT statements**,
so that **I can seed databases with test data**.

This story establishes the SQL output path in core only. CLI format selection, output extension inference, and SQL-specific CLI flags belong to Story 10.3.

## Acceptance Criteria

1. A `SqlAdapter` class exists in `packages/core/src/adapters/sqlAdapter.ts` implementing the adapter interface.
2. The adapter generates `INSERT` statements for each record batch.
3. The adapter properly escapes string values and identifiers to prevent SQL injection (NFR5).
4. The adapter handles `NULL` values correctly.
5. The adapter supports configurable table name.
6. The adapter batches multiple records per `INSERT` with configurable batch size.
7. The adapter supports both MySQL and PostgreSQL syntax.
8. The module exports through `packages/core/src/adapters/index.ts`.
9. Unit tests verify SQL generation and escaping.
10. Gherkin tests verify generated SQL can execute successfully.

## Tasks / Subtasks

- [ ] Implement the SQL adapter surface in core (AC: 1, 5, 6, 7, 8)
  - [ ] Create `packages/core/src/adapters/sqlAdapter.ts` with a `SqlAdapter` class following the existing `JsonAdapter` and `CsvAdapter` constructor-validation and `write()` shape.
  - [ ] Extend `packages/core/src/adapters/types.ts` with `SqlAdapterOptions` rather than introducing a separate adapter abstraction.
  - [ ] Validate `outputPath`, `tableName`, and `batchSize` eagerly with thrown `Error` values for invalid configuration.
  - [ ] Export `SqlAdapter` and `SqlAdapterOptions` from `packages/core/src/adapters/index.ts` and preserve public exports through `packages/core/src/index.ts`.

- [ ] Implement streaming, batched SQL writing with portable dialect rules (AC: 2, 3, 4, 5, 6, 7)
  - [ ] Use `Bun.write(outputPath, '')` before `Bun.file(outputPath).writer()` so reusing an output path cannot leave stale bytes behind.
  - [ ] Discover the stable column order from the first non-empty record and reuse that order for all emitted batches.
  - [ ] Skip leading empty records, treat missing values for known columns as `NULL`, and ignore late extra keys instead of mutating the established column set mid-stream.
  - [ ] Quote identifiers by dialect: PostgreSQL uses `"identifier"`, MySQL uses `` `identifier` ``, and embedded identifier quote characters must be escaped correctly.
  - [ ] Serialize values into a portable SQL subset: `NULL`, `TRUE`/`FALSE`, finite numbers, `bigint` via `String(value)`, strings with single quotes doubled, and arrays/objects as JSON string literals.
  - [ ] Flush each completed batch as one `INSERT INTO ... VALUES (...), (...);` statement and always flush the final partial batch.
  - [ ] Keep output limited to portable inserts only: no `RETURNING`, `ON CONFLICT`, transaction wrappers, metadata comments, or engine-specific casts in this story.

- [ ] Add focused unit coverage for SQL generation and escaping (AC: 3, 4, 6, 7, 9)
  - [ ] Create `packages/core/src/adapters/sqlAdapter.test.ts` next to the implementation.
  - [ ] Verify PostgreSQL and MySQL identifier quoting and table-name handling.
  - [ ] Verify escaping for injection-like payloads such as `O'Brien'); DROP TABLE users; --` so the value remains a single safe SQL literal.
  - [ ] Verify `NULL`, booleans, numbers, `bigint`, and nested object/array serialization.
  - [ ] Verify configurable batch sizes, stable column order, empty-stream behavior, leading empty-record handling, and output file truncation.

- [ ] Add BDD execution coverage using Bun's built-in SQLite engine as a portable execution harness (AC: 10)
  - [ ] Create `packages/core/features/sql-output-adapter.feature` for QA-facing acceptance scenarios.
  - [ ] Add Screenplay support files mirroring the CSV adapter structure only where reuse is not practical.
  - [ ] Use `bun:sqlite` in test code to create in-memory tables and execute generated SQL for both `postgres` and `mysql` dialect options.
  - [ ] Keep the generated SQL within a portable subset that SQLite can execute while still preserving the dialect-specific identifier quoting differences required by the acceptance criteria.
  - [ ] Reuse `packages/core/features/support/tasks/GenerateDataPublicAPITasks.ts` for at least one end-to-end generation scenario instead of hand-assembling every record in feature tests.

## Dev Notes

### Story Foundation

- Epic 10 adds non-JSON outputs and a programmatic API. Story 10.2 should build directly on the adapter pattern established by Story 10.1 instead of inventing a parallel output architecture.
- The repo already contains working `JsonAdapter` and `CsvAdapter` implementations in `packages/core/src/adapters/`; those files are the primary style and behavior references for constructor validation, streaming writes, and co-located tests.
- This story is intentionally scoped to `@testdata-ai/core`. Do not add CLI `--format sql` wiring, output-path inference, or table-name option parsing here; that belongs to Story 10.3.
- SQL generation must stay in a conservative, portable `INSERT` subset so both MySQL and PostgreSQL modes are supported without adding engine-specific features that complicate later CLI integration.

### Technical Requirements

- Follow the existing adapter contract in `packages/core/src/adapters/types.ts`:

```typescript
export interface IAdapter {
  write(records: AsyncIterable<Record<string, unknown>>): Promise<void>;
}

export interface SqlAdapterOptions {
  readonly outputPath: string;
  readonly tableName: string;
  readonly dialect?: 'postgres' | 'mysql';
  readonly batchSize?: number;
}
```

- Match the established constructor-validation style from `JsonAdapter` and `CsvAdapter`: reject empty `outputPath` and empty `tableName` early with thrown `Error` values.
- Default the dialect once, in the adapter options handling, and keep statement generation deterministic after construction. A default of `'postgres'` is acceptable if the implementation needs a default.
- Default `batchSize` to a positive, small-enough constant suitable for streaming writes. Validate `batchSize > 0` and reject `0`, negative, or non-integer values.
- Use `Bun.write(outputPath, '')` followed by `Bun.file(outputPath).writer()` exactly as the live `CsvAdapter` does after code review. Do not accumulate the full SQL output in memory before writing.
- Column order should come from the first non-empty emitted record's own property order and then stay fixed. Do not attempt mid-stream schema expansion.
- Value serialization rules should remain portable across PostgreSQL, MySQL, and the SQLite-backed test harness:
  - `null` and `undefined` become `NULL`
  - booleans become `TRUE` or `FALSE`
  - finite numbers become their string representation
  - `bigint` becomes `String(value)`
  - strings are single-quoted with embedded `'` doubled to `''`
  - arrays and plain objects use `JSON.stringify(value)` and then the resulting string literal is SQL-escaped
- Reject non-finite numbers rather than emitting invalid SQL literals such as `NaN` or `Infinity`.
- Quote both table and column identifiers according to dialect instead of interpolating raw names. Record keys come from generated schema fields, but they still must be handled defensively.
- Do not emit SQL metadata comments yet. Metadata comments are reserved for Epic 12 and would change the file format unexpectedly for this story.

### Architecture Compliance

- Prefer the live codebase over stale planning examples when they conflict:
  - the actual repo uses `packages/core/src/adapters/types.ts`, not `packages/core/src/adapters/adapter.ts`
  - the actual repo uses per-adapter tests such as `csvAdapter.test.ts`, not one shared `adapters.test.ts`
- Keep the implementation inside `packages/core/src/adapters/` and tests beside that code. Do not create a new output package or shared SQL utility package for this story.
- Keep exports flowing through `packages/core/src/adapters/index.ts`; do not bypass the module export surface.
- Do not modify `packages/cli/src/commands/generate.ts` in this story. The current CLI command still formats JSON only, and Story 10.3 owns the multi-format CLI integration.
- Do not hand-edit generated `dist/` output. Source changes belong in `src/` and test-support files only.
- Use Bun's built-in SQLite support for execution-style BDD coverage rather than introducing Dockerized databases, ORM layers, or external server dependencies.

### Library / Framework Requirements

- Runtime: Bun 1.x.
- Language: TypeScript 5.9.x, ESM-only, strict mode.
- Tests: Bun test runner for unit tests, Cucumber 12.5.0 plus SerenityJS 3.37.1 Screenplay support for BDD tests.
- Dependencies: add no MySQL or PostgreSQL client dependencies by default. The SQL formatting logic is straightforward, and Bun already provides a portable execution harness through `bun:sqlite` for tests.
- Do not introduce a query builder or ORM for this adapter. The story is about deterministic file output, not database abstraction.
- Use repo-pinned versions as authoritative for this story; do not opportunistically upgrade tooling while implementing the adapter.

### File Structure Requirements

Primary implementation surface:

- New files:
  - `packages/core/src/adapters/sqlAdapter.ts`
  - `packages/core/src/adapters/sqlAdapter.test.ts`
  - `packages/core/features/sql-output-adapter.feature`
  - `packages/core/features/step_definitions/sql-output-adapter.steps.ts`
  - `packages/core/features/support/abilities/UseSqlAdapter.ts`
  - `packages/core/features/support/abilities/UseSqlExecutionHarness.ts`
  - `packages/core/features/support/tasks/SqlAdapterTasks.ts`
  - `packages/core/features/support/questions/SqlAdapterQuestions.ts`

- Modified files:
  - `packages/core/src/adapters/types.ts`
  - `packages/core/src/adapters/index.ts`
  - `packages/core/src/index.ts` only if a direct export adjustment is actually needed
  - `packages/core/features/support/screenplay/Actors.ts`
  - `packages/core/tests/cucumber.runner.test.ts` only if the current BDD setup requires explicit support-file registration

### Testing Requirements

- Unit tests should cover:
  - default dialect output and explicit dialect switching
  - PostgreSQL double-quoted identifiers and MySQL backtick-quoted identifiers
  - table-name validation and `batchSize` validation
  - stable column ordering from the first non-empty record
  - `NULL`, boolean, numeric, `bigint`, and JSON-stringified nested values
  - string escaping for single quotes, semicolons, newline content, and injection-like payloads
  - empty streams, leading empty records, final partial batches, and output file truncation
- BDD tests should cover user-facing, execution-oriented behavior:
  - generate records through the public `generateData()` API
  - write them through `SqlAdapter`
  - create a matching in-memory SQLite table in the test harness
  - execute the generated SQL and verify inserted row counts plus representative field values
  - exercise both dialect settings with portable insert syntax
- Important constraint: there is no existing MySQL or PostgreSQL integration-test harness in this repo. Do not introduce external services or fragile shell-based test orchestration just to satisfy this story.
- Keep BDD scenarios focused on portable inserts and escaping. Dialect-specific differences should stay at the identifier-quoting level unless the repo later adds a real multi-engine database test harness.

### Previous Story Intelligence

- Story 10.1 established two concrete guardrails that must carry forward into SQL output work:
  - truncate reused output paths before writing, otherwise stale bytes can corrupt subsequent reads
  - ignore leading empty records until headers or columns can be discovered from a real record
- Reuse the structural pattern from the existing CSV adapter feature work:
  - Screenplay abilities live under `packages/core/features/support/abilities/`
  - Tasks coordinate adapter writes and fixture setup
  - Questions read back execution results for assertions
- Reuse `packages/core/features/support/tasks/GenerateDataPublicAPITasks.ts` where possible so the SQL story verifies the public API path rather than only synthetic record fixtures.
- Mirror the narrow, adapter-focused scope used in Story 10.1. Do not let SQL work sprawl into CLI configuration or context-management changes.

### Git Intelligence Summary

- Recent repo cadence is consistent: `create-story`, then `dev-story`, then `review story`. Keep the implementation aligned with that narrow story-by-story workflow.
- The latest relevant commits are `ba4e242 create-story 10.1`, `eec5d82 dev-story 10.1`, and `fc521a7 review story 10.1`. That means the live CSV adapter and its tests are the freshest implementation reference in the repository.
- Recent adapter work stayed small and source-focused. Maintain that pattern: implement the SQL adapter, tests, and Screenplay support without unrelated cleanup.

### Latest Technical Information

- Root tooling is currently pinned to TypeScript 5.9.3, ESLint 9.39.2, and Prettier 3.7.4 in the root `package.json`.
- Core BDD dependencies are currently pinned in `packages/core/package.json`: `@cucumber/cucumber` 12.5.0 and SerenityJS 3.37.1 packages.
- The project runtime is Bun-first, and Bun provides `bun:sqlite`, which is the most practical existing execution harness for SQL acceptance coverage in this repo.
- No MySQL, PostgreSQL, or generic SQL client packages are currently declared in the workspace. Treat that absence as intentional and avoid adding database-driver dependency surface unless the story proves it is strictly necessary.

### Project Context Reference

Apply the project rules captured in `_bmad-output/planning-artifacts/project-context.md`:

- Bun-first execution, not Node-first implementation choices.
- Strict TypeScript, no `any`, ESM-only imports/exports.
- Public exports through `index.ts`.
- Co-located `*.test.ts` unit tests.
- Screenplay-pattern BDD for acceptance criteria.
- Private class members require both `private` and underscore prefix.

### Project Structure Notes

- Planning artifacts describe the intended long-term structure, but the live repo is the source of truth for this story.
- The important live patterns to preserve are:
  - adapter implementations under `packages/core/src/adapters/`
  - co-located unit tests beside each adapter
  - Screenplay BDD support under `packages/core/features/support/`
- The current CLI command in `packages/cli/src/commands/generate.ts` still formats JSON only. That is expected and should remain untouched here.
- If you encounter additional structure drift while implementing, prefer the pattern already used by adjacent source files unless this story explicitly requires a structural correction.

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-10-multi-format-output-programmatic-api.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Architecture index: `_bmad-output/planning-artifacts/architecture/index.md`
- Core architectural decisions: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Implementation patterns: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Structure boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Existing adapter implementations: `packages/core/src/adapters/jsonAdapter.ts`, `packages/core/src/adapters/csvAdapter.ts`
- Existing adapter exports: `packages/core/src/adapters/index.ts`
- Existing adapter types: `packages/core/src/adapters/types.ts`
- Existing public core exports: `packages/core/src/index.ts`
- Existing CSV adapter feature: `packages/core/features/csv-output-adapter.feature`
- Existing CSV adapter Screenplay tasks: `packages/core/features/support/tasks/CsvAdapterTasks.ts`
- Existing public API generation entry point: `packages/core/src/generateData.ts`
- Existing CLI generate command scope boundary: `packages/cli/src/commands/generate.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Validation framework file `_bmad/core/tasks/validate-workflow.xml` is not present in this repository snapshot, so checklist validation was performed manually during story creation.
- External web lookup was not available through the workflow context; latest technical guidance was derived from repo-pinned package manifests, project context, and the live source tree.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to `ready-for-dev`.
- Sprint tracking updated from `backlog` to `ready-for-dev` for story `10-2-sql-output-adapter`.

### File List

- `_bmad-output/implementation-artifacts/10-2-sql-output-adapter.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`