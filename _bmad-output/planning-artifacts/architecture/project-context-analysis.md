# Project Context Analysis

## Requirements Overview

**Functional Requirements:**

The system requires 31 functional requirements across 8 categories, with the core being a DSL-powered test data generation engine. The architecture must support:

1. **Pattern-Based Generation** (FR1-FR5): Schema definitions with fields, types, generators, uniqueness constraints, cross-field templates, and relationship support (generate new or reference context)

2. **Context Management** (FR6-FR9): Load existing data as context (JSON/CSV/DB exports), reference context in patterns, tag-based context selection, save generated data as context for reuse

3. **Cascading Rules** (FR10-FR13): Four-level hierarchy - global defaults → workspace defaults → schema defaults → field-level overrides (CSS-inspired)

4. **CLI Operations** (FR14-FR17): Generate command, validate command, init templates, error messages for non-programmers

5. **Pattern Sharing** (FR18-FR21): Text-based `.td` files, version control friendly, discoverable patterns, composable from reusable components

6. **Data Output** (FR22-FR25): Multiple formats (JSON/CSV/SQL), metadata tracking, programmatic API, deterministic generation with seeds

7. **Validation** (FR26-FR29): DSL syntax validation, semantic correctness, uniqueness constraint enforcement, context reference validation

8. **Platform Foundations** (FR30-FR31): Metadata for future platform lift, generation history export

**Non-Functional Requirements:**

Critical NFRs that will drive architectural decisions:

- **Performance**: 1000 records in <1 minute (~100-500 records/sec), schema validation in <1 second, support 1M+ records via streaming
- **Security**: No arbitrary code execution from DSL, safe context loading, SQL output escaping
- **Usability**: Syntax readable by QA testers, actionable error messages, common use cases achievable in <30 minutes
- **Maintainability**: DSL patterns valid across minor versions, clear separation (DSL core/generators/adapters)
- **Extensibility**: Custom generators via plugins, new output formats via adapter pattern

**Scale & Complexity:**

- **Primary domain**: developer_tool + cli_tool (TypeScript/Node.js ecosystem)
- **Complexity level**: Medium (custom DSL parser + generator engine + CLI tooling)
- **Project type**: Greenfield developer tool targeting QA testers
- **Estimated architectural components**: 7-9 major components
  - DSL Scanner (lexical analysis)
  - DSL Parser (syntax analysis)
  - Semantic Analyzer (symbol table + type checking)
  - Test Data Generator (interpreter)
  - Context Manager (data loading/referencing)
  - Output Adapters (JSON/CSV/SQL formatters)
  - CLI Tool (command interface)
  - Error Formatter (user-friendly messages)
  - VS Code Extension (future: syntax highlighting + LSP)

## Technical Constraints & Dependencies

**Language & Ecosystem:**

- TypeScript/Node.js implementation (Node.js 18+ requirement)
- Zero external parser dependencies (hand-written parser)
- Cross-platform: Windows, macOS, Linux
- npm distribution: `@testdata-ai/core` (library) + `@testdata-ai/cli` (global tool)

**Research-Validated Decisions:**

- **External DSL approach** (not internal DSL) - QA-friendly syntax priority over implementation speed
- **Hand-written parser** (not ANTLR) - maximum error message control, zero dependencies
- **Declarative syntax** (not imperative) - describe "what" not "how" (SQL/HCL/Gherkin pattern)
- **Multi-pass compilation** - lexing → parsing → semantic analysis → generation

**API Surface:**

- Core: `parseSchema()`, `generateData()`, `loadContext()`, `validateSchema()`
- CLI: `td generate`, `td validate`, `td init`, `td version`

## Cross-Cutting Concerns Identified

**1. Error Handling & User Experience (CRITICAL)**

- Target audience: QA testers with minimal coding experience
- Rust-inspired error format: file location, visual pointer, helpful suggestions, fuzzy matching for typos
- Collect errors during parsing (show all at once), fail-fast before generation
- Non-programmer friendly language in all error messages

**2. Type System & Inference**

- Schema-based types (similar to SQL schema definitions)
- Type inference by default, explicit specification when needed
- Multi-pass semantic analysis for comprehensive type checking
- Symbol table for tracking schemas, profiles, contexts

**3. Reference Resolution**

- Three-layer model: Context → Schema → Profile
- Reference syntax: `@schema:`, `@profile:`, `@context.`
- Symbol table for definition tracking and reference resolution
- Circular dependency detection

**4. Context Management**

- Load from files (JSON, CSV, database exports) or programmatic data
- Tag-based context selection: `@context.users@staging.random`
- Context transformations: filter, sample, aggregate
- Metadata tracking for generated-to-context pipeline

**5. Deterministic Generation**

- Seed-based reproducibility (same seed → same output)
- Critical for debugging failing tests with exact data
- Affects generator design (all randomness must be seeded)

**6. Output Adapter Architecture**

- Core generates internal data representation
- Adapters transform to target formats (JSON/CSV/SQL)
- Plugin architecture for custom formats (future)
- SQL injection prevention in SQL adapter

**7. Platform-Ready Metadata**

- Generation timestamp, source pattern reference, pattern version/hash
- Enables future "lift to platform" capability
- Generation history logging for audit trail

**8. Extensibility Points**

- Custom field generators (plugin system)
- Custom output adapters
- Future: profile composition, temporal patterns, advanced context operations
