# testdata-ai - Product Requirements Document

**Author:** Tobi
**Date:** 2025-12-11
**Version:** 1.0

---

## Executive Summary

testdata-ai is a DSL-powered Test Data Management Platform that enables QA testers to generate complex, realistic test data without programming expertise. The platform solves the "Performance Testing Paradox": performance tests require large datasets, but current approaches force oversimplified generation that produces unrealistic data.

The core value proposition is **reusable test data patterns**: build a library of proven generation rules once, then generate new data for test cases in seconds instead of hours. Individual QA testers start with a local library+CLI tool, teams share patterns via version control, and organizations eventually manage test data as a centralized platform asset.

### What Makes This Special

**Progressive Pattern Library Growth:** The product enables a workflow where QA testers generate realistic baseline data (1000 records in minutes), manually refine 5 edge cases instead of 1000, then evolve those refinements into reusable generation patterns. Over time, teams accumulate a library of proven patterns that dramatically accelerate new test scenario creation.

This isn't just about generation speed - it's about **compounding knowledge**: every edge case discovered becomes a shareable pattern, every test scenario adds to the team library, and organizational test data standards emerge organically from proven patterns.

---

## Project Classification

**Technical Type:** developer_tool (DSL parser/generator library) + cli_tool (primary interface for MVP)

**Future Evolution:** saas_b2b platform with stateful data management

**Domain:** general (software development/QA)

**Complexity:** low

This is a greenfield developer tool targeting QA testers with minimal coding experience. The MVP focuses on local library+CLI usage with Git-based pattern sharing. Post-MVP evolution introduces a centralized platform where generated test data has state/lifecycle management and teams manage organizational pattern libraries.

---

## Success Criteria

Success means QA testers have a **growing library of reusable patterns** that makes new test case data generation trivial:

**Individual Tester Success:**

- Has 10+ proven generation patterns in their personal library within first month
- Generates new test scenario data in under 1 minute (pattern exists) vs 30+ minutes (manual creation)
- Refines baseline data with 5 manual tweaks instead of creating 1000 records manually
- Iterates on test data patterns 5+ times per testing session without friction

**Team Success:**

- 3+ team members actively using shared DSL patterns within first month
- Team repository contains 20+ reusable patterns within first quarter
- New team members discover and use existing patterns without training
- Edge cases become patterns with one Git commit

**Product Success Indicators:**

- Pattern library growth rate (patterns/month per user)
- Pattern reuse frequency (uses per pattern)
- Time savings: baseline generation time (hours → minutes)
- Manual refinement reduction (1000 records → 5 tweaks)

---

## Product Scope

### MVP - Minimum Viable Product

**Core Workflow:** Individual QA tester creates DSL patterns, generates data locally via CLI, shares patterns as text files in Git.

**Essential Capabilities:**

1. **DSL Core - Pattern Definition**
   - Schema definitions (data structure with fields and types)
   - Basic field generators (faker patterns, ranges, templates)
   - Cross-field templates: `{{firstName}}.{{lastName}}@test.com`
   - Relationship support (generate new OR reference context)
   - Uniqueness constraints (single field and composite)

2. **Context Management**
   - Reference existing/generated data in new patterns
   - Load context from files (JSON, CSV, database exports)
   - Context references: `@context.users.random`, `@context.regions`
   - Enable data reuse across test scenarios
   - Tagged context selection: `@staging AND @region-us`

3. **Cascading Rules (CSS-inspired)**
   - Global defaults apply to all schemas
   - Workspace defaults override globals (team-shared settings)
   - Schema-level defaults override workspace
   - Field-level specifications override all
   - Enable teams to share standards while customizing

4. **CLI Generation Tool**
   - Parse DSL files (`.td` format)
   - Generate data to multiple outputs: JSON, CSV, SQL inserts
   - Volume control: `--count=1000` parameter
   - Clear error messages with fail-fast validation
   - Deterministic generation (repeatable with seed values)

5. **Git-Friendly DSL Syntax**
   - Text-based format (compact notation with `@` references)
   - Meaningful diffs when patterns change
   - Comment support for documentation
   - Self-explanatory syntax for QA testers

6. **Generated Data Metadata** (platform-ready)
   - Generation timestamp
   - Source pattern reference (which `.td` file)
   - Pattern version/hash
   - Enables future "lift to platform" capability

**Success Validation:**

- QA tester defines 10-15 field schema in under 30 minutes
- Generate 1000+ varied records in under 1 minute
- Reference context from previous generation
- Share DSL file with teammate who uses it without explanation
- Iterate 5+ times in one session (modify pattern → regenerate → verify)

