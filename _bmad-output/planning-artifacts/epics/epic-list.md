# Epic List

## Epic 1: Project Foundation & Development Setup

Development team can start building testdata-generator with proper monorepo structure, tooling, and core utilities in place.

**FRs covered:** Foundation for all other FRs (enables FR1-FR31)
**NFRs supported:** NFR9, NFR10 (maintainability, clear separation)
**Additional:** Bun monorepo setup, TypeScript strict mode, Result<T,E> pattern, project structure

## Epic 2: DSL Core - Parse and Validate Schemas

QA testers can write DSL schema files and get immediate validation feedback with clear error messages.

**FRs covered:** FR1 (schema definitions), FR18 (text-based DSL), FR26-FR27 (validation)
**NFRs supported:** NFR2 (validate in <1 sec), NFR4 (no code execution), NFR6-NFR7 (readable syntax, actionable errors)

## Epic 3: Basic Data Generation

QA testers can generate simple test data from validated schemas with primitive field types and basic generators.

**FRs covered:** FR2 (configurable volume generation), FR22 (JSON output), FR23 (metadata), FR25 (deterministic seeds)
**NFRs supported:** NFR1 (performance targets), NFR3 (streaming for large datasets)

## Epic 4: CLI Tool Interface

QA testers can use intuitive command-line commands to generate, validate, and initialize schemas without programmatic knowledge.

**FRs covered:** FR14 (generate command), FR15 (validate command), FR16 (init command), FR17 (error formatting)
**NFRs supported:** NFR6-NFR8 (usability for non-programmers)

## Epic 5: Advanced Field Generation

QA testers can generate realistic personal data, temporal patterns, and complex field types for authentic test scenarios.

**FRs covered:** FR1 (advanced generators - personal, temporal, identity types)
**NFRs supported:** NFR6 (readable syntax for complex patterns)

## Epic 6: Cross-Field Templates & Relationships

QA testers can define realistic relationships between fields and generate related entities.

**FRs covered:** FR4 (cross-field templates), FR5 (relationships)
**NFRs supported:** NFR6 (natural syntax for relationships)

## Epic 7: Uniqueness Constraints

QA testers can enforce uniqueness rules to ensure realistic test data without duplicates.

**FRs covered:** FR3 (uniqueness constraints - single and composite), FR28 (uniqueness enforcement)
**NFRs supported:** NFR1 (performance with constraint checking)

## Epic 8: Context Management

QA testers can load existing data and reference it in new generations, enabling realistic test scenarios with dependencies.

**FRs covered:** FR6 (load context), FR7 (reference context), FR8 (tag-based selection), FR9 (save as context)
**NFRs supported:** NFR5 (safe data loading)

## Epic 9: Cascading Configuration System

Teams can establish shared test data standards while individuals maintain flexibility for specific test scenarios.

**FRs covered:** FR10 (global defaults), FR11 (workspace defaults), FR12 (schema defaults), FR13 (field overrides)
**NFRs supported:** NFR10 (clear separation of concerns)

## Epic 10: Multi-Format Output & Programmatic API

QA testers can generate test data in their required format (JSON, CSV, SQL) and developers can integrate generation into test scripts.

**FRs covered:** FR22 (CSV/SQL output), FR24 (programmatic API)
**NFRs supported:** NFR12 (adapter pattern for extensibility)

## Epic 11: Pattern Composition & Reusability

QA testers can build complex patterns from reusable components and share them across the team.

**FRs covered:** FR19 (version control friendly), FR20 (pattern discovery), FR21 (pattern composition), FR29 (reference validation)
**NFRs supported:** NFR9 (backward compatibility)

## Epic 12: Platform-Ready Metadata & Audit Trail

Organizations can track test data generation history and prepare for future platform evolution.

**FRs covered:** FR30 (platform metadata), FR31 (generation history)
**NFRs supported:** NFR9 (version stability)

---
