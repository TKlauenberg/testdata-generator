# Epic 4: CLI Tool Interface

QA testers can use intuitive command-line commands to generate, validate, and initialize schemas without programmatic knowledge.

## Story 4.1: CLI Foundation with Commander.js

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

## Story 4.2: Generate Command Implementation

As a **QA tester**,
I want **to generate test data using a simple command**,
So that **I can create datasets from my DSL schemas quickly**.

**Acceptance Criteria:**

**Given** I have a DSL schema file
**When** I implement `td generate` command in `packages/cli/src/commands/generate.ts`
**Then** `td generate <file.td>` reads the file and generates data
**And** `--count, -c <n>` option specifies number of records (default: 10)
**And** `--format, -f <fmt>` option specifies output format: json (default: json) [Note: CSV/SQL formats will be added in Epic 10 Stories 10.1-10.2]
**And** `--output, -o <path>` option specifies output file (default: stdout)
**And** `--seed, -s <n>` option specifies random seed for reproducibility
**And** the command validates the schema before generation
**And** validation errors are displayed with clear formatting
**And** generation progress is shown for large datasets
**And** successful generation displays summary: "Generated 1000 records in 2.3s"
**And** exit code is 0 on success, 1 on validation error, 2 on generation error, 3 on file error
**And** Gherkin tests cover successful generation and error scenarios

## Story 4.3: Validate Command Implementation

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

## Story 4.4: Init Command Implementation

As a **QA tester**,
I want **to quickly start with template schemas**,
So that **I can learn DSL syntax through examples**.

**Acceptance Criteria:**

**Given** I want to create a new schema
**When** I implement `td init` command in `packages/cli/src/commands/init.ts`
**Then** `td init` creates a basic schema template in current directory
**And** `td init [template]` accepts template name: `basic` (default) [Note: Additional templates (with-relationships, with-context) will be added in Epic 6/8 when features are implemented]
**And** the basic template includes simple field types and generators (int, float, string, boolean)
**And** templates are stored in `packages/cli/templates/` directory
**And** the command asks for confirmation before overwriting existing files
**And** the command displays next steps after template creation
**And** exit code is 0 on success, 3 if file already exists without confirmation
**And** Gherkin tests verify template creation and file handling

## Story 4.5: Rust-Style Error Formatter

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
