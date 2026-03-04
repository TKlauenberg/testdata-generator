# Story 7.3: Composite Uniqueness Constraints

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to enforce uniqueness across multiple fields together**,
so that **I can model composite keys like email+tenantId**.

## Acceptance Criteria

1. The DSL supports `unique(field1, field2, ...)` syntax at schema level (inside the schema body `{}`).
2. The semantic analyzer validates that all fields named in a composite constraint exist in the schema.
3. The semantic analyzer enforces arity: each composite constraint must reference 2–5 fields.
4. The generator tracks combinations of field values as tuples, detecting duplicates even when individual field values are not individually unique.
5. When a composite duplicate is detected, the generator retries record generation (all composite-constrained fields in a new attempt) up to 100 attempts.
6. If uniqueness cannot be satisfied within the retry budget, generation fails with a clear error naming the composite constraint (schema-qualified field list).
7. Composite uniqueness works with 2-field and 3-field constraints (and up to 5 fields per AC).
8. Composite tracking resets between generation sessions (inherits from shared `UniquenessTracker.clear()` called by `generate()`).
9. Unit tests verify 2-field and 3-field composite uniqueness success, retry path, exhaustion failure.
10. Gherkin/BDD tests verify realistic composite key scenarios (email+tenantId, userId+resourceId).

## Tasks / Subtasks

- [x] Extend AST to represent schema-level composite uniqueness directives (AC: 1)
  - [x] Add `readonly compositeUniques?: readonly (readonly string[])[]` to `SchemaNode` in `packages/core/src/parser/ast.ts`.
  - [x] Update JSDoc on `SchemaNode` with example showing the new field.

- [x] Extend parser to parse `unique(field1, field2, ...)` inside the schema body (AC: 1)
  - [x] In `_parseSchemaDeclaration` field loop (`while !}` block in `parser.ts`), before calling `_parseFieldDeclaration`, check for `keyword: 'unique'` AND `_peek()` is `operator: '('`. If matched, call a new `_parseCompositeUniqueDirective()` instead.
  - [x] Implement `_parseCompositeUniqueDirective(): Result<readonly string[], Diagnostic[]>`:
    - Consume `unique` keyword.
    - Consume `(`.
    - Parse comma-separated identifiers (2 or more; enforce ≥2 at parse time with a clear error).
    - Consume `)`.
    - Return the list of field name strings.
  - [x] Collect parsed composite directives in a local `compositeUniques: string[][]` array and include in the returned `SchemaNode`.
  - [x] Handle parse errors gracefully: skip to `}` (via `_synchronizeToNextField`) and continue collecting remaining fields/directives.

- [x] Add analyzer validation for composite uniqueness constraints (AC: 2, 3)
  - [x] Add `readonly compositeUniques: readonly (readonly string[])[]` to `ValidatedSchema` in `packages/core/src/analyzer/types.ts`.
  - [x] In `analyzer.ts`, add a new `validateCompositeUniqueConstraints(schema: SchemaNode, fieldNames: Set<string>): Result<void, Diagnostic[]>` function that:
    - For each composite constraint, validates arity (2–5 fields) → diagnostic code `analyzer.compositeUniqueArity`.
    - For each composite constraint, validates all named fields exist in the schema → diagnostic code `analyzer.compositeUniqueFieldNotFound`.
    - Validates no duplicate field names within a single constraint → diagnostic code `analyzer.compositeUniqueDuplicateField`.
  - [x] Call this validation inside `analyzeSchema()` alongside existing `validateUniqueConstraints()`.
  - [x] Propagate `compositeUniques: schema.node.compositeUniques ?? []` into the returned `ValidatedSchema`.

