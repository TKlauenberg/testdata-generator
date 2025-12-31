---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - "docs/prd.md"
  - "docs/architecture.md"
project_name: "testdata-ai"
user_name: "Tobi"
date: "2025-12-30"
completedDate: "2025-12-31"
status: "complete"
totalEpics: 12
totalStories: 54
allFRsCovered: true
validationPassed: true
---

# testdata-ai - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for testdata-ai, decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Core Data Generation (FR1-FR5):**
- FR1: Schema definition with fields, types, and generators
- FR2: Configurable volume generation (10 to 1M+ records) with deterministic seeds
- FR3: Uniqueness constraints (single field and composite)
- FR4: Cross-field templates with `{{fieldName}}` references
- FR5: Relationships (generate new OR reference context)

**Context Management (FR6-FR9):**
- FR6: Load existing data as context (JSON, CSV, DB exports)
- FR7: Reference context data in patterns (`@context.users.random`)
- FR8: Tag-based context selection (`@staging AND @region-us`)
- FR9: Save generated data as context for future use

**Cascading Rules (FR10-FR13):**
- FR10: Global defaults across all projects
- FR11: Workspace defaults (team-shared via `.tdconfig.json`)
- FR12: Schema-level defaults override workspace
- FR13: Field-level overrides all defaults

**CLI Operations (FR14-FR17):**
- FR14: Generate test data via CLI (`td generate`)
- FR15: Validate DSL before generation (`td validate`)
- FR16: Initialize schemas from templates (`td init`)
- FR17: Clear, actionable error messages for non-programmers

**Pattern Sharing (FR18-FR21):**
- FR18: Save DSL patterns as text files (`.td` format)
- FR19: Share patterns via version control (Git-friendly)
- FR20: Discover and use patterns from team repository
- FR21: Compose patterns from reusable components

**Data Output (FR22-FR25):**
- FR22: Output in multiple formats (JSON, CSV, SQL)
- FR23: Generated data includes metadata (timestamp, source pattern, version)
- FR24: Programmatic API for test scripts integration
- FR25: Deterministic generation with seed values

**Validation (FR26-FR29):**
- FR26: DSL syntax validation during parsing
- FR27: Semantic correctness validation
- FR28: Uniqueness constraint violation prevention
- FR29: Context reference validation before generation

**Platform Foundations (FR30-FR31):**
- FR30: Metadata for future platform lift (pattern reference, parameters, version)
- FR31: Export generation history for audit trail

### Non-Functional Requirements

**Performance (NFR1-3):**
- NFR1: Generate 1000 records in <1 minute (~100-500 records/sec)
- NFR2: Validate DSL schemas in <1 second
- NFR3: Support 1M+ records without memory issues (streaming)

**Security (NFR4-5):**
- NFR4: No arbitrary code execution from DSL files
- NFR5: Safe context data loading without injection risks

**Usability (NFR6-8):**
- NFR6: DSL syntax readable by QA testers with minimal coding experience
- NFR7: Error messages actionable without developer assistance
- NFR8: Common use cases achievable in <30 minutes

**Maintainability (NFR9-10):**
- NFR9: DSL patterns remain valid across minor versions
- NFR10: Clear separation: DSL core, generators, adapters

**Extensibility (NFR11-12):**
- NFR11: Custom generators via plugins (without modifying core)
- NFR12: New output formats via adapter pattern

### Additional Requirements

**Starter Template/Project Initialization:**
- Architecture specifies Bun 1.x monorepo setup with packages/core and packages/cli
- Project structure must be initialized before DSL implementation
- TypeScript strict mode configuration required
- ESLint + Prettier configuration needed

**Technical Infrastructure:**
- Custom Xoshiro256** PRNG implementation (no Faker.js dependency)
- Result<T,E> type pattern for error handling
- AsyncIterable streaming for memory efficiency
- Discriminated union types for tokens and AST nodes
- Immutable AST with pure functions
- Co-located tests using Bun test runner

**Development Patterns:**
- camelCase.ts file naming convention
- `private _memberName` for all private members
- index.ts exports for all modules
- Rust-style error formatting for CLI

**Multi-Pass Compilation Pipeline:**
- Scanner (lexical analysis) → Parser (syntax analysis) → Analyzer (semantic validation) → Generator (data generation)
- Clear module boundaries with defined inputs/outputs

### FR Coverage Map

**Core Data Generation:**
- FR1: Epic 2 (basic schema parsing), Epic 5 (advanced generators)
- FR2: Epic 3 (configurable volume generation)
- FR3: Epic 7 (uniqueness constraints)
- FR4: Epic 6 (cross-field templates)
- FR5: Epic 6 (relationships)

**Context Management:**
- FR6: Epic 8 (load context)
- FR7: Epic 8 (reference context data)
- FR8: Epic 8 (tag-based context selection)
- FR9: Epic 8 (save generated as context)

**Cascading Rules:**
- FR10: Epic 9 (global defaults)
- FR11: Epic 9 (workspace defaults)
- FR12: Epic 9 (schema defaults)
- FR13: Epic 9 (field overrides)

**CLI Operations:**
- FR14: Epic 4 (generate command)
- FR15: Epic 4 (validate command)
- FR16: Epic 4 (init command)
- FR17: Epic 4 (error formatting)

**Pattern Sharing:**
- FR18: Epic 2 (text-based DSL)
- FR19: Epic 11 (version control friendly)
- FR20: Epic 11 (pattern discovery)
- FR21: Epic 11 (pattern composition)

