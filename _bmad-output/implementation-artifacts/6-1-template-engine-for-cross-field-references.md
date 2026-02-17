# Story 6.1: Template Engine for Cross-Field References

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to create field values that reference other fields in the same record**,
so that **I can generate realistic related data like email from first and last name**.

## Acceptance Criteria

1. `evaluateTemplate(template: string, context: Record<string, unknown>): string` exists in `packages/core/src/generator/template.ts`.
2. Templates support `{{fieldName}}` references.
3. Template references resolve from the current record context.
4. Referenced fields are validated during semantic analysis.
5. Template evaluation occurs after dependent fields are generated.
6. Multiple references are supported (example: `{{firstName}}.{{lastName}}@test.com`).
7. Template evaluation failures return helpful messages.
8. Exports are wired through `packages/core/src/generator/index.ts`.
9. Unit tests verify parsing and evaluation behavior.
10. Gherkin tests verify cross-field template behavior in real schemas.

## Tasks / Subtasks

- [x] Implement template engine module (AC: 1, 2, 3, 6, 7)
  - [x] Create `packages/core/src/generator/template.ts`.
  - [x] Implement `evaluateTemplate(template, context)` with placeholder extraction via `{{...}}` pattern.
  - [x] Resolve scalar context values to strings predictably.
  - [x] Return helpful error when a referenced field is missing in context.
  - [x] Support repeated and multiple references in the same template string.

- [x] Integrate template evaluation into record generation flow (AC: 3, 5, 6, 7)
  - [x] Update `packages/core/src/generator/generator.ts` to evaluate `template` generator parameter values.
  - [x] Ensure template fields are evaluated only when dependencies are available in current record context.
  - [x] Add fail-fast, field-scoped error wrapping for unresolved references.
  - [x] Preserve deterministic generation and existing non-template generator behavior.

- [x] Confirm semantic validation alignment (AC: 4)
  - [x] Reuse existing analyzer template validation path in `packages/core/src/analyzer/analyzer.ts`.
  - [x] Ensure no duplicated validation logic is added in generator layer.
  - [x] If analyzer gaps are discovered, add focused fixes only for Story 6.1 scope.

- [x] Export updates (AC: 8)
  - [x] Export `evaluateTemplate` from `packages/core/src/generator/index.ts`.
  - [x] Keep module boundaries and existing export conventions intact.

- [x] Unit test coverage (AC: 9)
  - [x] Create `packages/core/src/generator/template.test.ts` with:
    - [x] single reference replacement
    - [x] multiple reference replacement
    - [x] repeated reference replacement
    - [x] missing reference error message quality
    - [x] whitespace-tolerant placeholder parsing (`{{ firstName }}`)
  - [x] Extend `packages/core/src/generator/generator.test.ts` for template-enabled record generation scenarios.

- [x] BDD coverage (AC: 10)
  - [x] Create `packages/core/features/cross-field-templates.feature`.
  - [x] Add executable step definitions in `packages/core/features/step_definitions/cross-field-templates.steps.ts`.
  - [x] Add scenarios for:
    - [x] email template using first/last name
    - [x] multiple placeholders in one field
    - [x] missing referenced field produces actionable error
    - [x] deterministic output with fixed seed
  - [x] Update `packages/core/tests/run-cucumber.ts` feature wiring.

## Dev Notes

### Epic Context

Epic 6 enables cross-field templates and schema relationships. Story 6.1 introduces template evaluation primitives that Story 6.2 (dependency order resolver) and Story 6.3 (schema relationships) will build on.

### Developer Context Section

This story must **not reinvent analyzer dependency/validation behavior** already present in the codebase.

Current code intelligence:
- `packages/core/src/analyzer/analyzer.ts` already validates template references and emits:
  - `analyzer.undefinedTemplateField`
  - `analyzer.circularDependency`
- `packages/core/src/analyzer/types.ts` already carries `templateReferences` metadata.
- `packages/core/src/generator/generator.ts` currently generates fields directly and does not yet evaluate template parameters against current record context.

Implementation intent for 6.1:
- Add a focused template evaluator module and invoke it from generator flow.
- Keep semantic checks in analyzer; keep rendering/substitution in generator.
- Avoid broad parser or analyzer redesign in this story.

### Technical Requirements

