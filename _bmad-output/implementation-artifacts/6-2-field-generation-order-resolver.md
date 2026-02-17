# Story 6.2: Field Generation Order Resolver

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **fields to be generated in dependency order**,
so that **template fields can reference already-generated fields regardless of their declaration order in the schema**.

## Acceptance Criteria

1. The generator analyzes field dependencies (via `ValidatedField.templateReferences`) before generating any values.
2. Fields are generated in topological order: if field B references field A, then A is generated first.
3. Circular dependencies (already detected by the analyzer at validation time) produce a clear runtime error if somehow encountered at generation time, indicating which fields are involved.
4. Independent fields (no `templateReferences`) can be generated in any stable order.
5. Multiple dependency chains within one schema are all resolved correctly.
6. A template field declared BEFORE its dependency in the DSL source still resolves successfully after 6.2 is implemented.
7. The existing test `'should throw a clear error when a template field is declared before its dependency (ordering issue)'` is updated: it must now assert SUCCESS (the record is generated correctly), not an error.
8. Unit tests verify correct field ordering for various dependency patterns (linear chain, fan-in, multiple independent chains).
9. Gherkin tests verify that complex dependency scenarios — including fields declared out-of-order — produce correct records.

## Tasks / Subtasks

- [ ] Implement `sortFieldsByDependency` helper (AC: 1, 2, 4, 5, 6)
  - [ ] Create function `sortFieldsByDependency(fields: readonly ValidatedField[]): readonly ValidatedField[]` inside `packages/core/src/generator/generator.ts` (or extract to a new `packages/core/src/generator/orderResolver.ts` if preferred for modularity).
  - [ ] Build an adjacency map from `field.templateReferences` (each ref string maps to the field with that name).
  - [ ] Perform Kahn's algorithm (BFS-based topological sort) or DFS post-order over the field dependency graph.
  - [ ] Fields with no dependencies sort first; remaining fields sort after their dependencies, preserving relative declaration order for independent fields (stable sort).
  - [ ] If a cycle is detected at runtime (guard against impossible state since analyzer enforces no cycles), throw a clear error listing the involved field names.

- [ ] Integrate order resolver into `generateRecord()` (AC: 2, 6)
  - [ ] In `generateRecord()` in `packages/core/src/generator/generator.ts`, call `sortFieldsByDependency(schema.fields)` to get the ordered field list.
  - [ ] Iterate the sorted list rather than `schema.fields` directly.
  - [ ] The `record` context object is still built incrementally in the sorted order, so template references are always resolved against already-generated fields.

- [ ] Update existing test that documented old broken behavior (AC: 7)
  - [ ] In `packages/core/src/generator/generator.test.ts`, locate the test `'should throw a clear error when a template field is declared before its dependency (ordering issue)'`.
  - [ ] Rewrite the assertion: the test schema has `email` (referencing `{{firstName}}`) declared before `firstName`. After 6.2, `generateRecord` MUST succeed and produce `{ email: 'Ada@test.com', firstName: 'Ada' }` (or equivalent).
  - [ ] Do NOT delete the test — repurpose it to prove the fix.

- [ ] Add focused unit tests for `sortFieldsByDependency` (AC: 4, 5, 8)
  - [ ] Linear chain: `C → B → A` → generation order must be `A, B, C`.
  - [ ] Fan-in: `C` references both `A` and `B` (independent of each other) → `A` and `B` generated before `C`.
  - [ ] Multiple independent chains: `[A → B]` and `[C → D]` in same schema → both chains resolve, any interleaving that satisfies deps is acceptable.
  - [ ] No-dependency schema: field order unchanged (stable, declaration order preserved).
  - [ ] Runtime cycle guard: manually construct a `ValidatedField[]` with a circular `templateReferences` chain and assert the thrown error message mentions the field names.