- [x] Integrate composite uniqueness enforcement in the generator (AC: 4, 5, 6, 8)
  - [x] In `generate()` in `packages/core/src/generator/generator.ts`, after each `generateRecord()` call, for each composite constraint in `validatedSchema.compositeUniques`:
    - Extract the field values from the generated record for the composite fields.
    - Call `sessionContext.uniquenessTracker.trackComposite(fields, values)`.
    - If `trackComposite` returns `false`, the record is rejected → break inner constraint loop and retry.
  - [x] Wrap the single `generateRecord()` call in a per-record retry loop (up to `MAX_UNIQUENESS_ATTEMPTS = 100` attempts). On each retry, call `generateRecord()` again (the existing per-field uniqueness enforcement inside `generateRecord` ensures single-field constraints still hold).
  - [x] On retry exhaustion: throw with a schema-qualified error message, e.g.:
    `Composite uniqueness constraint (User.email, User.tenantId) failed after 100 attempts. Increase generator variety (wider ranges/options) or relax uniqueness constraints.`
  - [x] Composite uniqueness reset relies on the existing `UniquenessTracker.clear()` inside `generate()` session context — no additional changes needed.

- [x] Add unit tests for all new behaviors (AC: 9)
  - [x] **Parser tests** (`packages/core/src/parser/parser.test.ts`): verify `unique(f1, f2)` inside schema body parses to `compositeUniques: [['f1', 'f2']]`; verify multi-directive schemas; verify parse errors for arity < 2.
  - [x] **Analyzer tests** (`packages/core/src/analyzer/analyzer.test.ts`): verify valid 2-field and 3-field composites pass; verify non-existent field names emit `analyzer.compositeUniqueFieldNotFound`; verify arity > 5 emits `analyzer.compositeUniqueArity`; verify arity < 2 emits `analyzer.compositeUniqueArity` (or rejected at parse time).
  - [x] **Generator tests** (`packages/core/src/generator/generator.test.ts`):
    - 2-field composite uniqueness: generate N records, assert no duplicate (email, tenantId) combinations.
    - 3-field composite uniqueness: generate N records, assert no duplicate (userId, resourceId, action) combinations.
    - Retry path: use a constrained generator where collision is guaranteed within first few attempts, assert eventual success.
    - Exhaustion failure: use a generator where composite can never be unique, assert error message is schema-qualified and mentions both field names and retry count.
    - Session reset: two separate `generate()` calls on the same schema; assert composite combinations can repeat across calls.

- [x] Add BDD scenarios for composite uniqueness (AC: 10)
  - [x] Extend `packages/core/features/uniqueness-constraints.feature` with:
    - Scenario: composite `email+tenantId` generates no duplicate pairs over 50 records.
    - Scenario: composite `userId+resourceId` generates no duplicate pairs over 30 records.
    - Scenario: composite uniqueness with exhaustible generator reports clear error with field list.
  - [x] Add/extend step definitions in `packages/core/features/step_definitions/uniqueness-constraints.steps.ts` for "composite" DSL source code and "composite uniqueness" generation/assertion steps.
  - [x] Reuse existing Screenplay `Ability` / `Tasks` / `Questions` pattern established in Stories 7.1 and 7.2.

## Dev Notes

### Story Foundation

- Story 7.1 delivered the `UniquenessTracker` primitive including `trackComposite(fields, values)` — **do not reimplement**.
- Story 7.2 wired single-field uniqueness into the analyzer and generator pipelines — **extend that pattern, do not replace it**.
- This story adds the **only new DSL syntax layer** in Epic 7: schema-level `unique(f1, f2, ...)` inside the schema body.

### Technical Requirements

- Runtime/tooling: Bun + strict TypeScript + ESM only. No new dependencies.
- Follow existing `Result<T, Diagnostic[]>` pattern for all validation returns.
- Reuse `MAX_UNIQUENESS_ATTEMPTS = 100` constant from `generator.ts` — do not introduce a second constant.
- Use `trackComposite()` from existing `UniquenessTracker`. The tracker already uses `stableSerialize` for reliable tuple hashing.

### Architecture Compliance

