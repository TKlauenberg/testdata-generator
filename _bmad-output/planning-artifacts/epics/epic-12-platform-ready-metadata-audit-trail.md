# Epic 12: Platform-Ready Metadata & Audit Trail

Organizations can track test data generation history and prepare for future platform evolution.

## Story 12.1: Generation Metadata Tracking

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

## Story 12.2: Generation History Logging

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

## Story 12.3: Pattern Version Tracking

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

## Story 12.4: Platform Migration Preparation

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