**Data Output:**
- FR22: Epic 3 (JSON output), Epic 10 (CSV/SQL output)
- FR23: Epic 3 (metadata tracking)
- FR24: Epic 10 (programmatic API)
- FR25: Epic 3 (deterministic generation)

**Validation:**
- FR26: Epic 2 (DSL syntax validation)
- FR27: Epic 2 (semantic validation)
- FR28: Epic 7 (uniqueness enforcement)
- FR29: Epic 11 (reference validation)

**Platform Foundations:**
- FR30: Epic 12 (platform metadata)
- FR31: Epic 12 (generation history)

## Epic List

### Epic 1: Project Foundation & Development Setup
Development team can start building testdata-ai with proper monorepo structure, tooling, and core utilities in place.

**FRs covered:** Foundation for all other FRs (enables FR1-FR31)
**NFRs supported:** NFR9, NFR10 (maintainability, clear separation)
**Additional:** Bun monorepo setup, TypeScript strict mode, Result<T,E> pattern, project structure

### Epic 2: DSL Core - Parse and Validate Schemas
QA testers can write DSL schema files and get immediate validation feedback with clear error messages.

**FRs covered:** FR1 (schema definitions), FR18 (text-based DSL), FR26-FR27 (validation)
**NFRs supported:** NFR2 (validate in <1 sec), NFR4 (no code execution), NFR6-NFR7 (readable syntax, actionable errors)

### Epic 3: Basic Data Generation
QA testers can generate simple test data from validated schemas with primitive field types and basic generators.

**FRs covered:** FR2 (configurable volume generation), FR22 (JSON output), FR23 (metadata), FR25 (deterministic seeds)
**NFRs supported:** NFR1 (performance targets), NFR3 (streaming for large datasets)

### Epic 4: CLI Tool Interface
QA testers can use intuitive command-line commands to generate, validate, and initialize schemas without programmatic knowledge.

**FRs covered:** FR14 (generate command), FR15 (validate command), FR16 (init command), FR17 (error formatting)
**NFRs supported:** NFR6-NFR8 (usability for non-programmers)

### Epic 5: Advanced Field Generation
QA testers can generate realistic personal data, temporal patterns, and complex field types for authentic test scenarios.

**FRs covered:** FR1 (advanced generators - personal, temporal, identity types)
**NFRs supported:** NFR6 (readable syntax for complex patterns)

### Epic 6: Cross-Field Templates & Relationships
QA testers can define realistic relationships between fields and generate related entities.

**FRs covered:** FR4 (cross-field templates), FR5 (relationships)
**NFRs supported:** NFR6 (natural syntax for relationships)

### Epic 7: Uniqueness Constraints
QA testers can enforce uniqueness rules to ensure realistic test data without duplicates.

**FRs covered:** FR3 (uniqueness constraints - single and composite), FR28 (uniqueness enforcement)
**NFRs supported:** NFR1 (performance with constraint checking)

### Epic 8: Context Management
QA testers can load existing data and reference it in new generations, enabling realistic test scenarios with dependencies.

**FRs covered:** FR6 (load context), FR7 (reference context), FR8 (tag-based selection), FR9 (save as context)
**NFRs supported:** NFR5 (safe data loading)

### Epic 9: Cascading Configuration System
Teams can establish shared test data standards while individuals maintain flexibility for specific test scenarios.

**FRs covered:** FR10 (global defaults), FR11 (workspace defaults), FR12 (schema defaults), FR13 (field overrides)
**NFRs supported:** NFR10 (clear separation of concerns)

### Epic 10: Multi-Format Output & Programmatic API
QA testers can generate test data in their required format (JSON, CSV, SQL) and developers can integrate generation into test scripts.

**FRs covered:** FR22 (CSV/SQL output), FR24 (programmatic API)
**NFRs supported:** NFR12 (adapter pattern for extensibility)

### Epic 11: Pattern Composition & Reusability
QA testers can build complex patterns from reusable components and share them across the team.

**FRs covered:** FR19 (version control friendly), FR20 (pattern discovery), FR21 (pattern composition), FR29 (reference validation)
**NFRs supported:** NFR9 (backward compatibility)

### Epic 12: Platform-Ready Metadata & Audit Trail
Organizations can track test data generation history and prepare for future platform evolution.

**FRs covered:** FR30 (platform metadata), FR31 (generation history)
**NFRs supported:** NFR9 (version stability)

---

## Epic 1: Project Foundation & Development Setup

Development team can start building testdata-ai with proper monorepo structure, tooling, and core utilities in place.

### Story 1.1: Initialize Bun Monorepo with Core and CLI Packages

As a **developer**,
I want **a properly structured Bun monorepo with separate core library and CLI packages**,
So that **I can develop the library and CLI tool independently with clear separation of concerns**.

**Acceptance Criteria:**

**Given** I am setting up the testdata-ai project
**When** I initialize the monorepo structure
**Then** a `packages/core/` directory exists with `package.json`, `tsconfig.json`, and `src/` folder
**And** a `packages/cli/` directory exists with `package.json`, `tsconfig.json`, and `src/` folder
**And** the root `package.json` has `"workspaces": ["packages/*"]` configured
**And** TypeScript strict mode is enabled in all `tsconfig.json` files with `"strict": true`
**And** both packages use ESM modules with `"type": "module"`
**And** I can run `bun install` successfully at the root
**And** the directory structure matches the architecture specification

### Story 1.2: Common Utilities - Result Type Pattern

As a **developer**,
I want **a Result<T, E> type pattern for error handling**,
So that **I can handle expected errors explicitly without throwing exceptions**.