- **Scanner**: `unique` is already a registered keyword in `KEYWORD_VALUES` — **no scanner changes needed**.
- **AST**: Only `packages/core/src/parser/ast.ts` needs a new optional field on `SchemaNode`.
- **Parser**: Only `packages/core/src/parser/parser.ts` needs changes — add composite directive parsing inside `_parseSchemaDeclaration`.
- **Analyzer**: Only `packages/core/src/analyzer/analyzer.ts` and `packages/core/src/analyzer/types.ts` need changes.
- **Generator**: Only `packages/core/src/generator/generator.ts` needs changes — extend the `generate()` function's per-record loop.
- **CLI**: No CLI changes required for this story.
- Preserve pipeline separation: Parser → Analyzer → Generator. Composite constraint validation is the analyzer's responsibility; runtime enforcement is the generator's responsibility.

### DSL Syntax Design

```
schema User {
  email: string generator=email()
  tenantId: string generator=uuid()
  status: string generator=pick(array=["active", "inactive"])

  unique(email, tenantId)
}
```

- `unique(f1, f2)` appears **inside** the schema body `{}`, not after the closing `}`.
- Multiple composite constraints are allowed: `unique(a, b)` and `unique(c, d)` in the same schema body.
- All names in `unique(...)` must be regular identifiers (field names). They are NOT the `unique` keyword — they are identifier tokens.
- Distinguishing from field declarations: inside the schema body loop, the parser checks `keyword: 'unique'` + `_peek()` is `operator: '('`; if matched → composite directive, not a field.

### Parser Lookahead Pattern

The parser already has `_peek(offset = 1): Token` (line 118 of `parser.ts`). Use it:

```typescript
// Inside _parseSchemaDeclaration while-loop:
if (this._check('keyword', 'unique') && this._peek().kind === 'operator' && this._peek().value === '(') {
  const compositeResult = this._parseCompositeUniqueDirective();
  if (compositeResult.ok) {
    compositeUniques.push(compositeResult.value);
  } else {
    this._synchronizeToNextField();
  }
} else {
  const fieldResult = this._parseFieldDeclaration();
  // existing handling...
}
```

### Generator Composite Retry Strategy

The composite retry wraps the entire `generateRecord` call:

```typescript
// Inside generate() per-record loop:
let record: Record<string, unknown> | null = null;
for (let attempt = 1; attempt <= MAX_UNIQUENESS_ATTEMPTS; attempt++) {
  const candidate = generateRecord(schema, fields, rng, relationshipContext, sessionContext);
  const compositeOk = schema.compositeUniques.every((constraint) => {
    const constraintValues = constraint.map((fieldName) => candidate[fieldName]);
    return sessionContext.uniquenessTracker.trackComposite(constraint, constraintValues);
  });
  if (compositeOk) {
    record = candidate;
    break;
  }
}
if (record === null) {
  const constraintLabel = failingConstraint.map((f) => `${schemaName}.${f}`).join(', ');
  throw new Error(
    `Composite uniqueness constraint (${constraintLabel}) failed after ${MAX_UNIQUENESS_ATTEMPTS} attempts. ` +
    `Increase generator variety (wider ranges/options) or relax uniqueness constraints.`,
  );
}
records.push(record);
```

**Important**: When `generateRecord()` is called on a retry, additional single-field unique values are consumed from the tracker. This is intentional — it prevents infinite loops for fields that also have single-field uniqueness.

### Analyzer Diagnostic Codes

| Code                                     | When                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `analyzer.compositeUniqueArity`          | Fewer than 2 or more than 5 fields in a composite constraint          |
| `analyzer.compositeUniqueFieldNotFound`  | A named field in `unique(...)` does not exist in the schema           |
| `analyzer.compositeUniqueDuplicateField` | The same field name appears twice in a single `unique(...)` directive |

Follow the existing diagnostic shape from `analyzer.ts` (message, code, location from `field.location`, suggestion).

### File Structure Requirements

Expected touchpoints (only these — do not touch other layers):