- [ ] Add BDD scenario: out-of-order dependency resolves correctly (AC: 6, 9)
  - [ ] Add a new scenario to `packages/core/features/cross-field-templates.feature`.
  - [ ] The scenario DSL schema declares `email` (using `{{firstName}}`) BEFORE `firstName`.
  - [ ] Assert the generated record contains the correctly resolved email value.
  - [ ] Add step definitions to `packages/core/features/step_definitions/cross-field-templates.steps.ts` if any new steps are needed (reuse existing steps if sufficient).

## Dev Notes

### Epic Context

Epic 6 enables cross-field templates and schema relationships. Story 6.1 introduced the template evaluation primitive (`evaluateTemplate`, `hasTemplateReferences` in `packages/core/src/generator/template.ts`) and wired it into `generateRecord()` via `resolveTemplateValue()`. Story 6.2 is the direct follow-on: it ensures the **field iteration order** within `generateRecord()` always satisfies template dependencies, making field declaration order in the DSL irrelevant to correct generation. Story 6.3 (schema relationships) builds on both.

### Critical: What Already Exists — Do Not Reinvent

The analyzer **already** provides everything the order resolver needs:

| Existing capability                                                                        | Location                                  |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `ValidatedField.templateReferences: readonly string[]` — field names each field depends on | `packages/core/src/analyzer/types.ts#L64` |
| `analyzer.circularDependency` error — circular dep detection at validate time              | `packages/core/src/analyzer/analyzer.ts`  |
| `getTemplateReferencesForField()` — recursive param scanner                                | `packages/core/src/analyzer/analyzer.ts`  |
| `buildDependencyGraph()` / `computeSortOrder()` for schema-level ordering                  | `packages/core/src/analyzer/analyzer.ts`  |

**Do NOT reimplement circular dependency detection in the analyzer.** The runtime guard in 6.2 is a defensive last-resort only; the analyzer is the canonical checker.

### Current Broken Behavior Being Fixed

`generateRecord()` in `packages/core/src/generator/generator.ts` iterates `schema.fields` in declaration order (line ~135). An existing test documents this limitation:

```typescript
// generator.test.ts ~L343
it('should throw a clear error when a template field is declared before its dependency (ordering issue)', () => {
  // email references {{firstName}} but is declared BEFORE firstName in field order.
  // Because generateRecord builds context incrementally, firstName is not yet in context
  // when email is processed, so evaluateTemplate must throw a missing-reference error.
  ...
  expect(() => generateRecord(schema, rng)).toThrow(/firstName/i);
});
```

**After 6.2, this test MUST be updated to assert the record generates successfully.** The comment is the most important clue — the fix is exactly "sort fields so dependencies come first."

### Implementation Guidance

**Recommended approach — Kahn's algorithm (BFS topological sort):**

```typescript
function sortFieldsByDependency(fields: readonly ValidatedField[]): readonly ValidatedField[] {
  // Build name → ValidatedField lookup
  const byName = new Map(fields.map((f) => [f.node.name, f]));

  // Build in-degree count and adjacency list (dependency → dependents)
  const inDegree = new Map(fields.map((f) => [f.node.name, 0]));
  const dependents = new Map(fields.map((f) => [f.node.name, [] as string[]]));

  for (const field of fields) {
    for (const dep of field.templateReferences) {
      inDegree.set(field.node.name, (inDegree.get(field.node.name) ?? 0) + 1);
      dependents.get(dep)?.push(field.node.name);
    }
  }

  // BFS: start with all zero-in-degree fields (in declaration order for stability)
  const queue: string[] = fields
    .filter((f) => inDegree.get(f.node.name) === 0)
    .map((f) => f.node.name);
  const sorted: ValidatedField[] = [];

  while (queue.length > 0) {
    const name = queue.shift()!;
    sorted.push(byName.get(name)!);
    for (const dep of (dependents.get(name) ?? [])) {
      const newDegree = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDegree);
      if (newDegree === 0) queue.push(dep);
    }
  }

  // Cycle guard (should never trigger if analyzer ran correctly)
  if (sorted.length !== fields.length) {
    const remaining = fields.filter((f) => !sorted.includes(f)).map((f) => f.node.name);
    throw new Error(
      `Circular field dependency detected among fields: ${remaining.join(', ')}`
    );
  }

  return sorted;
}
```