**Acceptance Criteria:**

**Given** I am implementing error handling for the DSL parser
**When** I create the Result type utilities in `packages/core/src/common/result.ts`
**Then** a discriminated union type `Result<T, E>` exists with `{ ok: true; value: T }` and `{ ok: false; errors: E }` variants
**And** helper functions `ok<T>(value: T): Result<T>` and `err<E>(errors: E): Result<never, E>` are exported
**And** TypeScript enforces exhaustive checking when consuming Result values
**And** the module exports through `packages/core/src/common/index.ts`
**And** unit tests verify both success and error cases with type safety
**And** example usage is documented in code comments

### Story 1.3: Common Utilities - Diagnostic System

As a **developer**,
I want **a comprehensive diagnostic system for error reporting**,
So that **I can provide clear, actionable error messages with source locations to users**.

**Acceptance Criteria:**

**Given** I need to report errors with file locations and helpful messages
**When** I implement the diagnostic system in `packages/core/src/common/diagnostic.ts`
**Then** a `Diagnostic` interface exists with `code`, `message`, `severity`, `location`, `suggestion`, and `related` fields
**And** a `SourceLocation` interface exists with `file`, `line`, `column`, and `length` fields
**And** diagnostic factory functions are provided for common error types
**And** error codes follow the `phase.errorType` naming convention (e.g., `scanner.unterminatedString`)
**And** the module exports through `packages/core/src/common/index.ts`
**And** unit tests verify diagnostic creation and formatting
**And** line and column numbers are 1-indexed as specified

### Story 1.4: Gherkin/BDD Testing Infrastructure

As a **developer**,
I want **Gherkin/BDD testing infrastructure integrated with Bun**,
So that **all subsequent tests can be written in readable Given/When/Then format that aligns with our acceptance criteria**.

**Acceptance Criteria:**

**Given** I need to write BDD-style tests for the project
**When** I set up the Gherkin testing infrastructure
**Then** a Gherkin-compatible test framework is installed and configured for Bun (e.g., `@cucumber/cucumber` or Bun-compatible alternative)
**And** a `features/` directory exists in `packages/core/` with example `.feature` files
**And** step definitions are configured in a recognizable pattern (e.g., `features/step_definitions/`)
**And** an example feature file demonstrates Given/When/Then syntax with passing tests
**And** `bun test` command runs both regular tests and Gherkin feature tests
**And** documentation explains how to write new feature files and step definitions
**And** the test setup supports TypeScript for step definitions
**And** future stories can reference this pattern for their test implementations

### Story 1.5: Development Tooling Setup

As a **developer**,
I want **consistent code quality tooling across the project**,
So that **all code follows established patterns and maintains high quality**.

**Acceptance Criteria:**

**Given** I need to enforce code quality and formatting standards
**When** I configure the development tooling
**Then** ESLint is installed with TypeScript support using flat config format (eslint.config.js)
**And** ESLint rules enforce camelCase file naming, private member conventions, and architecture patterns
**And** Prettier is configured with single quotes and trailing commas as specified
**And** a `.prettierrc` file exists with project formatting rules
**And** `bun run lint` command checks all code for violations
**And** `bun run lint:fix` command auto-fixes applicable issues
**And** `bun run format` command formats all code with Prettier
**And** a `.github/workflows/ci.yml` file exists for CI/CD pipeline
**And** CI workflow runs linting, formatting checks, and tests on pull requests
**And** all configuration files are committed to version control

---

## Epic 2: DSL Core - Parse and Validate Schemas

QA testers can write DSL schema files and get immediate validation feedback with clear error messages.

### Story 2.1: Scanner - Token Types and Lexical Analysis

As a **developer**,
I want **a lexical scanner that converts DSL source code into tokens**,
So that **the parser can process structured tokens instead of raw text**.

**Acceptance Criteria:**

**Given** I need to tokenize DSL source code
**When** I implement the scanner in `packages/core/src/scanner/`
**Then** a discriminated union type `Token` exists with variants for `keyword`, `identifier`, `string`, `number`, `operator`, and `eof`
**And** each token includes a `SourceLocation` with file, line, column, and length information
**And** a `Scanner` class exists with a `scan(source: string): Result<Token[]>` method
**And** the scanner recognizes DSL keywords: `schema`, `profile`, `context`, `unique`, `template`
**And** the scanner handles string literals with proper escape sequences
**And** the scanner handles numeric literals (integers and floats)
**And** the scanner collects multiple lexical errors without stopping (e.g., unterminated strings)
**And** error diagnostics include helpful messages like "Unterminated string starting at line 5"
**And** the module exports through `packages/core/src/scanner/index.ts`
**And** Gherkin feature tests cover valid tokenization and error cases
**And** line and column tracking is 1-indexed as specified

### Story 2.2: Parser - AST Node Types

As a **developer**,
I want **immutable AST node type definitions for all DSL constructs**,
So that **the parser can build a type-safe abstract syntax tree**.

**Acceptance Criteria:**

**Given** I need to represent parsed DSL structures
**When** I define AST node types in `packages/core/src/parser/ast.ts`
**Then** a discriminated union type exists for all AST node kinds
**And** a `Program` node type exists as the root containing multiple declarations
**And** a `SchemaNode` type exists with `readonly` fields: `kind`, `name`, `fields`, `location`
**And** a `FieldNode` type exists with `readonly` fields: `kind`, `name`, `type`, `generator`, `constraints`, `location`
**And** a `ProfileNode` type exists for generation profiles (future use)
**And** all node types use `readonly` arrays and properties for immutability
**And** all node types include `SourceLocation` for error reporting
**And** node types use PascalCase with "Node" suffix (e.g., `SchemaNode`, `FieldNode`)
**And** the module exports through `packages/core/src/parser/index.ts`
**And** TypeScript strict mode enforces immutability
**And** comprehensive type documentation explains each node's purpose