- `packages/core/src/parser/ast.ts` — Add `compositeUniques` to `SchemaNode`
- `packages/core/src/parser/parser.ts` — Add `_parseCompositeUniqueDirective()`; extend `_parseSchemaDeclaration`
- `packages/core/src/parser/parser.test.ts` — Parser unit tests for composite syntax
- `packages/core/src/analyzer/types.ts` — Add `compositeUniques` to `ValidatedSchema`
- `packages/core/src/analyzer/analyzer.ts` — Add `validateCompositeUniqueConstraints()`; propagate to `ValidatedSchema`
- `packages/core/src/analyzer/analyzer.test.ts` — Analyzer unit tests for composite validation
- `packages/core/src/generator/generator.ts` — Add composite retry loop inside `generate()`
- `packages/core/src/generator/generator.test.ts` — Generator unit tests for composite enforcement
- `packages/core/features/uniqueness-constraints.feature` — New BDD composite scenarios
- `packages/core/features/step_definitions/uniqueness-constraints.steps.ts` — New step definitions for composite

### Testing Requirements

**Unit tests must prove:**
- Parser emits correct `compositeUniques` on `SchemaNode` for valid syntax.
- Parser emits diagnostic on `unique(oneFieldOnly)` (arity < 2) — or defer to analyzer (preferred: analyzer arity check, parser only validates structure).
- Analyzer rejects non-existent field names with `analyzer.compositeUniqueFieldNotFound`.
- Analyzer rejects arity > 5 with `analyzer.compositeUniqueArity`.
- Analyzer produces `ValidatedSchema.compositeUniques` populated for valid schemas.
- Generator: 2-field composite with `N` records produces no duplicate pair.
- Generator: 3-field composite with `N` records produces no duplicate triple.
- Generator: composite failure error is schema-qualified (e.g., `User.email, User.tenantId`).
- Generator: composite reset between `generate()` calls (two invocations; same combinations allowed in second call).

**BDD tests must prove:**
- `email + tenantId` composite generates unique pairs across 50 records.
- `userId + resourceId` composite generates unique pairs across 30 records.
- Unsatisfiable composite reports understandable error with field names.

### Previous Story Intelligence (7.2)

From Story 7.2:
- `ValidatedField.isUnique` and `analyzer.invalidUniqueConstraint` diagnostic are in place — do not modify single-field uniqueness logic.
- The `UniquenessTracker` instance lives on `sessionContext.uniquenessTracker`; composite tracking reuses this same instance (already has `trackComposite()` — no changes to `uniqueness.ts`).
- JSDoc warning added to `generateRecord` re: omitting `sessionContext` — extend this note to mention composite uniqueness is also disabled without `sessionContext`.
- Scoped error messages (e.g., `User.status`) were added in 7.2's code review fix M4 — use the same `schemaName.fieldName` format for composite errors.

From Story 7.1:
- `trackComposite` uses stable serialization and `Map<string, Set<string>>` — handles all edge-case value types (NaN, -0, Date, etc.).
- Do not bypass or duplicate the tracker's serialization logic.

### Git Intelligence Summary

Recent commits follow pattern: `create-story X.Y` → `dev-story X.Y` → `code-review X.Y`:
- `5abe190` create story 7.2
- `b92598d` dev story 7.2
- `324038a` code review 7.2

Continue this cadence. Run `bun test` (all ~592 tests) before marking `review`.

### Latest Technical Information

- Stack is pinned: Bun 1.x, TypeScript 5.x strict mode, ESM only.
- No new dependencies needed — `trackComposite()` is already in `uniqueness.ts`.
- `_peek()` already exists in parser (line 118) — no parser infrastructure work required.
- `_synchronizeToNextField()` may need updating to also skip over a `unique(...)` directive if it partially fails; verify behavior handles `unique(` without consuming field declaration tokens.

### Project Structure Notes

- This story touches both the parsing layer (new syntax) and the generator layer (new enforcement) — the widest scope change in Epic 7.
- The `unique` keyword is already in the scanner — no scanner.ts changes.
- `_synchronizeToNextField()` skips until it finds an `identifier` token that isn't `generator`. The new `unique(...)` uses a `keyword` token, so synchronization should not be confused into treating composite directives as field names. Verify this in tests.
- After this story, Epic 7 has only the optional retrospective remaining.

### References

