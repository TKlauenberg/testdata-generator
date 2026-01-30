# Epic 5: Advanced Field Generation

QA testers can generate realistic personal data, temporal patterns, and complex field types for authentic test scenarios.

## Story 5.1: Identity Generators (UUID, Sequential, NanoID)

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

## Story 5.2: Personal Data Generators (Names, Emails)

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

## Story 5.3: Temporal Generators (Dates, Timestamps, Ranges)

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

## Story 5.4: Text Generators (Words, Sentences, Paragraphs)

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

## Story 5.5: Selection Generators (Pick, Weighted Pick)

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
