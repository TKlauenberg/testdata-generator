# Epic 7: Uniqueness Constraints

QA testers can enforce uniqueness rules to ensure realistic test data without duplicates.

## Story 7.1: Uniqueness Constraint Tracker

As a **developer**,
I want **to track generated values for uniqueness enforcement**,
So that **duplicate values can be detected and prevented**.

**Acceptance Criteria:**

**Given** I need to enforce uniqueness constraints
**When** I implement the uniqueness tracker in `packages/core/src/generator/uniqueness.ts`
**Then** a `UniquenessTracker` class exists with `track(field: string, value: any): boolean` method
**And** the tracker maintains a Set of seen values per field
**And** `track()` returns true if value is unique, false if duplicate
**And** the tracker supports single-field uniqueness tracking
**And** the tracker supports composite uniqueness (multiple fields as tuple)
**And** the tracker uses efficient data structures (Set for O(1) lookups)
**And** the tracker is cleared between generation sessions
**And** unit tests verify duplicate detection for single and composite keys
**And** memory usage is tracked for large datasets

## Story 7.2: Single Field Uniqueness Enforcement

As a **QA tester**,
I want **to mark fields as unique**,
So that **generated values don't have duplicates**.

**Acceptance Criteria:**

**Given** I need unique field values
**When** I implement single-field uniqueness in the generator
**And** the DSL supports `unique` keyword after field definition
**Then** the semantic analyzer validates uniqueness constraints during analysis
**And** the generator uses UniquenessTracker to detect duplicates
**And** on duplicate detection, the generator retries with new value (up to 100 attempts)
**And** if uniqueness cannot be satisfied, generation fails with clear error
**And** error message indicates which field violated uniqueness and suggests increasing variety
**And** uniqueness tracking is reset for each generation session
**And** unit tests verify uniqueness enforcement and retry logic
**And** Gherkin tests verify unique fields in real schemas don't produce duplicates

## Story 7.3: Composite Uniqueness Constraints

As a **QA tester**,
I want **to enforce uniqueness across multiple fields together**,
So that **I can model composite keys like email+tenantId**.

**Acceptance Criteria:**

**Given** I need composite key uniqueness
**When** I implement composite uniqueness syntax
**And** the DSL supports `unique(field1, field2, ...)` at schema level
**Then** the semantic analyzer validates all fields in composite constraint exist
**And** the generator tracks combinations of field values as tuples
**And** duplicate combinations are detected even if individual fields have duplicates
**And** the generator retries generation for any field in the composite when duplicate detected
**And** composite uniqueness works with up to 5 fields in the constraint
**And** unit tests verify composite uniqueness with 2-field and 3-field combinations
**And** Gherkin tests verify realistic composite key scenarios (email+tenantId, userId+resourceId)

---