### Growth Features (Post-MVP)

**Generation Profiles:**

- Multiple pattern sets per schema: `StandardUser`, `EdgeCaseUser`, `PerformanceTestUser`
- Profile composition: combine multiple profiles
- Profile inheritance: `HeavyTruck extends StandardVehicle`
- Reduces duplication when pattern library grows

**Temporal Patterns:**

- Time-series data generation: "30 days of transactions"
- Date distributions: "realistic weekday vs weekend patterns"
- Temporal relationships: "order date before shipment date"
- Time-of-day patterns: "peak hours vs off-hours"

**Advanced Context Operations:**

- Context transformations: filter, sample, aggregate existing data
- Multi-source context: combine data from multiple contexts
- Context validation: ensure referenced data meets requirements

**Pattern Discovery & Recommendations:**

- Analyze existing data to suggest generation patterns
- Detect pattern similarities across team repository
- Recommend existing patterns for new schemas

### Vision Features (Platform)

**Stateful Test Data Platform:**

- Remote generation via API
- Generated datasets have lifecycle: active → archived → deleted
- Data state tracking: which test scenarios are using which datasets
- Dataset versioning and rollback
- Scheduled regeneration (keep test data fresh)

**Team Workspace:**

- Centralized pattern library management
- Team-wide test data catalog
- Access control and permissions
- Pattern approval workflows (review before team-wide)
- Usage analytics (which patterns are most valuable)

**Data Lifecycle Management:**

- Mark generated data as "staging", "performance", "integration"
- Automatic cleanup of stale test data
- Data retention policies
- Environment-specific contexts (dev/staging/prod patterns)

**Integration Ecosystem:**

- Test framework integrations (Jest, Cypress, Selenium)
- CI/CD pipeline integration (generate data during test runs)
- Database seeding automation
- API mock data generation

---

## Developer Tool Specific Requirements

**Language & Ecosystem:**

- TypeScript/Node.js implementation (MVP)
- Cross-platform support: Windows, macOS, Linux
- Node.js 18+ runtime requirement
- Zero external parser dependencies (hand-written parser)

**Package Distribution:**

- npm package: `@testdata-ai/core` (DSL parser + generator)
- npm package: `@testdata-ai/cli` (command-line tool)
- CLI installed globally: `npm install -g @testdata-ai/cli`
- Library usable programmatically in test scripts

**Installation Methods:**

```bash
# Global CLI installation
npm install -g @testdata-ai/cli

# Library for programmatic use
npm install --save-dev @testdata-ai/core

# Quick start
npx @testdata-ai/cli init
```

**API Surface:**

Core library provides:

- `parseSchema(dslContent: string): SchemaAST` - Parse DSL to AST
- `generateData(schema: SchemaAST, options: GenerateOptions): Record[]` - Generate data
- `loadContext(source: string | Record[]): Context` - Load context data
- `validateSchema(schema: SchemaAST): ValidationResult` - Validate before generation

CLI provides:

- `td generate <file.td> [options]` - Generate data from DSL file
- `td validate <file.td>` - Validate DSL syntax and semantics
- `td init` - Create starter template
- `td version` - Show version info

**Code Examples & Documentation:**

Comprehensive examples for:

- Basic schema definitions (10+ common use cases)
- Context usage patterns (reference existing data)
- Cascading rules setup (team workspace defaults)
- Temporal patterns (when available)
- Integration with testing frameworks

Documentation structure:

- Getting Started guide (5-minute tutorial)
- DSL syntax reference
- Generator patterns library
- API documentation
- Migration guides (when breaking changes occur)

**VS Code Extension (Post-MVP):**

- Syntax highlighting for `.td` files
- Auto-completion for field types and generators
- Inline error reporting
- Format on save
- Preview generated data samples

---

## CLI Tool Specific Requirements

**Command Structure:**

Primary commands:

- `td generate <schema.td>` - Generate test data
- `td validate <schema.td>` - Check DSL validity
- `td init [template]` - Initialize new schema
- `td version` - Version information
- `td help [command]` - Contextual help

Generation options:

```bash
td generate users.td \
  --count 1000 \
  --format json \
  --output users.json \
  --context staging-data.json \
  --seed 12345
```

**Output Formats:**

- JSON (default): Single file or line-delimited JSON
- CSV: With headers, configurable delimiters
- SQL: INSERT statements for database seeding
- Custom: Via adapter plugins (future)

**Configuration Methods:**

1. **CLI flags** (highest priority): `--count 1000 --format csv`
2. **Config file** (`.tdconfig.json`): Project-level defaults
3. **Environment variables**: `TD_DEFAULT_COUNT=1000`
4. **Inline DSL** (schema-level): `@defaults count=500`

