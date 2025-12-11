# Product Brief: testdata-ai

**Date:** 2025-12-11
**Author:** Tobi
**Context:** Personal pain point from repeated experience across multiple projects

---

## Executive Summary

testdata-ai is a DSL-powered Test Data Management Platform that enables QA testers to generate complex, realistic test data without programming expertise.

**The Problem:** Performance testing requires large datasets, but current approaches force oversimplified generation that produces repetitive, unrealistic data. QA testers depend on developers to build test data tooling or spend hours manually creating data for each test scenario.

**The Solution:** A declarative DSL with context awareness and cascading rules that lets testers define data patterns once and generate thousands of realistic variations. Individual testers write DSL files for their scenarios, teams share patterns via version control, and organizations build reusable test data libraries over time.

**Key Innovation:** Context management enables data reuse across scenarios - generate baseline data, save as context, reference in future tests. Combined with cascading rules (global → workspace → schema), teams establish shared standards while maintaining flexibility for specific test cases.

**Target Users:** QA testers with minimal coding experience working on development teams. MVP focuses on individual productivity with built-in collaboration (Git-friendly text files), with future team workspace features for centralized pattern management.

**MVP Scope:** Context management, cascading rules, schema definitions with basic patterns, and CLI generation tool. Temporal patterns and generation profiles in post-MVP releases.

---

## Core Vision

### Initial Vision

Tobi has experienced the test data generation problem repeatedly across multiple projects. The core frustration: when creating performance tests requiring large datasets, the data itself becomes oversimplified because generation must be trivial. This creates unrealistic test scenarios that don't properly stress systems.

The vision is to make complex test data generation easier - enabling realistic relationships, varied patterns, and sophisticated scenarios without the current manual effort or programming overhead.

### Problem Statement

**The Performance Testing Paradox:**
- Performance tests require large volumes of test data (thousands to millions of records)
- Current approaches force oversimplified data generation because complexity doesn't scale
- Result: Repetitive, unrealistic data that fails to expose real-world system behavior
- Creating complex, varied test data manually is so tedious that teams simply don't do it

**The Broader Test Data Challenge:**
- Each project rebuilds test data generation from scratch
- No reusable patterns or organizational standards
- QA testers depend on developers to create test data tooling
- Realistic relationships between entities are hard to express and maintain

**Concrete Example - Vehicle Tolls Project:**

In a past project calculating vehicle tolls, the team needed:
- Diverse vehicle configurations (trailer types, axle counts, emission classes, weight categories)
- Various transport routes with different toll zones
- Realistic combinations to test edge cases in toll calculations

**The Problem:**
- Vehicle configurations required deep domain knowledge to create
- Routes were created manually, one by one
- Testers spent time understanding vehicle details instead of focusing on toll calculation logic
- No way to easily generate "1000 varied vehicles with realistic distributions"
- Creating temporal patterns (week of transactions, monthly trends) was prohibitively manual

**What Was Needed:**
- Define vehicle characteristics once, generate variations automatically
- Focus test cases on specific scenarios without manual data setup
- Realistic temporal patterns for performance and trend testing

### Proposed Solution

**A DSL-powered Test Data Management Platform** that enables QA testers to:

1. **Define data structures once, generate variations at scale**
   - Describe what a vehicle looks like, what a route looks like
   - Generate thousands of realistic variations automatically
   - Focus on test logic, not data creation mechanics

2. **Three-layer architecture for progressive sophistication:**
   - **Schema**: Define the structure (Vehicle, Route, Transaction)
   - **Generation Profiles**: Define patterns and characteristics ("heavy trucks", "urban routes", "peak hour traffic")
   - **Context**: Reuse and reference existing/generated data

3. **Realistic data patterns without programming:**
   - Relationships between entities generated automatically
   - Temporal patterns as first-class feature (time-series, distributions, trends)
   - QA-tester-friendly syntax (minimal coding experience required)

4. **Built for performance testing reality:**
   - Scales from 10 records to millions without changing the definition
   - Complex patterns that generate realistic, varied data
   - No more "simple because it has to be" test data

**Core Philosophy:**
- Declarative over imperative (describe WHAT, not HOW)
- Pattern-based generation (not test case enumeration)
- Progressive sophistication (start simple, grow to organizational standards)
- Fail-fast with clear validation (no silent corrections)

### Key Differentiators

**Individual-First, Team-Enabled Design:**
- Individual QA tester writes DSL files for specific test scenarios
- Definitions are immediately shareable (text files, version control)
- No centralized service required for core value
- Teams naturally build shared libraries of patterns
- Future web service enhances collaboration but isn't a prerequisite

**Progressive Sophistication Path:**
1. **Individual**: Custom patterns for specific test cases
2. **Team**: Shared schemas and profiles in version control
3. **Organization**: Centralized team workspace with remote generation (future)

**Focus on QA Tester Autonomy:**
- Minimal coding experience required
- No dependency on developers for test data tooling
- Readable syntax (self-documenting patterns)
- Fast iteration on test scenarios

---