### Story 2.3: Parser - Recursive Descent Implementation

As a **developer**,
I want **a recursive descent parser that builds an AST from tokens**,
So that **DSL schemas can be transformed into structured data for validation**.

**Acceptance Criteria:**

**Given** I have a token stream from the scanner
**When** I implement the parser in `packages/core/src/parser/parser.ts`
**Then** a `Parser` class exists with a `parse(tokens: Token[]): Result<Program>` method
**And** the parser uses recursive descent to match grammar rules
**And** the parser builds immutable AST nodes during parsing
**And** the parser handles schema declarations with field definitions
**And** the parser collects multiple syntax errors without stopping at the first error
**And** syntax errors include context like "Expected ':' after field name 'email' at line 3"
**And** the parser provides helpful suggestions for common mistakes
**And** error diagnostics reference the exact token location
**And** the module exports through `packages/core/src/parser/index.ts`
**And** Gherkin feature tests cover valid schemas and syntax error scenarios
**And** tests verify the parser produces correct AST structures

### Story 2.4: Semantic Analyzer - Symbol Table

As a **developer**,
I want **a symbol table to track schema definitions and references**,
So that **I can validate cross-references and detect duplicate definitions**.

**Acceptance Criteria:**

**Given** I need to track defined schemas, fields, and contexts
**When** I implement the symbol table in `packages/core/src/analyzer/symbolTable.ts`
**Then** a `SymbolTable` class exists with methods to `define()` and `lookup()` symbols
**And** the symbol table tracks schemas by name with their AST nodes
**And** the symbol table tracks fields within each schema
**And** the symbol table detects duplicate definitions and reports errors with both locations
**And** the symbol table supports nested scopes (global, schema-level, field-level)
**And** lookup methods return `undefined` for missing symbols
**And** the symbol table tracks symbol kinds: `schema`, `field`, `context`, `profile`
**And** the module exports through `packages/core/src/analyzer/index.ts`
**And** unit tests verify define/lookup operations and duplicate detection
**And** Gherkin tests cover symbol resolution scenarios

### Story 2.5: Semantic Analyzer - Type Checking and Validation

As a **developer**,
I want **semantic analysis that validates types and references**,
So that **users get clear errors before attempting data generation**.

**Acceptance Criteria:**

**Given** I have a parsed AST from the parser
**When** I implement semantic analysis in `packages/core/src/analyzer/analyzer.ts`
**Then** an `analyze(ast: Program): Result<ValidatedProgram>` function exists
**And** the analyzer builds a symbol table from the AST
**And** the analyzer validates all field type references are supported
**And** the analyzer detects undefined field references in templates (e.g., `{{missingField}}`)
**And** the analyzer detects circular dependencies in schema relationships
**And** the analyzer validates generator names are recognized (e.g., `uuid`, `email`, `randomInt`)
**And** the analyzer collects all semantic errors with detailed messages
**And** error messages include suggestions: "Did you mean 'firstName' instead of 'firstname'?"
**And** the analyzer produces a `ValidatedProgram` type on success
**And** the module exports through `packages/core/src/analyzer/index.ts`
**And** Gherkin feature tests cover type errors, undefined references, and circular dependencies

### Story 2.6: End-to-End Schema Validation

As a **QA tester**,
I want **to validate my DSL schema files and receive clear error messages**,
So that **I can fix issues before attempting data generation**.

**Acceptance Criteria:**

**Given** I have written a `.td` schema file
**When** I use the validation API from the core library
**Then** a public `validateSchema(source: string, filename: string): Result<ValidatedProgram>` function exists
**And** the function chains scanner → parser → analyzer in sequence
**And** validation completes in under 1 second for typical schema files (NFR2)
**And** all errors from all phases are collected and returned together
**And** error messages are sorted by file location (line, then column)
**And** the function returns a `ValidatedProgram` on success containing the complete validated AST
**And** the API is exported from `packages/core/src/index.ts`
**And** comprehensive Gherkin feature tests cover:
  - Valid schema validation succeeds
  - Syntax errors are reported clearly
  - Semantic errors are reported with suggestions
  - Multiple errors are collected and reported together
  - Performance requirements are met
**And** example schemas in `docs/examples/` demonstrate valid syntax

---

## Epic 3: Basic Data Generation

QA testers can generate simple test data from validated schemas with primitive field types and basic generators.

### Story 3.1: Custom PRNG - Xoshiro256** Implementation

As a **developer**,
I want **a custom seeded pseudo-random number generator**,
So that **data generation is deterministic and independent of external libraries**.

**Acceptance Criteria:**

**Given** I need reproducible random number generation
**When** I implement Xoshiro256** in `packages/core/src/generator/rng.ts`
**Then** a `createRNG(seed?: number): RNG` function exists that initializes the PRNG
**And** the RNG instance provides `nextInt(): number` for 32-bit integers
**And** the RNG instance provides `nextFloat(): number` for values in [0, 1)
**And** the RNG instance provides `nextIntRange(min: number, max: number): number`
**And** the RNG instance provides `nextFloatRange(min: number, max: number): number`
**And** the same seed produces identical sequences across runs
**And** different seeds produce different sequences
**And** the implementation uses no external dependencies (no Faker.js)
**And** the algorithm follows the standard Xoshiro256** specification
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify deterministic behavior with specific seeds
**And** Gherkin tests verify reproducibility across multiple runs

