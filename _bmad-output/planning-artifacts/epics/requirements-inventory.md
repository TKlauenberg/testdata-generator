# Requirements Inventory

## Functional Requirements

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

## Non-Functional Requirements

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

## Additional Requirements

**Starter Template/Project Initialization:**

- Architecture specifies Bun 1.x monorepo setup with packages/core and packages/cli
- Project structure must be initialized before DSL implementation
- TypeScript strict mode configuration required
- ESLint + Prettier configuration needed

**Technical Infrastructure:**

- Custom Xoshiro256\*\* PRNG implementation (no Faker.js dependency)
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

## FR Coverage Map

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