- Template parsing pattern: support `{{fieldName}}` and `{{ fieldName }}`.
- Context lookup source: current in-progress record object during `generateRecord`.
- Error style: field-specific message with missing key and template snippet context.
- Determinism: template evaluation itself introduces no randomness.
- Backward compatibility: non-template generation must remain unchanged.

### Architecture Compliance

- Follow `camelCase.ts` naming.
- Co-locate tests next to source.
- Keep exports through `index.ts` only.
- Preserve strict TypeScript and ESM conventions.
- Do not add external template libraries; use in-repo implementation.
- Keep changes scoped to Story 6.1; defer general topological ordering complexity to Story 6.2.

### Library / Framework Requirements

- Runtime: Bun 1.x
- Language: TypeScript 5.x (strict)
- Testing: Bun unit tests + Cucumber/Serenity Screenplay BDD
- No new dependency additions expected.

### File Structure Requirements

Expected file touch list:
- `packages/core/src/generator/template.ts` (new)
- `packages/core/src/generator/template.test.ts` (new)
- `packages/core/src/generator/generator.ts` (update)
- `packages/core/src/generator/generator.test.ts` (update)
- `packages/core/src/generator/index.ts` (update)
- `packages/core/features/cross-field-templates.feature` (new)
- `packages/core/features/step_definitions/cross-field-templates.steps.ts` (new)
- `packages/core/tests/run-cucumber.ts` (update)

### Testing Requirements

Unit testing:
- Positive substitution behavior (single/multiple/repeated placeholders)
- Missing placeholder behavior with actionable errors
- Integration test at generator level where template field is resolved from previously generated fields

BDD testing:
- Real schema scenario with template-based email
- Failure scenario for undefined field reference
- Deterministic scenario confirming stable output for same seed

Regression protection:
- Existing analyzer tests for template reference validation and circular dependency must remain passing.
- Existing generator tests for Epic 5 generators must remain passing.

### Latest Tech Information

No external API/library upgrade is required for Story 6.1. Current architecture and project constraints support a native TypeScript implementation for template substitution.

### Project Context Reference

Follow project-critical rules from `_bmad-output/planning-artifacts/project-context.md`:
- Bun-first commands and workflows
- strict TypeScript
- no Faker dependency
- module export boundaries
- dual testing approach (unit + BDD)

### Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-cross-field-templates-relationships.md]
- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]
- [Source: _bmad-output/planning-artifacts/project-context.md]
- [Source: packages/core/src/analyzer/analyzer.ts]
- [Source: packages/core/src/generator/generator.ts]
- [Source: packages/core/src/generator/index.ts]

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `runTests` (focused): `packages/core/src/generator/template.test.ts`, `packages/core/src/generator/generator.test.ts` → passing.
- `runTests` (full regression): `513 passed, 0 failed`.

### Implementation Plan

- Kept semantic template validation in analyzer unchanged and implemented runtime substitution strictly in generator layer.
- Added `evaluateTemplate` for placeholder substitution and predictable scalar conversion.
- Applied recursive template substitution to generator parameters so nested literals (e.g., `pick(array=["{{firstName}}"]`) resolve from current record context.
- Preserved existing generator behavior and deterministic seeded output.

### Completion Notes List

- ✅ Implemented `evaluateTemplate(template, context)` with `{{field}}` and `{{ field }}` support plus helpful missing-reference errors.
- ✅ Integrated template resolution into `generateRecord` parameter extraction using in-progress record context.
- ✅ Reused analyzer template validation path without duplicate generator-layer semantic validation.
- ✅ Added unit coverage for template evaluator and generator integration/error propagation.
- ✅ Added BDD feature + step definitions for cross-field templates and wired feature in cucumber runner.
- ✅ Ran full regression suite successfully (`513` passing tests).

### File List

- `_bmad-output/implementation-artifacts/6-1-template-engine-for-cross-field-references.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/core/src/generator/template.ts`
- `packages/core/src/generator/template.test.ts`
- `packages/core/src/generator/generator.ts`
- `packages/core/src/generator/generator.test.ts`
- `packages/core/src/generator/index.ts`
- `packages/core/features/cross-field-templates.feature`
- `packages/core/features/step_definitions/cross-field-templates.steps.ts`
- `packages/core/tests/run-cucumber.ts`

### Change Log

- 2026-02-17: Implemented Story 6.1 template engine support, integrated generator runtime substitution, added unit/BDD coverage, and validated full regression suite.