### Story 3.2: Primitive Field Generators

As a **QA tester**,
I want **basic field generators for primitive data types**,
So that **I can generate integers, floats, strings, and booleans in my schemas**.

**Acceptance Criteria:**

**Given** I am defining fields in a DSL schema
**When** I implement primitive generators in `packages/core/src/generator/generators/primitives.ts`
**Then** a `randomInt(rng: RNG, min: number, max: number): number` generator exists
**And** a `randomFloat(rng: RNG, min: number, max: number): number` generator exists
**And** a `randomString(rng: RNG, length: number, charset?: string): string` generator exists
**And** a `randomBoolean(rng: RNG): boolean` generator exists
**And** all generators accept the RNG instance as first parameter for determinism
**And** generators validate input parameters (e.g., min <= max)
**And** string generator supports custom character sets (alpha, numeric, alphanumeric)
**And** default character set is alphanumeric
**And** a generator registry maps generator names to functions
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify each generator produces valid output
**And** Gherkin tests verify generators work with seeded RNG

### Story 3.3: Generator Engine - Record Creation

As a **developer**,
I want **an engine that generates complete records from validated schemas**,
So that **all fields are populated according to their generator definitions**.

**Acceptance Criteria:**

**Given** I have a validated schema with field definitions
**When** I implement the generator engine in `packages/core/src/generator/generator.ts`
**Then** a `generateRecord(schema: ValidatedSchema, rng: RNG): Record` function exists
**And** the function iterates through all fields in the schema
**And** for each field, the appropriate generator is invoked based on field type
**And** generator parameters from the schema are passed to the generator function
**And** generated values are assigned to the corresponding field in the output record
**And** the record is a plain JavaScript object with field names as keys
**And** all fields in the schema are present in the generated record
**And** the function handles generator errors gracefully with clear messages
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify record structure matches schema
**And** Gherkin tests verify field values are generated correctly

### Story 3.4: Streaming Generation with AsyncIterable

As a **QA tester**,
I want **to generate large datasets without running out of memory**,
So that **I can create millions of test records efficiently**.

**Acceptance Criteria:**

**Given** I need to generate a large number of records
**When** I implement streaming generation in `packages/core/src/generator/generator.ts`
**Then** an `async function* generate(schema: ValidatedProgram, options: GenerateOptions): AsyncIterable<Record>` function exists
**And** `GenerateOptions` includes `count: number` and `seed?: number` fields
**And** the function yields records one at a time using `yield`
**And** records are generated lazily (not all at once)
**And** the generator uses minimal memory regardless of count
**And** the function initializes RNG from the seed option
**And** the same seed produces identical sequences
**And** the function can generate 1 million+ records without memory issues (NFR3)
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify streaming behavior and memory efficiency
**And** Gherkin tests verify large-scale generation scenarios

### Story 3.5: JSON Output Adapter

As a **QA tester**,
I want **to output generated data as JSON files**,
So that **I can use the test data in my applications and test frameworks**.

**Acceptance Criteria:**

**Given** I have generated test data records
**When** I implement the JSON adapter in `packages/core/src/adapters/jsonAdapter.ts`
**Then** a `JsonAdapter` class exists implementing the adapter interface
**And** the adapter consumes `AsyncIterable<Record>` from the generator
**And** the adapter supports single-file JSON output (array format)
**And** the adapter supports line-delimited JSON output (JSONL format)
**And** the adapter includes generation metadata in the output header
**And** metadata includes: timestamp, sourcePattern, count, seed (if used)
**And** the adapter writes output incrementally to avoid memory issues
**And** the adapter properly handles JSON encoding (escaping special characters)
**And** the module exports through `packages/core/src/adapters/index.ts`
**And** unit tests verify JSON formatting correctness
**And** Gherkin tests verify output format matches specifications

### Story 3.6: End-to-End Generation Pipeline

As a **QA tester**,
I want **to generate test data from DSL schemas with a simple API call**,
So that **I can quickly create test datasets for my testing scenarios**.

**Acceptance Criteria:**

**Given** I have a valid DSL schema
**When** I use the generation API
**Then** a public `generateData(source: string, options: GenerateOptions): AsyncIterable<Record>` function exists
**And** the function validates the schema first before generation
**And** validation errors are returned immediately without starting generation
**And** the function generates 1000 records in under 1 minute on standard hardware (NFR1)
**And** the function supports seed parameter for deterministic generation (FR25)
**And** the same schema and seed produce identical data across runs
**And** the API is exported from `packages/core/src/index.ts`
**And** comprehensive Gherkin feature tests cover:
  - Valid schema generates correct number of records
  - Generated records match schema structure
  - Seed parameter produces reproducible results
  - Invalid schema returns validation errors
  - Performance requirements are met (1000 records < 1 minute)
  - Large dataset generation (10k, 100k records) works without memory issues
**And** example usage is documented with code samples

---

## Epic 4: CLI Tool Interface

QA testers can use intuitive command-line commands to generate, validate, and initialize schemas without programmatic knowledge.

### Story 4.1: CLI Foundation with Commander.js

As a **QA tester**,
I want **a command-line tool for testdata-ai**,
So that **I can use the tool without writing code**.

**Acceptance Criteria:**