**File placement options (pick one):**
- Option A (simpler): Add `sortFieldsByDependency` as a private function inside `packages/core/src/generator/generator.ts`. No new file needed. Keeps it co-located with `generateRecord`.
- Option B (architecture-aligned): Create `packages/core/src/generator/orderResolver.ts` and export `sortFieldsByDependency` from it (not from `generator/index.ts` — internal use only). Mirror the `template.ts` precedent.

**Recommendation: Option A** unless the function grows significantly. The architecture doc lists `orderResolver.ts` as a possible future file, but it's not required by this story.

### Project Structure Notes

- New or modified files stay within `packages/core/src/generator/`.
- Test files are co-located (`*.test.ts` next to implementation, same directory).
- BDD files live in `packages/core/features/` (`.feature`) and `packages/core/features/step_definitions/` (step definitions).
- Do NOT add exports from `packages/core/src/generator/index.ts` for `sortFieldsByDependency` — it is an internal implementation detail.
- If `orderResolver.ts` is created, add a re-export only if it needs to be tested directly with imports; otherwise keep it internal.

### Testing Standards

- Unit tests use **Bun's built-in test runner** (`import { describe, it, expect } from 'bun:test'`). No Jest, no Vitest.
- BDD tests use **Cucumber.js** with Screenplay pattern (see `packages/core/features/support/` and existing step definitions in `packages/core/features/step_definitions/`).
- Test helper `createMockSchema()` in `generator.test.ts` is the standard way to build `ValidatedSchema` objects for unit tests. Use it — do not create a new helper.
- The `createMockSchema` helper currently sets `templateReferences: []` for all fields. For Story 6.2 tests, you will need to set `templateReferences` to the actual referenced field names. Extend the helper or override fields after creation (as done in existing tests at line ~289).

### Key File Locations

| File                                                                     | Role                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `packages/core/src/generator/generator.ts`                               | Main change: add `sortFieldsByDependency`, call it in `generateRecord()` |
| `packages/core/src/generator/generator.test.ts`                          | Update existing ordering test + add new unit tests                       |
| `packages/core/src/generator/template.ts`                                | Read-only — no changes needed                                            |
| `packages/core/src/analyzer/types.ts`                                    | Read-only — `ValidatedField.templateReferences` is the input             |
| `packages/core/features/cross-field-templates.feature`                   | Add new out-of-order BDD scenario                                        |
| `packages/core/features/step_definitions/cross-field-templates.steps.ts` | Add steps if needed (likely reuse existing)                              |

### References

- `ValidatedField.templateReferences` definition: [packages/core/src/analyzer/types.ts](packages/core/src/analyzer/types.ts#L64)
- `generateRecord()` current implementation: [packages/core/src/generator/generator.ts](packages/core/src/generator/generator.ts#L121)
- Existing ordering test (to be updated): [packages/core/src/generator/generator.test.ts](packages/core/src/generator/generator.test.ts#L343)
- `createMockSchema` helper: [packages/core/src/generator/generator.test.ts](packages/core/src/generator/generator.test.ts#L1)
- Circular dependency detection (analyzer, do not duplicate): [packages/core/src/analyzer/analyzer.ts](packages/core/src/analyzer/analyzer.ts#L107)
- BDD step definitions for cross-field templates: [packages/core/features/step_definitions/cross-field-templates.steps.ts](packages/core/features/step_definitions/cross-field-templates.steps.ts)
- Story 6.1 implementation (predecessor context): [_bmad-output/implementation-artifacts/6-1-template-engine-for-cross-field-references.md](_bmad-output/implementation-artifacts/6-1-template-engine-for-cross-field-references.md)
- Architecture patterns: [_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md](_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- Foundation patterns (RNG determinism, streaming): [docs/foundation-patterns.md](docs/foundation-patterns.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

### Completion Notes List

### File List