## Target Users

### Primary Users: Individual QA Testers

**Profile:**
- QA tester working on a software development team
- Minimal coding experience (not professional developers)
- Needs test data for functional testing, edge cases, and performance scenarios
- Currently depends on developers to build test data tooling or creates data manually
- Comfortable with text files and version control basics

**Current Workflow Pain:**
- Manual test data creation is tedious and error-prone
- Requesting developer help for test data generation creates bottlenecks
- Simple scripts generate unrealistic, repetitive data
- Each new test scenario requires rebuilding data generation from scratch
- Complex relationships and temporal patterns are prohibitively difficult

**What They Need:**
- Write DSL definitions for their specific test scenarios
- Generate varied, realistic test data without programming
- Iterate quickly on test data patterns
- Share definitions with teammates (version control)
- Focus on test logic, not data creation mechanics

### Secondary Users: QA Teams (Collective)

**Team Context:**
- Multiple QA testers working on the same application
- Need consistent test data across team members
- Build shared library of reusable schemas and generation profiles
- Collaborate on test data patterns via version control

**Team Benefits:**
- Share `.td` DSL files in Git repository (day one capability)
- Reuse schemas across different test scenarios
- Build organizational test data standards over time
- New team members discover existing patterns through shared repository
- Consistent data generation across the team

**Future: Team Workspace (Web Service)**
- Generate data remotely via API
- Save generated datasets as reusable context
- Manage organizational patterns centrally
- Team-wide test data library with versioning

### User Journey: From Baseline to Reusable Patterns

**Phase 1: Generate Baseline Data**
1. QA tester writes DSL definition for test scenario (e.g., vehicle configurations)
2. Generates 1000 realistic, varied records via CLI
3. Manually modifies 5-10 records to create specific edge cases
   - Example: Vehicle with unusual axle configuration, overweight trailer, edge-case emission class
4. Uses the modified dataset for testing

**Phase 2: Edge Case Becomes Pattern**
1. Tester realizes this edge case is valuable for other scenarios
2. Extracts manual modifications into DSL generation rule/profile
3. Shares with team (Git commit): "Here's the 'overweight-trailer' profile"
4. Other testers use it as-is or as base for their variations

**Phase 3: Team Library Emerges**
1. Collection of edge case profiles accumulates over time
2. New testers discover existing patterns in repository
3. Test scenarios compose multiple profiles together
4. Organizational standards emerge organically from proven patterns

**Key Insight:**
Success is not "zero manual work" - it's **reducing 1000 manual records to 5 manual tweaks**, then evolving those tweaks into shareable patterns when they prove valuable.

---

## Success Metrics

### Individual Tester Productivity

**Time Savings:**
- Baseline data generation: **Minutes instead of hours**
  - Current: Hours to manually create or script 1000 varied records
  - Target: Minutes to write DSL and generate
- Manual edge case effort: **5 records instead of 1000**
  - Generate realistic baseline, tweak only the specific edge cases needed
  - 99.5% reduction in manual data creation

**Iteration Speed:**
- Test scenario changes: **Seconds to regenerate** with modified patterns
- Current: Must rebuild scripts or manually recreate datasets
- Target: Edit DSL, regenerate, continue testing

### Team Collaboration

**Pattern Reuse:**
- Edge case → reusable pattern: **One sharing action** (Git commit)
- Team adoption: **Measurable increase in shared pattern usage over time**
- New team member onboarding: **Discover existing patterns through repository**

