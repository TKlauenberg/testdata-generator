# Epic 10: Multi-Format Output & Programmatic API

QA testers can generate test data in their required format (JSON, CSV, SQL) and developers can integrate generation into test scripts.

## Story 10.1: CSV Output Adapter

As a **QA tester**,
I want **to generate test data as CSV files**,
So that **I can import data into spreadsheets and databases**.

**Acceptance Criteria:**

**Given** I need CSV format output
**When** I implement CSV adapter in `packages/core/src/adapters/csvAdapter.ts`
**Then** a `CsvAdapter` class exists implementing the adapter interface
**And** the adapter consumes `AsyncIterable<Record>` from generator
**And** the adapter writes CSV headers from record field names
**And** the adapter properly escapes values containing commas, quotes, or newlines
**And** the adapter supports configurable delimiter (default: comma)
**And** the adapter writes incrementally for memory efficiency
**And** nested objects are serialized as JSON strings in CSV cells
**And** the module exports through `packages/core/src/adapters/index.ts`
**And** unit tests verify CSV formatting and escaping
**And** Gherkin tests verify CSV output can be re-imported correctly

## Story 10.2: SQL Output Adapter

As a **QA tester**,
I want **to generate SQL INSERT statements**,
So that **I can seed databases with test data**.

**Acceptance Criteria:**

**Given** I need SQL format output
**When** I implement SQL adapter in `packages/core/src/adapters/sqlAdapter.ts`
**Then** a `SqlAdapter` class exists implementing the adapter interface
**And** the adapter generates INSERT statements for each record
**And** the adapter properly escapes string values to prevent SQL injection (NFR5)
**And** the adapter handles NULL values correctly
**And** the adapter supports configurable table name
**And** the adapter batches multiple records per INSERT (configurable batch size)
**And** the adapter supports both MySQL and PostgreSQL syntax
**And** the module exports through `packages/core/src/adapters/index.ts`
**And** unit tests verify SQL generation and escaping
**And** Gherkin tests verify generated SQL can execute successfully

## Story 10.3: CLI Multi-Format Support

As a **QA tester**,
I want **to specify output format in the CLI**,
So that **I can generate data in the format I need**.

**Acceptance Criteria:**

**Given** I want different output formats
**When** I enhance the `td generate` command
**Then** `--format json` generates JSON output (default)
**And** `--format csv` generates CSV output
**And** `--format sql` generates SQL INSERT statements
**And** the CLI selects the appropriate adapter based on format flag
**And** the CLI passes format-specific options (e.g., table name for SQL)
**And** output format can be inferred from output file extension
**And** all formats support both file output and stdout
**And** Gherkin tests verify all three formats generate correctly from CLI

## Story 10.4: Programmatic API for Test Integration

As a **test automation developer**,
I want **to generate test data programmatically in my test scripts**,
So that **I can create data on-demand during test execution**.

**Acceptance Criteria:**

**Given** I need to generate data in automated tests
**When** I use the core library API
**Then** the core library can be imported as `import { generateData } from '@testdata-ai/core'`
**And** `generateData()` accepts inline DSL schema as string
**And** `generateData()` returns `AsyncIterable<Record>` for streaming
**And** the API supports all generation options (count, seed, format)
**And** generated records can be consumed with `for await` loop
**And** the API handles errors gracefully with typed Result return
**And** TypeScript types are exported for all public APIs
**And** comprehensive API documentation with code examples exists
**And** example test scripts demonstrate integration with popular frameworks
**And** Gherkin tests verify programmatic usage scenarios

---
