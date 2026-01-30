# Epic 6: Cross-Field Templates & Relationships

QA testers can define realistic relationships between fields and generate related entities.

## Story 6.1: Template Engine for Cross-Field References

As a **QA tester**,
I want **to create field values that reference other fields in the same record**,
So that **I can generate realistic related data like email from first and last name**.

**Acceptance Criteria:**

**Given** I have fields that depend on other fields
**When** I implement the template engine in `packages/core/src/generator/template.ts`
**Then** a `evaluateTemplate(template: string, context: Record): string` function exists
**And** templates use `{{fieldName}}` syntax for field references
**And** the engine resolves field references from the current record
**And** the engine validates all referenced fields exist during semantic analysis
**And** the engine evaluates templates after all dependent fields are generated
**And** templates support multiple references: `{{firstName}}.{{lastName}}@test.com`
**And** template evaluation errors include helpful messages
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify template parsing and evaluation
**And** Gherkin tests verify cross-field templates in real schemas

## Story 6.2: Field Generation Order Resolver

As a **developer**,
I want **to generate fields in dependency order**,
So that **template fields can reference already-generated fields**.

**Acceptance Criteria:**

**Given** I have a schema with template dependencies
**When** I implement dependency resolution in `packages/core/src/generator/generator.ts`
**Then** the generator analyzes field dependencies before generation
**And** fields are generated in topological order (dependencies first)
**And** circular dependencies are detected and reported during semantic analysis
**And** independent fields can be generated in any order
**And** the resolver handles multiple dependency chains correctly
**And** error messages indicate which fields have circular dependencies
**And** unit tests verify correct ordering for various dependency patterns
**And** Gherkin tests verify complex dependency scenarios work correctly

## Story 6.3: Schema Relationship Support

As a **QA tester**,
I want **to generate related entities using schema references**,
So that **I can create realistic datasets with foreign key relationships**.

**Acceptance Criteria:**

**Given** I need to generate related entities
**When** I implement schema relationships in the generator
**Then** field syntax `@schema:SchemaName` generates a new related record
**And** the referenced schema is validated to exist during semantic analysis
**And** related records are generated inline using the same RNG for determinism
**And** related records follow the referenced schema's structure
**And** nested relationships are supported (schema references within schema references)
**And** the generator tracks generation depth to prevent infinite recursion
**And** maximum nesting depth is configurable (default: 5 levels)
**And** unit tests verify related record generation
**And** Gherkin tests verify one-to-many and many-to-one relationships

---