**Given** I need a CLI interface for testdata-ai
**When** I implement the CLI in `packages/cli/src/`
**Then** Commander.js v14.0.2 is installed and configured
**And** a `bin/td.ts` file exists with shebang `#!/usr/bin/env bun`
**And** the CLI is executable with `td` command after global install
**And** `td --version` displays the current version number
**And** `td --help` displays all available commands
**And** the CLI package depends on `@testdata-ai/core` for functionality
**And** the package.json includes `bin` field pointing to `td.ts`
**And** TypeScript compilation produces executable JavaScript
**And** unit tests verify CLI initialization and argument parsing

### Story 4.2: Generate Command Implementation

As a **QA tester**,
I want **to generate test data using a simple command**,
So that **I can create datasets from my DSL schemas quickly**.

**Acceptance Criteria:**

**Given** I have a DSL schema file
**When** I implement `td generate` command in `packages/cli/src/commands/generate.ts`
**Then** `td generate <file.td>` reads the file and generates data
**And** `--count, -c <n>` option specifies number of records (default: 10)
**And** `--format, -f <fmt>` option specifies output format: json|csv|sql (default: json)
**And** `--output, -o <path>` option specifies output file (default: stdout)
**And** `--seed, -s <n>` option specifies random seed for reproducibility
**And** the command validates the schema before generation
**And** validation errors are displayed with clear formatting
**And** generation progress is shown for large datasets
**And** successful generation displays summary: "Generated 1000 records in 2.3s"
**And** exit code is 0 on success, 1 on validation error, 2 on generation error, 3 on file error
**And** Gherkin tests cover successful generation and error scenarios

### Story 4.3: Validate Command Implementation

As a **QA tester**,
I want **to validate my DSL schemas before generation**,
So that **I can fix syntax errors quickly**.

**Acceptance Criteria:**

**Given** I have a DSL schema file
**When** I implement `td validate` command in `packages/cli/src/commands/validate.ts`
**Then** `td validate <file.td>` checks the schema for errors
**And** `--json` flag outputs validation results as JSON for scripting
**And** successful validation displays "✓ Schema is valid"
**And** validation errors are displayed with Rust-style formatting
**And** errors show file location, line number, and helpful suggestions
**And** multiple errors are displayed together (not just the first)
**And** exit code is 0 if valid, 1 if invalid
**And** validation completes in under 1 second (NFR2)
**And** Gherkin tests cover valid and invalid schema scenarios

### Story 4.4: Init Command Implementation

As a **QA tester**,
I want **to quickly start with template schemas**,
So that **I can learn DSL syntax through examples**.

**Acceptance Criteria:**

**Given** I want to create a new schema
**When** I implement `td init` command in `packages/cli/src/commands/init.ts`
**Then** `td init` creates a basic schema template in current directory
**And** `td init [template]` accepts template names: `basic`, `with-relationships`, `with-context`
**And** the basic template includes simple field types and generators
**And** the with-relationships template demonstrates schema relationships
**And** the with-context template shows context usage
**And** templates are stored in `packages/cli/templates/` directory
**And** the command asks for confirmation before overwriting existing files
**And** the command displays next steps after template creation
**And** exit code is 0 on success, 3 if file already exists without confirmation
**And** Gherkin tests verify template creation and file handling

### Story 4.5: Rust-Style Error Formatter

As a **QA tester**,
I want **clear, helpful error messages when I make mistakes**,
So that **I can fix issues without needing developer help**.

**Acceptance Criteria:**

**Given** I have syntax or semantic errors in my schema
**When** I implement error formatting in `packages/cli/src/formatters/errorFormatter.ts`
**Then** errors display the file name and line number
**And** errors show the problematic line with visual pointer (^)
**And** errors include the error code (e.g., `scanner.unterminatedString`)
**And** errors provide plain-language problem descriptions
**And** errors include suggested fixes when applicable
**And** errors show "Did you mean X?" suggestions for typos
**And** multiple errors are grouped by file and sorted by location
**And** error output uses colors for readability (red for errors, yellow for warnings)
**And** the formatter handles terminal width for proper line wrapping
**And** unit tests verify formatting for various error types
**And** error messages are actionable without developer assistance (NFR7)

---

## Epic 5: Advanced Field Generation

QA testers can generate realistic personal data, temporal patterns, and complex field types for authentic test scenarios.

### Story 5.1: Identity Generators (UUID, Sequential, NanoID)

As a **QA tester**,
I want **to generate unique identifiers for my test data**,
So that **records have realistic primary keys and IDs**.

**Acceptance Criteria:**

**Given** I need unique identifiers in my schemas
**When** I implement identity generators in `packages/core/src/generator/generators/identity.ts`
**Then** a `uuid(rng: RNG): string` generator creates RFC4122 v4 UUIDs
**And** a `sequential(start: number): () => number` generator creates incrementing IDs
**And** a `nanoid(rng: RNG, length?: number): string` generator creates short unique IDs
**And** UUID generator produces valid UUID format with proper randomness from RNG
**And** sequential generator maintains state across multiple calls
**And** nanoid uses URL-safe characters by default
**And** generators are registered in the generator registry
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify UUID format, sequential increments, and nanoid uniqueness
**And** Gherkin tests verify generators work in real schemas

### Story 5.2: Personal Data Generators (Names, Emails)

As a **QA tester**,
I want **to generate realistic personal data**,
So that **my test datasets look like production data**.

**Acceptance Criteria:**

