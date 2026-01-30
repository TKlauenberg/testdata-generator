# Epic 2: DSL Core - Parse and Validate Schemas

QA testers can write DSL schema files and get immediate validation feedback with clear error messages.

## Story 2.1: Scanner - Token Types and Lexical Analysis

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

## Story 2.2: Parser - AST Node Types

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

## Story 2.3: Parser - Recursive Descent Implementation

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

## Story 2.4: Semantic Analyzer - Symbol Table

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

## Story 2.5: Semantic Analyzer - Type Checking and Validation

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

## Story 2.6: End-to-End Schema Validation

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
