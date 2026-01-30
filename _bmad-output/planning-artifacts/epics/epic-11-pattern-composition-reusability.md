# Epic 11: Pattern Composition & Reusability

QA testers can build complex patterns from reusable components and share them across the team.

## Story 11.1: DSL Import Statement Support

As a **QA tester**,
I want **to import reusable schema definitions**,
So that **I don't duplicate common patterns**.

**Acceptance Criteria:**

**Given** I have reusable schema components
**When** I implement import syntax in the parser
**And** the DSL supports `@import "path/to/schema.td"` at file top
**Then** the parser resolves import paths relative to current file
**And** imported schemas are parsed and included in the program
**And** imported symbols (schemas, profiles) are available in current file
**And** circular imports are detected and reported as errors
**And** import paths can use both relative (`./common.td`) and workspace (`@workspace/common.td`) syntax
**And** the semantic analyzer validates all imported symbols
**And** unit tests verify import resolution and circular detection
**And** Gherkin tests verify real import scenarios with file system

## Story 11.2: Shared Generator Definitions

As a **QA team**,
I want **to define custom generators that are shared across the team**,
So that **we have consistent test data patterns**.

**Acceptance Criteria:**

**Given** I need team-specific generators
**When** I implement shared generator references
**And** workspace config can define generator mappings
**Then** `@workspace.generators.customEmail` references workspace-defined generator
**And** workspace config specifies generator as template or composition
**And** generators can compose multiple built-in generators
**And** generator definitions are validated during config loading
**And** undefined generator references result in clear error messages
**And** unit tests verify workspace generator resolution
**And** Gherkin tests verify custom generators work in real schemas

## Story 11.3: Schema Composition and Extension

As a **QA tester**,
I want **to extend existing schemas with additional fields**,
So that **I can reuse base schemas with variations**.

**Acceptance Criteria:**

**Given** I have a base schema to extend
**When** I implement schema extension syntax
**And** the DSL supports `schema ExtendedUser extends User { ... }` syntax
**Then** the parser recognizes extends keyword
**And** extended schema inherits all fields from base schema
**And** extended schema can add new fields
**And** extended schema can override field definitions from base
**And** the semantic analyzer validates base schema exists
**And** extension creates a new independent schema (not modifying base)
**And** unit tests verify field inheritance and override behavior
**And** Gherkin tests verify extended schemas generate correctly

## Story 11.4: Reference Validation and Type Safety

As a **QA tester**,
I want **validation to catch broken references early**,
So that **I don't discover errors during generation**.

**Acceptance Criteria:**

**Given** I use imports, extensions, and references
**When** the semantic analyzer validates references
**Then** all @import paths are validated to exist
**And** all schema references (`@schema:Name`) are validated
**And** all context references (`@context.collection`) are validated
**And** all template field references (`{{fieldName}}`) are validated
**And** all workspace generator references are validated
**And** broken references report the location and suggest alternatives
**And** "Did you mean X?" suggestions for typos use fuzzy matching
**And** validation catches all reference errors before generation starts (FR29)
**And** unit tests verify reference validation for all reference types
**And** Gherkin tests verify helpful error messages for broken references

---