**Given** I need personal information in test data
**When** I implement personal generators in `packages/core/src/generator/generators/personal.ts`
**Then** a `firstName(rng: RNG): string` generator selects from a curated name list
**And** a `lastName(rng: RNG): string` generator selects from a curated surname list
**And** a `fullName(rng: RNG): string` generator combines first and last names
**And** an `email(rng: RNG, domain?: string): string` generator creates valid email addresses
**And** a `phoneNumber(rng: RNG, format?: string): string` generator creates phone numbers
**And** name lists include diverse, international names (50+ first names, 50+ last names)
**And** email generator uses realistic patterns (firstname.lastname@domain.com)
**And** phone number format parameter supports patterns like "(###) ###-####"
**And** generators use RNG for selection to ensure determinism
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify realistic output and format correctness
**And** Gherkin tests verify personal data generation in schemas

### Story 5.3: Temporal Generators (Dates, Timestamps, Ranges)

As a **QA tester**,
I want **to generate dates and times for my test data**,
So that **I can create time-based test scenarios**.

**Acceptance Criteria:**

**Given** I need temporal data in my schemas
**When** I implement temporal generators in `packages/core/src/generator/generators/temporal.ts`
**Then** a `date(rng: RNG, start?: Date, end?: Date): Date` generator creates dates in range
**And** a `timestamp(rng: RNG): number` generator creates Unix timestamps
**And** a `dateRange(rng: RNG, duration: number): { start: Date; end: Date }` generator creates date ranges
**And** a `time(rng: RNG): string` generator creates time strings (HH:MM:SS format)
**And** a `datetime(rng: RNG): string` generator creates ISO 8601 datetime strings
**And** default date range is last year to current date
**And** generators accept string date parameters (parsed to Date objects)
**And** all temporal generators use RNG for deterministic output
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify date ranges and format correctness
**And** Gherkin tests verify temporal generation in real schemas

### Story 5.4: Text Generators (Words, Sentences, Paragraphs)

As a **QA tester**,
I want **to generate text content for my test data**,
So that **I can populate content fields with realistic text**.

**Acceptance Criteria:**

**Given** I need text content in test data
**When** I implement text generators in `packages/core/src/generator/generators/text.ts`
**Then** a `word(rng: RNG): string` generator selects from a word list
**And** a `words(rng: RNG, count: number): string` generator creates multiple words
**And** a `sentence(rng: RNG, wordCount?: number): string` generator creates sentences
**And** a `paragraph(rng: RNG, sentenceCount?: number): string` generator creates paragraphs
**And** word list includes 200+ common English words
**And** sentences start with capital letter and end with period
**And** word count parameters have sensible defaults (sentence: 5-15 words, paragraph: 3-5 sentences)
**And** generators use RNG for word selection and variation
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify text structure and formatting
**And** Gherkin tests verify text generation in schemas

### Story 5.5: Selection Generators (Pick, Weighted Pick)

As a **QA tester**,
I want **to select values from predefined lists**,
So that **I can generate data with specific allowed values**.

**Acceptance Criteria:**

**Given** I have enumerated values to select from
**When** I implement selection generators in `packages/core/src/generator/generators/selection.ts`
**Then** a `pick(rng: RNG, array: any[]): any` generator randomly selects from array
**And** a `weightedPick(rng: RNG, options: Array<{value: any, weight: number}>): any` generator uses weighted selection
**And** pick ensures uniform distribution across array elements
**And** weightedPick respects probability weights (higher weight = more likely)
**And** generators validate array is not empty
**And** generators use RNG for deterministic selection
**And** the module exports through `packages/core/src/generator/generators/index.ts`
**And** unit tests verify distribution and weighted probability
**And** Gherkin tests verify selection generators in schemas with enum-like fields

---

## Epic 6: Cross-Field Templates & Relationships

QA testers can define realistic relationships between fields and generate related entities.

### Story 6.1: Template Engine for Cross-Field References

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

### Story 6.2: Field Generation Order Resolver

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

### Story 6.3: Schema Relationship Support

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

## Epic 7: Uniqueness Constraints

QA testers can enforce uniqueness rules to ensure realistic test data without duplicates.

### Story 7.1: Uniqueness Constraint Tracker

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

### Story 7.2: Single Field Uniqueness Enforcement

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

### Story 7.3: Composite Uniqueness Constraints

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

## Epic 8: Context Management

QA testers can load existing data and reference it in new generations, enabling realistic test scenarios with dependencies.

### Story 8.1: JSON Context Loader

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

### Story 8.2: CSV Context Loader

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

### Story 8.3: Context Reference Syntax and Resolution

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

### Story 8.4: Context Tagging and Filtered Selection

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

### Story 8.5: Save Generated Data as Context

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

## Epic 9: Cascading Configuration System

Teams can establish shared test data standards while individuals maintain flexibility for specific test scenarios.

### Story 9.1: Global Configuration Defaults

As a **QA tester**,
I want **global defaults that apply to all my projects**,
So that **I don't repeat common settings in every schema**.

**Acceptance Criteria:**

**Given** I have common settings across all projects
**When** I implement global config in `packages/cli/src/config/defaults.ts`
**Then** a global config file location is defined (e.g., `~/.tdconfig.json`)
**And** global config supports default generator settings
**And** global config supports default output format and count
**And** global config is loaded automatically by the CLI
**And** global config values have lowest priority (overridden by all other levels)
**And** missing global config file is not an error (use built-in defaults)
**And** unit tests verify global config loading
**And** documentation explains global config options

### Story 9.2: Workspace Configuration

As a **QA team member**,
I want **team-shared workspace configuration**,
So that **all team members use consistent test data standards**.

**Acceptance Criteria:**

