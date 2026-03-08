# Epic 9: Cascading Configuration System

Teams can establish shared test data standards while individuals maintain flexibility for specific test scenarios.

## Epic 8 Retrospective Follow-Through

Epic 8 introduced configuration-sensitive behavior before the full configuration system was defined. Epic 9 must resolve that gap by defining one explicit model for where configuration lives, how it overrides, and how users understand the effective result.

**Epic 9 must explicitly cover:**

- built-in defaults, global config, workspace config, schema defaults, field-level settings, and CLI flags
- ownership boundaries between CLI/workspace configuration and schema semantics
- Epic 8 context-related behavior such as default context storage and `--save-context-dir`
- user-visible explainability for resolved configuration values and their source layers
- documentation that future config work can extend without inventing special cases

## Story 9.1: Global Configuration Defaults

As a **QA tester**,
I want **global defaults that apply to all my projects**,
So that **I don't repeat common settings in every schema**.

**Acceptance Criteria:**

**Given** I have common settings across all projects
**When** I implement global config in `packages/cli/src/config/defaults.ts`
**Then** a global config file location is defined (e.g., `~/.tdconfig.json`)
**And** global config supports default generator settings
**And** global config supports default output format and count
**And** global config supports user-scope context defaults where appropriate
**And** global config is loaded automatically by the CLI
**And** global config values have lowest priority (overridden by all other levels)
**And** missing global config file is not an error (use built-in defaults)
**And** unit tests verify global config loading
**And** documentation explains global config options

## Story 9.2: Workspace Configuration

As a **QA team member**,
I want **team-shared workspace configuration**,
So that **all team members use consistent test data standards**.

**Acceptance Criteria:**

**Given** I work in a team with shared standards
**When** I implement workspace config in `packages/cli/src/config/configLoader.ts`
**Then** a `.tdconfig.json` file in project root is recognized as workspace config
**And** workspace config overrides global defaults
**And** workspace config supports all same options as global config
**And** workspace config can define team-shared context defaults without conflicting with schema semantics
**And** workspace config can specify default generator mappings
**And** workspace config is version-controlled with the project
**And** the CLI automatically discovers workspace config from current directory or parent directories
**And** unit tests verify workspace config loading and priority
**And** Gherkin tests verify workspace config overrides global defaults

## Story 9.3: Schema-Level Defaults

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

## Story 9.4: Configuration Priority and Merging

As a **developer**,
I want **clear configuration priority rules**,
So that **configuration merging is predictable and correct**.

This story also closes the Epic 8 retrospective gap by defining the canonical configuration model for the product.

**Acceptance Criteria:**

**Given** I have configuration at multiple levels
**When** I implement config merging in `packages/cli/src/config/configLoader.ts`
**Then** configuration priority is: field-level > schema-level > workspace > global > built-in
**And** higher priority config completely overrides lower priority (no deep merging)
**And** the merger validates configuration values are valid
**And** the implementation defines a canonical configuration model describing which settings belong at each layer
**And** the model explicitly covers Epic 8 context settings such as default context storage and `--save-context-dir`
**And** the model distinguishes CLI/workspace configuration from schema-level semantics
**And** the CLI displays effective configuration with `td config show` command
**And** the config show command indicates source of each setting
**And** documentation includes a configuration scope matrix and precedence examples for common workflows
**And** unit tests verify priority order for all config options
**And** documentation clearly explains cascading rules

---