Example `.tdconfig.json`:

```json
{
  "defaultCount": 1000,
  "defaultFormat": "json",
  "contextPath": "./contexts",
  "outputPath": "./generated",
  "seed": null
}
```

**Interactive Mode (Future):**

- `td generate --interactive` prompts for options
- Preview sample data before full generation
- Iterative refinement workflow

**Scripting Support:**

Exit codes:

- 0: Success
- 1: Validation error (invalid DSL)
- 2: Generation error (runtime failure)
- 3: File system error (missing file, permission denied)

JSON output mode for parsing:

```bash
td validate schema.td --json
# {"valid": false, "errors": [{"line": 5, "message": "..."}]}
```

**Error Message Quality:**

Non-programmer friendly errors:

```
Error in users.td at line 12:
  email: email template={{firstName}}.{{lastName}}@test.com

  Problem: Field 'firstName' referenced but not defined in schema

  Fix: Add firstName field to schema OR use @context.firstName

  Example:
    firstName: faker("firstName")
    email: template={{firstName}}.{{lastName}}@test.com
```

**Shell Integration (Future):**

- Bash/Zsh completion scripts
- Fish shell completion
- PowerShell completion (Windows)

---

## Functional Requirements

### Core Data Generation

**FR1:** Users can define data schemas with field names, types, and generators

- Fields can be: primitives (string, number, boolean), faker patterns, custom generators
- Type inference by default, explicit type specification when needed

**FR2:** Users can generate test data from schemas with configurable volume

- Specify count: 10 records to 1 million+ records
- Deterministic generation with optional seed values
- Output to multiple formats (JSON, CSV, SQL)

**FR3:** Users can define uniqueness constraints on single or composite fields

- Single field unique: `id: uuid unique`
- Composite unique: `unique(email, tenantId)` - combination must be unique
- System validates uniqueness during generation

**FR4:** Users can create cross-field templates that reference other fields

- Template syntax: `{{fieldName}}` references within same record
- Example: `email: template={{firstName}}.{{lastName}}@company.com`
- Evaluated after dependencies generated

**FR5:** Users can define relationships between entities (generate new OR reference context)

- Generate related records: `author: @schema:User`
- Reference existing data: `author: @context.users.random`
- One-to-many, many-to-one, many-to-many relationships

### Context Management

**FR6:** Users can load existing data as context for generation

- Load from files: JSON, CSV, database exports
- Load programmatically: pass data to API
- Context available via `@context` references

**FR7:** Users can reference context data in generation patterns

- Random selection: `@context.users.random`
- Filtered selection: `@context.users.where(role='admin').random`
- Specific field access: `@context.users[0].email`

**FR8:** Users can tag contexts and select by tags in patterns

- Tag contexts: `@context('staging', 'region-us')`
- Select by tags: `@context.users@staging.random`
- Combine tags with AND/OR: `@staging AND @region-us`

**FR9:** Users can save generated data as context for future use

- CLI flag: `--save-context users-baseline`
- Metadata included: timestamp, source pattern, version
- Referenceable in subsequent generations

### Cascading Rules & Defaults

**FR10:** Users can define global defaults that apply to all schemas

- Global config file: applies across all projects
- Common settings: default generators, naming conventions
- Override at lower levels

**FR11:** Users can define workspace defaults for team-shared settings

- Workspace config: `.tdconfig.json` in project root
- Shared via version control
- Team standards without per-schema duplication

**FR12:** Users can define schema-level defaults that override workspace settings

- Schema preamble: `@defaults` section
- Apply to all fields in that schema unless overridden

**FR13:** Users can specify field-level settings that override all defaults

- Highest priority: explicit field specification
- Final control over individual field behavior

### CLI Tool Operations

**FR14:** Users can generate test data via command-line interface

- Single command: `td generate schema.td`
- Options for count, format, output destination
- Clear progress indication for large generations

**FR15:** Users can validate DSL syntax and semantics before generation

- Validate command: `td validate schema.td`
- Check for: syntax errors, undefined references, circular dependencies
- Fast feedback without full generation

**FR16:** Users can initialize new schemas from templates

- Init command: `td init [template]`
- Templates: basic-schema, with-relationships, with-context
- Quick start for common patterns

**FR17:** System provides clear, actionable error messages for non-programmers

- Error location: file, line number, column
- Problem description: what went wrong
- Suggested fix: how to resolve
- Example code when relevant

### Pattern Sharing & Reusability

**FR18:** Users can save DSL patterns as text files