**Given** I work in a team with shared standards
**When** I implement workspace config in `packages/cli/src/config/configLoader.ts`
**Then** a `.tdconfig.json` file in project root is recognized as workspace config
**And** workspace config overrides global defaults
**And** workspace config supports all same options as global config
**And** workspace config can specify default generator mappings
**And** workspace config is version-controlled with the project
**And** the CLI automatically discovers workspace config from current directory or parent directories
**And** unit tests verify workspace config loading and priority
**And** Gherkin tests verify workspace config overrides global defaults

### Story 9.3: Schema-Level Defaults

As a **QA tester**,
I want **to set defaults at the schema level**,
So that **all fields in a schema share common settings**.

**Acceptance Criteria:**

**Given** I have common settings for a schema
**When** I implement schema defaults in the DSL parser
**And** the DSL supports `@defaults` section at schema start
**Then** the parser recognizes `@defaults` declarations
**And** schema defaults can specify field generator defaults
**And** schema defaults can specify uniqueness behavior
**And** schema defaults override workspace and global config
**And** field-level specifications override schema defaults (highest priority)
**And** the semantic analyzer applies defaults during validation
**And** unit tests verify default application hierarchy
**And** Gherkin tests verify schema defaults work in real schemas

### Story 9.4: Configuration Priority and Merging

As a **developer**,
I want **clear configuration priority rules**,
So that **configuration merging is predictable and correct**.

**Acceptance Criteria:**

**Given** I have configuration at multiple levels
**When** I implement config merging in `packages/cli/src/config/configLoader.ts`
**Then** configuration priority is: field-level > schema-level > workspace > global > built-in
**And** higher priority config completely overrides lower priority (no deep merging)
**And** the merger validates configuration values are valid
**And** the CLI displays effective configuration with `td config show` command
**And** the config show command indicates source of each setting
**And** unit tests verify priority order for all config options
**And** documentation clearly explains cascading rules

---

## Epic 10: Multi-Format Output & Programmatic API

QA testers can generate test data in their required format (JSON, CSV, SQL) and developers can integrate generation into test scripts.

### Story 10.1: CSV Output Adapter

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

### Story 10.2: SQL Output Adapter

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

### Story 10.3: CLI Multi-Format Support

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

### Story 10.4: Programmatic API for Test Integration

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

## Epic 11: Pattern Composition & Reusability

QA testers can build complex patterns from reusable components and share them across the team.

### Story 11.1: DSL Import Statement Support

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

### Story 11.2: Shared Generator Definitions

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

### Story 11.3: Schema Composition and Extension

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

### Story 11.4: Reference Validation and Type Safety

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

## Epic 12: Platform-Ready Metadata & Audit Trail

Organizations can track test data generation history and prepare for future platform evolution.

### Story 12.1: Generation Metadata Tracking

As a **QA tester**,
I want **metadata included with generated data**,
So that **I know when and how the data was created**.

**Acceptance Criteria:**

**Given** I generate test data
**When** generation completes
**Then** output includes metadata section with generation details
**And** metadata includes generation timestamp (ISO 8601 format)
**And** metadata includes source pattern file path
**And** metadata includes pattern version or hash (for change tracking)
**And** metadata includes generation options (count, seed, format)
**And** metadata includes testdata-ai version used for generation
**And** JSON output includes metadata as header object
**And** CSV output includes metadata as comment header
**And** SQL output includes metadata as SQL comments
**And** unit tests verify metadata structure
**And** Gherkin tests verify metadata is present in all formats

### Story 12.2: Generation History Logging

As a **QA manager**,
I want **a log of all test data generations**,
So that **I can audit test data usage and troubleshoot issues**.

**Acceptance Criteria:**

**Given** I need to track generation history
**When** I implement history logging
**Then** each generation appends entry to `.td-history.jsonl` file
**And** history entries include all metadata plus generation outcome
**And** history log location is configurable (default: project root)
**And** CLI flag `--no-history` disables history logging
**And** history entries include success/failure status
**And** history entries include error messages for failed generations
**And** history entries include performance metrics (duration, records/sec)
**And** the CLI provides `td history` command to query generation history
**And** `td history --last 10` shows last 10 generations
**And** unit tests verify history logging and querying
**And** Gherkin tests verify history is maintained across multiple generations

### Story 12.3: Pattern Version Tracking

As a **QA team lead**,
I want **to track which version of patterns generated which datasets**,
So that **I can correlate test data with pattern changes**.

**Acceptance Criteria:**

**Given** I need to track pattern evolution
**When** patterns change over time
**Then** each generation records a hash of the source pattern content
**And** pattern hash changes when DSL file is modified
**And** metadata links generated data to specific pattern version
**And** CLI command `td diff <old-hash> <new-hash>` shows pattern changes
**And** generation history tracks pattern hash over time
**And** breaking pattern changes are detectable from hash changes
**And** unit tests verify hash calculation consistency
**And** Gherkin tests verify version tracking across pattern modifications

### Story 12.4: Platform Migration Preparation

As a **product manager**,
I want **data structured for future platform migration**,
So that **local CLI usage can evolve to centralized platform**.

**Acceptance Criteria:**

**Given** future platform evolution is planned
**When** data is generated locally
**Then** metadata includes fields reserved for platform use
**And** generated data can be exported with `td export --platform-ready` flag
**And** platform-ready export includes all metadata for platform import
**And** export format is documented for platform team
**And** data includes generation lineage (what generated what)
**And** context references are preserved in metadata
**And** local-to-platform migration guide is documented
**And** unit tests verify export format structure
**And** Gherkin tests verify platform-ready export completeness
