# Story 6.3: schema-relationship-support

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to generate related entities using schema references**,
so that **I can create realistic datasets with foreign key relationships**.

## Acceptance Criteria

1. Field syntax `@schema:SchemaName` generates a new related record.
2. Referenced schemas are validated to exist during semantic analysis.
3. Related records are generated inline using the same RNG stream for deterministic output.
4. Related records follow the referenced schema structure.
5. Nested relationships are supported (schema references inside referenced schemas).
6. Generator tracks relationship generation depth to prevent infinite recursion.
7. Maximum nesting depth is configurable, defaulting to `5`.
8. Unit tests verify related-record generation behavior and guards.
9. Gherkin tests verify one-to-many and many-to-one style relationship scenarios.

## Tasks / Subtasks

- [x] Add schema-reference semantic model support (AC: 1, 2)
  - [x] Confirm analyzer output carries enough schema-reference metadata for generation decisions.
  - [x] Add/adjust analyzer validation to reject unknown `@schema:<name>` references with clear diagnostics.
  - [x] Ensure validation remains Result-based (`Result<T, Diagnostic[]>`) and does not throw for expected failures.

- [x] Implement relationship generation in generator pipeline (AC: 1, 3, 4, 5)
  - [x] Extend generator field handling to recognize schema-reference values and invoke referenced-schema record generation.
  - [x] Ensure generation uses the same RNG instance to preserve determinism and seed reproducibility.
  - [x] Reuse existing record generation pathways instead of duplicating generation logic.

- [x] Add recursion-depth safety guard (AC: 6, 7)
  - [x] Introduce depth-tracking context for relationship expansion.
  - [x] Enforce default max depth `5` and support configurable override via generation options/config.
  - [x] Emit actionable runtime error when depth exceeds the limit, including schema path context.

- [x] Validate nested and repeated relationship scenarios (AC: 5, 9)
  - [x] Cover nested schema-reference chains in unit tests.
  - [x] Add BDD scenarios for relationship generation patterns that mimic one-to-many and many-to-one datasets.
  - [x] Verify no regression to cross-field templates and dependency ordering behavior from stories 6.1 and 6.2.

- [x] Update exports and docs where required (AC: 1-9)
  - [x] Preserve module boundaries and export via module `index.ts` files only.
  - [x] Update story completion records and sprint status after implementation/review workflow.

## Dev Notes

### Story Foundation

- Epic 6 focuses on cross-field data realism. Story 6.1 delivered template evaluation, story 6.2 delivered dependency-ordered generation, and 6.3 now adds cross-schema relationship generation.
- Relationship support must integrate with existing generator/analyzer architecture rather than introducing parallel paths.

### Previous Story Intelligence (6.2)

- Recent work established reliable dependency-order logic in `generator.ts`; preserve that ordering and do not bypass it when generating relationship fields.
- Runtime guardrails were strengthened in 6.2 (missing dependency vs cycle distinction). Follow the same clarity standard for relationship-depth and schema-reference errors.
- Existing BDD coverage for cross-field templates is active; keep behavior stable while adding relationship scenarios.

### Technical Requirements

- Runtime and tooling: Bun + TypeScript strict mode; ESM modules only.
- Error handling: expected failures return `Result` diagnostics; avoid exceptions except defensive runtime integrity guards.
- Determinism: related records must be generated from the same RNG flow used by parent records.
- Data integrity: referenced schema must exist and be validated before generation starts.

### Architecture Compliance

- Maintain pipeline boundaries: analyzer validates references, generator executes generation.
- Keep changes within existing module ownership:
  - `packages/core/src/analyzer/` for semantic checks and diagnostics
  - `packages/core/src/generator/` for runtime relationship generation and depth tracking
- Keep imports through module boundaries and `index.ts` exports.

### Library / Framework Requirements

- Do not add Faker.js or other random-generation dependencies.
- Keep using the project PRNG and existing generator abstractions.
- Maintain Bun test runner and current BDD stack conventions.

### File Structure Requirements

- Primary expected touchpoints:
  - `packages/core/src/analyzer/analyzer.ts`
  - `packages/core/src/analyzer/types.ts` (if type metadata requires extension)
  - `packages/core/src/generator/generator.ts`
  - `packages/core/src/generator/*.test.ts`
  - `packages/core/features/*.feature`
  - `packages/core/features/step_definitions/*.steps.ts`
- Keep file naming in `camelCase.ts`.

### Testing Requirements

- Add unit tests for:
  - valid schema-reference generation
  - unknown referenced schema validation errors
  - nested relationship generation
  - recursion-depth overflow behavior
  - deterministic output for fixed seeds with relationships
- Add/extend BDD scenarios for relationship use cases and confirm no regressions in template behaviors.

### Git Intelligence Summary

- Last commits show concentration in analyzer/generator + BDD features for stories 6.1/6.2.
- Most frequently touched files: `packages/core/src/generator/generator.ts`, `packages/core/src/generator/generator.test.ts`, and cross-field feature files.
- Follow established pattern: implement story, then update artifact record and sprint status.

### Latest Technical Information

- No additional external dependency upgrades are required for this story scope.
- Continue with currently pinned stack and project conventions documented in project context and architecture artifacts.

### Project Structure Notes

- Preserve strict separation between core and CLI packages.
- Keep generation streaming and deterministic behavior intact.
- Avoid introducing new architectural layers for relationship support; extend existing generator/analyzer flow.

### References

- Source epic: `_bmad-output/planning-artifacts/epics/epic-6-cross-field-templates-relationships.md`
- Product requirements: `_bmad-output/planning-artifacts/prd.md`
- Project constraints: `_bmad-output/planning-artifacts/project-context.md`
- Prior implementation context: `_bmad-output/implementation-artifacts/6-2-field-generation-order-resolver.md`
- Architecture summaries: `_bmad-output/planning-artifacts/architecture/architecture-completion-summary.md`, `_bmad-output/planning-artifacts/architecture/architecture-validation-results.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Git log (last 5): `9cc2069`, `ddb5f18`, `d6bcf96`, `461c35f`, `4d89f50`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared with architecture, testing, and anti-regression guardrails for implementation.
- Added scanner/parser support for `@schema:SchemaName` field syntax and analyzer schema-reference metadata for generation decisions.
- Implemented inline related-record generation with shared RNG flow, nested relationship support, and configurable `maxRelationshipDepth` (default `5`) guardrails.
- Added unit coverage for parser, analyzer, and generator relationship behavior including deterministic generation and depth overflow runtime protection.
- Added BDD scenarios for many-to-one and one-to-many style relationship generation and nested-field assertions.
- Validation completed with full test suite: `594 passed, 0 failed`.

### File List

- `_bmad-output/implementation-artifacts/6-3-schema-relationship-support.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/scanner/tokens.ts`
- `packages/core/src/scanner/scanner.test.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/parser.test.ts`
- `packages/core/src/analyzer/types.ts`
- `packages/core/src/analyzer/analyzer.ts`
- `packages/core/src/analyzer/analyzer.test.ts`
- `packages/core/src/generator/generator.ts`
- `packages/core/src/generator/generator.test.ts`
- `packages/core/src/validate.test.ts`
- `packages/core/features/cross-field-templates.feature`
- `packages/core/features/step_definitions/cross-field-templates.steps.ts`
