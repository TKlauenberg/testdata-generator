# Epic 8: Context Management

QA testers can load existing data and reference it in new generations, enabling realistic test scenarios with dependencies.

## Story 8.1: JSON Context Loader

As a **QA tester**,
I want **to load existing JSON data as context**,
So that **I can reference real data in my test data generation**.

**Acceptance Criteria:**

**Given** I have existing data in JSON format
**When** I implement JSON loader in `packages/core/src/context/loaders/jsonLoader.ts`
**Then** a `loadJsonContext(filePath: string): Promise<ContextData>` function exists
**And** the loader reads JSON files from the file system
**And** the loader supports both single object and array formats
**And** the loader validates JSON structure is valid
**And** the loader handles large JSON files efficiently (streaming if needed)
**And** the loader returns structured ContextData with metadata
**And** the loader reports clear errors for invalid JSON or missing files
**And** the module exports through `packages/core/src/context/index.ts`
**And** unit tests verify JSON parsing and error handling
**And** Gherkin tests verify loading real JSON context files

## Story 8.2: CSV Context Loader

As a **QA tester**,
I want **to load existing CSV data as context**,
So that **I can use database exports in my test scenarios**.

**Acceptance Criteria:**

**Given** I have existing data in CSV format
**When** I implement CSV loader in `packages/core/src/context/loaders/csvLoader.ts`
**Then** a `loadCsvContext(filePath: string): Promise<ContextData>` function exists
**And** the loader reads CSV files with headers
**And** the loader parses CSV data into array of objects
**And** the loader handles quoted fields and escaped commas
**And** the loader infers data types from values (numbers, booleans, strings)
**And** the loader handles large CSV files efficiently (streaming)
**And** the loader reports clear errors for malformed CSV
**And** the module exports through `packages/core/src/context/index.ts`
**And** unit tests verify CSV parsing with various formats
**And** Gherkin tests verify loading database export CSV files

## Story 8.3: Context Reference Syntax and Resolution

As a **QA tester**,
I want **to reference context data in my schemas**,
So that **generated data can use existing values**.

**Acceptance Criteria:**

**Given** I have loaded context data
**When** I implement context references in the generator
**And** the DSL supports `@context.collectionName.random` syntax
**Then** the semantic analyzer validates context references during analysis
**And** `@context.users.random` selects a random item from users context collection
**And** `@context.users[0]` accesses specific item by index
**And** `@context.users.random.fieldName` accesses specific field from random item
**And** the generator resolves context references during record generation
**And** context references use RNG for deterministic selection
**And** missing context collections result in clear error messages
**And** unit tests verify context reference resolution
**And** Gherkin tests verify schemas using context references generate correctly

## Story 8.4: Context Tagging and Filtered Selection

As a **QA tester**,
I want **to tag context data and select by tags**,
So that **I can organize context by environment or region**.

**Acceptance Criteria:**

**Given** I need to organize context by categories
**When** I implement context tagging in `packages/core/src/context/contextManager.ts`
**Then** context can be loaded with tags: `loadContext(path, tags: string[])`
**And** DSL syntax `@context.users@staging.random` selects from tagged context
**And** multiple tags can be combined with AND logic: `@staging AND @region-us`
**And** the context manager filters collections by tags before selection
**And** tag matching is case-insensitive
**And** untagged context is accessible without tag filters
**And** unit tests verify tag filtering logic
**And** Gherkin tests verify tag-based context selection in real scenarios

## Story 8.5: Save Generated Data as Context

As a **QA tester**,
I want **to save generated data as context for future generations**,
So that **I can build incremental test scenarios**.

**Acceptance Criteria:**

**Given** I have generated test data
**When** I implement context saving in `packages/core/src/context/contextManager.ts`
**Then** a `saveAsContext(records: Record[], name: string, tags?: string[]): Promise<void>` function exists
**And** generated data is saved in JSON format with metadata
**And** metadata includes: generation timestamp, source pattern, version, tags
**And** saved context can be loaded in subsequent generations
**And** the CLI supports `--save-context <name>` flag for td generate command
**And** context files are stored in configurable directory (default: `./contexts/`)
**And** unit tests verify context save and load roundtrip
**And** Gherkin tests verify end-to-end workflow: generate → save → reference in new generation

---