- Source epic: [_bmad-output/planning-artifacts/epics/epic-7-uniqueness-constraints.md](_bmad-output/planning-artifacts/epics/epic-7-uniqueness-constraints.md)
- Prior story (7.2): [_bmad-output/implementation-artifacts/7-2-single-field-uniqueness-enforcement.md](_bmad-output/implementation-artifacts/7-2-single-field-uniqueness-enforcement.md)
- Prior story (7.1): [_bmad-output/implementation-artifacts/7-1-uniqueness-constraint-tracker.md](_bmad-output/implementation-artifacts/7-1-uniqueness-constraint-tracker.md)
- Sprint tracking: [_bmad-output/implementation-artifacts/sprint-status.yaml](_bmad-output/implementation-artifacts/sprint-status.yaml)
- UniquenessTracker source: [packages/core/src/generator/uniqueness.ts](packages/core/src/generator/uniqueness.ts)
- Generator source: [packages/core/src/generator/generator.ts](packages/core/src/generator/generator.ts)
- Analyzer types: [packages/core/src/analyzer/types.ts](packages/core/src/analyzer/types.ts)
- Analyzer source: [packages/core/src/analyzer/analyzer.ts](packages/core/src/analyzer/analyzer.ts)
- Parser source: [packages/core/src/parser/parser.ts](packages/core/src/parser/parser.ts)
- AST source: [packages/core/src/parser/ast.ts](packages/core/src/parser/ast.ts)
- BDD feature: [packages/core/features/uniqueness-constraints.feature](packages/core/features/uniqueness-constraints.feature)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `runTests` targeted: `parser.test.ts`, `analyzer.test.ts`, `generator.test.ts` → 104 passed, 0 failed
- `runTests` full suite: 627 passed, 0 failed

### Completion Notes List

- Implemented schema-level composite uniqueness syntax parsing: `unique(field1, field2, ...)` within schema bodies.
- Added analyzer validations for composite arity (2–5), unknown fields, and duplicate names with new diagnostics.
- Extended validated schema metadata to carry `compositeUniques` into generation.
- Implemented generator-level composite uniqueness enforcement with retry loop up to `MAX_UNIQUENESS_ATTEMPTS` and schema-qualified exhaustion errors.
- Added parser/analyzer/generator unit tests and BDD feature/steps for 2-field + 3-field composite constraints, retry success, and exhaustion failure.

### File List

- _bmad-output/implementation-artifacts/7-3-composite-uniqueness-constraints.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- packages/core/src/parser/ast.ts
- packages/core/src/parser/parser.ts
- packages/core/src/parser/parser.test.ts
- packages/core/src/analyzer/types.ts
- packages/core/src/analyzer/analyzer.ts
- packages/core/src/analyzer/analyzer.test.ts
- packages/core/src/generator/generator.ts
- packages/core/src/generator/generator.test.ts
- packages/core/src/generator/uniqueness.ts
- packages/core/src/generator/uniqueness.test.ts
- packages/core/features/uniqueness-constraints.feature
- packages/core/features/step_definitions/uniqueness-constraints.steps.ts

### Senior Developer Review (AI)

**Reviewer:** Tobi (via code-review workflow) · **Date:** 2026-03-03

**Result:** ✅ APPROVED — 1 HIGH, 2 MEDIUM (all fixed)

**Fixes applied:**

- **H1 (HIGH)** — Fixed non-atomic composite uniqueness enforcement in `generate()`. Composite constraints are now treated atomically per candidate: if a later constraint fails, earlier successful `trackComposite(...)` reservations for that same candidate are rolled back via `untrackComposite(...)`.
- **M1 (MEDIUM)** — Story `File List` now reflects all changed files, including the story artifact and sprint tracking file.
- **M2 (MEDIUM)** — Strengthened BDD failure scenario assertion to require schema-qualified composite fields (`User.email,User.tenantId`) in the error message.

## Change Log

- 2026-02-20: Implemented composite uniqueness constraints end-to-end (parser, analyzer, generator, tests, BDD) and marked story ready for review.
- 2026-03-03: Code review fixes applied — atomic composite uniqueness rollback in generator, stronger composite failure BDD assertion, updated File List and review notes; story advanced to `done`.