**Quality Indicators:**
- Test data realism: **Subjective improvement** (varied vs repetitive)
- Edge case coverage: **More edge cases tested** (because they're easier to create)
- Performance test validity: **Data complexity matches production** scenarios

### MVP Success Criteria

**A QA tester can:**
1. Write a DSL definition for a moderately complex schema (10-15 fields) in **under 30 minutes**
2. Generate 1000+ varied, realistic records in **under 1 minute**
3. Share the definition with a teammate who can **use it without explanation**
4. Iterate on patterns **5+ times in a testing session** without friction

**Team adoption indicator:**
- At least **3 team members actively using** shared DSL definitions within first month
- Repository contains **10+ reusable patterns** within first quarter

---

## MVP Scope

### Core Features (v1 - Must Have)

**1. Context Management**
- Reference existing or previously generated data within new generation rules
- Load context from files (JSON, CSV, database exports)
- Reference context data in relationships: `@context.users.random`, `@context.regions`
- Enable data reuse across test scenarios
- Support tagged context selection: `@staging AND @region-us`

**Why Critical:** Without context, every generation is isolated. Context enables the workflow: generate baseline → save as context → use in next scenario. This is the foundation of reusability.

**2. Cascading Rules (CSS-inspired)**
- Global defaults apply to all schemas
- Workspace defaults override globals (team-shared settings)
- Schema-level defaults override workspace
- Field-level specifications override all

**Hierarchy Example:**
```
Global: id format = UUID
Workspace: id format = Sequential Integer (team preference)
Schema: User.id = UUID (this schema needs UUIDs)
Field: User.id = Custom(prefix="USR-") (specific override)
```

**Why Critical:** Enables teams to share common patterns while customizing where needed. Without cascading, every schema must redefine everything, killing reusability.

**3. Schema Definitions with Basic Patterns**
- Define data structure (fields, types)
- Basic field generators: faker patterns, ranges, templates
- Uniqueness constraints (single field, composite)
- Cross-field templates: `{{firstName}}.{{lastName}}@test.com`
- Relationship support: generate new OR reference context

**4. CLI Tool for Generation**
- Parse DSL files (`.td` format)
- Generate data to multiple outputs: JSON, CSV, SQL inserts
- Clear error messages with fail-fast validation
- Volume control: `--count=1000` parameter

**5. Git-Friendly DSL Syntax**
- Text-based format (Option B style: compact notation with `@` references)
- Meaningful diffs when patterns change
- Comment support for documentation
- Self-explanatory syntax for QA testers

### Essential Features (v2 - Post-MVP)

**Temporal Patterns**
- Time-series data generation: "30 days of transactions"
- Date distributions: "realistic weekday vs weekend patterns"
- Temporal relationships: "order date before shipment date"
- Time-of-day patterns: "peak hours vs off-hours"

**Why Post-MVP:** Valuable for performance testing but not blocking. Testers can manually specify dates in v1, add temporal generators in v2.

### Future Features (v3+ - Lower Priority)

**Generation Profiles**
- Multiple pattern sets per schema: "standard-vehicle", "overweight-trailer", "edge-case-emissions"
- Profile composition: combine multiple profiles
- Profile inheritance: "heavy-truck extends standard-vehicle"

**Why Lower Priority:** Can be simulated with separate schema definitions initially. Profiles become valuable when pattern library grows and duplication becomes painful.

**Team Workspace / Web Service**
- Remote generation via API
- Save generated datasets as managed context
- Central pattern library
- Team collaboration features
- Version management for contexts and schemas

### Out of Scope for MVP

- Visual DSL editor (text files only for v1)
- Automated schema extraction from examples (manual DSL writing)
- Complex scripting/programming within DSL (declarative only)
- Stateful temporal evolution (no Day 1 → Day 2 mutations)
- Real-time data generation (batch generation only)
- Built-in data masking (separate adapter concern)

### MVP Success Criteria

A successful MVP enables a QA tester to:

1. **Define a schema** with 10-15 fields including relationships in under 30 minutes
2. **Reference context** from a previous test run in their new generation
3. **Use workspace defaults** shared by the team without redefining common patterns
4. **Generate 1000+ records** in under 1 minute
5. **Share the DSL file** with a teammate who can use it immediately
6. **Iterate quickly** - modify pattern, regenerate, verify in seconds

**Technical Validation:**
- DSL parser handles moderate complexity without performance issues
- Context loading supports 10k+ record datasets
- Cascading rule resolution is deterministic and debuggable
- Error messages are actionable for non-programmers

## Technical Preferences

**Implementation Language:** TypeScript/Node.js ecosystem
- Aligns with QA team tooling familiarity
- Rich ecosystem for parsing and CLI tools
- Cross-platform support (Windows, macOS, Linux)

**DSL Approach:** External DSL with hand-written parser
- Based on technical research conclusions (December 2025)
- Maximum control over error messages (critical for QA audience)
- Zero external parser dependencies
- Option B syntax style: compact notation with `@` references

**Architecture:**
```
DSL Core (patterns, schemas, context-agnostic)
    ↓
Adapters (output transformers: JSON, CSV, SQL, API mocks)
    ↓
Tooling (CLI, future: visual graph, validation)
```

**Parser Architecture:** Multi-pass compilation
1. Lexing/Scanning → Tokens
2. Parsing → AST
3. Semantic Analysis → Validated AST (symbol table, type checking, reference resolution)
4. Generation → Test data output

**Design Philosophy:**
- Declarative over imperative
- Type inference by default, explicit when needed
- Fail-fast validation with actionable error messages
- Git-friendly text format
- Progressive sophistication (simple cases trivial, complex cases possible)

---

## Supporting Materials

This product brief was informed by:
- **Brainstorming Session** (2025-11-29): Explored DSL design approaches, identified three-layer architecture, established core principles
- **Technical Research** (2025-12-03): Evaluated 5 DSL implementation approaches, recommended external DSL with hand-written TypeScript parser
- **Personal Experience:** Vehicle tolls project and multiple performance testing scenarios across different projects

**Key Research Findings:**
- External DSL optimal for QA audience (proven by Gherkin's 15+ year success)
- Hand-written parser recommended for moderate complexity DSL
- Declarative syntax superior to imperative for non-programmers
- Cascading rules pattern (CSS-inspired) enables organizational standards with flexibility

---

_This Product Brief captures the vision and requirements for testdata-ai._

_It was created through collaborative discovery and reflects the unique needs of this project._

**Next Steps:** The PRD workflow will transform this brief into detailed product requirements, functional specifications, and technical requirements for implementation.