- `.td` file format
- Human-readable, self-documenting
- Version control friendly (meaningful diffs)

**FR19:** Users can share DSL patterns via version control

- Git-compatible text format
- Comment support for documentation
- No binary or opaque formats

**FR20:** Users can discover and use patterns from team repository

- Browse `.td` files in shared repository
- Copy/modify existing patterns
- Reference shared contexts

**FR21:** Users can compose patterns from reusable components

- Import other schemas: `@import: ./common/user.td`
- Reference shared generators: `@workspace.generators.customEmail`
- Build complex patterns from simple pieces

### Data Output & Integration

**FR22:** System outputs generated data in multiple formats

- JSON: single file or line-delimited
- CSV: with headers, configurable delimiter
- SQL: INSERT statements for database seeding

**FR23:** Generated data includes metadata for tracking

- Generation timestamp
- Source pattern file and version
- Seed value (if used for determinism)
- Enables traceability and reproducibility

**FR24:** Users can generate data programmatically via library API

- Import library in test scripts
- Generate data inline during test setup
- Integrate with testing frameworks

**FR25:** System supports deterministic generation with seed values

- Same seed → same data output
- Reproducible test scenarios
- Debug failing tests with exact data

### Validation & Error Prevention

**FR26:** System validates DSL syntax during parsing

- Detect syntax errors before generation
- Report multiple errors in single pass
- Provide context and suggestions

**FR27:** System validates semantic correctness of schemas

- Check for undefined field references
- Detect circular dependencies
- Validate constraint compatibility

**FR28:** System prevents uniqueness constraint violations

- Track generated values during generation
- Retry on collision (up to limit)
- Fail with clear message if impossible to satisfy

**FR29:** System validates context references exist before generation

- Check context data loaded successfully
- Verify referenced fields exist in context
- Fail fast with actionable error

### Platform-Ready Foundations (MVP)

**FR30:** Generated data includes metadata for future platform lift

- Pattern reference (source `.td` file)
- Generation parameters (count, seed, options)
- Version information
- Enables migration to platform later

**FR31:** System supports exporting generation history

- Log of what was generated, when, with what settings
- Enables audit trail
- Foundation for platform lifecycle management

---

## Non-Functional Requirements

### Performance

**NFR1:** Generate 1000 records in under 1 minute on standard developer hardware

- Target: ~100-500 records/second depending on complexity
- Minimal memory overhead (streaming generation for large datasets)
- No performance degradation with complex schemas (within reason)

**NFR2:** Validate DSL schemas in under 1 second for typical files

- Fast feedback loop for iterative development
- Parser optimized for speed
- Incremental validation when possible

**NFR3:** Support generation of 1 million+ records without memory issues

- Streaming output for large datasets
- Chunked processing to avoid memory limits
- Progress indication for long-running generations

### Security

**NFR4:** No execution of arbitrary code from DSL files

- Declarative DSL only (no embedded scripts)
- Sandboxed generator execution
- Prevents malicious pattern files

**NFR5:** Context data loaded safely without code injection risks

- JSON/CSV parsing uses safe libraries
- SQL output properly escaped
- Prevents injection attacks via generated data

### Usability

**NFR6:** DSL syntax readable by QA testers with minimal coding experience

- Natural language-like constructs
- Minimal syntactic noise
- Self-documenting patterns

**NFR7:** Error messages actionable without developer assistance

- Plain language descriptions
- Specific problem location
- Suggested fixes with examples

**NFR8:** Common use cases achievable in under 30 minutes

- Define basic schema: 5-10 minutes
- Add relationships: 15 minutes
- Use context: 20 minutes
- First successful generation: under 30 minutes

### Maintainability

**NFR9:** DSL patterns remain valid across minor version updates

- Backward compatibility within major versions
- Migration guides for breaking changes
- Deprecation warnings before removal

**NFR10:** Clear separation between DSL core, generators, and adapters

- Core handles parsing and AST
- Generators produce data
- Adapters transform output formats
- Each layer independently testable and extensible

### Extensibility

**NFR11:** Custom generators can be added without modifying core

- Plugin architecture for generators
- User-defined generator functions
- Community generator marketplace (future)

**NFR12:** New output formats supported via adapter pattern

- Adapters transform internal data representation
- Built-in adapters: JSON, CSV, SQL
- Custom adapters via plugin system (future)

---

_This PRD captures the complete vision for testdata-ai - from individual QA tester productivity to organizational test data platform._

_It establishes the foundation for downstream workflows: UX design (CLI experience), architecture (parser + generator + adapters), and epic breakdown (phased implementation)._

_Created through collaborative discovery between Tobi and AI Product Manager._
