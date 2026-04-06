# Project Structure & Boundaries

## Complete Project Directory Structure

```
testdata-generator/
├── README.md                           # Project overview, quick start
├── LICENSE                             # MIT license
├── package.json                        # Bun workspaces root
├── bunfig.toml                         # Bun configuration
├── tsconfig.json                       # Shared TypeScript config (strict mode)
├── .gitignore
├── .prettierrc                         # Prettier configuration
├── eslint.config.js                    # ESLint flat config (v9)
├── .github/
│   └── workflows/
│       ├── ci.yml                      # CI pipeline (lint, test, build)
│       └── release.yml                 # npm publish workflow
│
├── docs/                               # Documentation
│   ├── getting-started.md             # 5-minute tutorial
│   ├── dsl-reference.md               # Complete DSL syntax reference
│   ├── generators.md                  # Built-in generator documentation
│   ├── api.md                         # Programmatic API docs
│   └── examples/                      # Example .td files
│       ├── basic-schema.td
│       ├── with-relationships.td
│       └── with-context.td
│
├── packages/
│   ├── core/                          # @testdata-generator/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # Public API exports
│   │       │
│   │       ├── scanner/               # Lexical Analysis
│   │       │   ├── index.ts           # export { scan }
│   │       │   ├── scanner.ts         # Scanner class
│   │       │   ├── tokens.ts          # Token union types
│   │       │   ├── keywords.ts        # Keyword → TokenKind map
│   │       │   └── scanner.test.ts
│   │       │
│   │       ├── parser/                # Syntax Analysis
│   │       │   ├── index.ts           # export { parse }
│   │       │   ├── parser.ts          # Recursive descent parser
│   │       │   ├── ast.ts             # AST node types (SchemaNode, etc.)
│   │       │   ├── errors.ts          # Parser diagnostic factories
│   │       │   └── parser.test.ts
│   │       │
│   │       ├── analyzer/              # Semantic Analysis
│   │       │   ├── index.ts           # export { analyze }
│   │       │   ├── analyzer.ts        # Semantic analysis orchestration
│   │       │   ├── symbolTable.ts     # Symbol table implementation
│   │       │   ├── typeChecker.ts     # Type inference and checking
│   │       │   ├── referenceResolver.ts # @schema/@context resolution
│   │       │   ├── errors.ts          # Analyzer diagnostic factories
│   │       │   └── analyzer.test.ts
│   │       │
│   │       ├── generator/             # Data Generation
│   │       │   ├── index.ts           # export { generate }
│   │       │   ├── generator.ts       # Generation orchestration
│   │       │   ├── rng.ts             # Xoshiro256** PRNG implementation
│   │       │   ├── generators/        # Built-in generators
│   │       │   │   ├── index.ts       # Generator registry
│   │       │   │   ├── primitives.ts  # int, float, bool, string
│   │       │   │   ├── identity.ts    # uuid, sequential, nanoid
│   │       │   │   ├── personal.ts    # firstName, lastName, email
│   │       │   │   ├── temporal.ts    # date, timestamp, dateRange
│   │       │   │   ├── text.ts        # word, sentence, paragraph
│   │       │   │   └── selection.ts   # pick, weightedPick
│   │       │   ├── template.ts        # Cross-field template engine
│   │       │   ├── uniqueness.ts      # Uniqueness constraint tracker
│   │       │   └── generator.test.ts
│   │       │
│   │       ├── context/               # Context Management
│   │       │   ├── index.ts           # export { loadContext, saveContext }
│   │       │   ├── contextManager.ts  # Context loading/saving orchestration
│   │       │   ├── loaders/
│   │       │   │   ├── jsonLoader.ts  # JSON file loader
│   │       │   │   └── csvLoader.ts   # CSV file loader
│   │       │   ├── selector.ts        # Tag-based context selection
│   │       │   └── context.test.ts
│   │       │
│   │       ├── adapters/              # Output Adapters
│   │       │   ├── index.ts           # export { JsonAdapter, CsvAdapter, SqlAdapter }
│   │       │   ├── adapter.ts         # Base adapter interface
│   │       │   ├── jsonAdapter.ts     # JSON output formatting
│   │       │   ├── csvAdapter.ts      # CSV output formatting
│   │       │   ├── sqlAdapter.ts      # SQL INSERT generation
│   │       │   └── adapters.test.ts
│   │       │
│   │       └── common/                # Shared Utilities
│   │           ├── result.ts          # Result<T,E> type + ok/err helpers
│   │           ├── diagnostic.ts      # Diagnostic type + factories
│   │           ├── location.ts        # SourceLocation type
│   │           └── version.ts         # Version constant
│   │
│   └── cli/                           # @testdata-generator/cli
│       ├── package.json
│       ├── tsconfig.json
│       ├── bin/
│       │   └── td.ts                  # CLI entry point (#!/usr/bin/env bun)
│       └── src/
│           ├── index.ts               # CLI setup with Commander.js
│           ├── commands/
│           │   ├── generate.ts        # td generate <file.td>
│           │   ├── validate.ts        # td validate <file.td>
│           │   ├── init.ts            # td init [template]
│           │   └── version.ts         # td version
│           ├── formatters/
│           │   ├── errorFormatter.ts  # Rust-style error formatting
│           │   ├── colors.ts          # Terminal color utilities
│           │   └── formatters.test.ts
│           ├── config/
│           │   ├── configLoader.ts    # .tdconfig.json loading
│           │   └── defaults.ts        # Default configuration values
│           └── cli.test.ts            # CLI integration tests
│
└── examples/                          # Example projects for users
    ├── basic/
    │   └── users.td
    ├── ecommerce/
    │   ├── customers.td
    │   ├── products.td
    │   └── orders.td
    └── with-context/
        ├── existing-users.json
        └── related-orders.td
```

## Architectural Boundaries

### Package Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      @testdata-generator/cli                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Commands (generate, validate, init)                 │    │
│  │  Error Formatter (Rust-style)                        │    │
│  │  Config Loader (.tdconfig.json)                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ imports                          │
│                           ▼                                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     @testdata-generator/core                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Scanner  │→ │  Parser   │→ │ Analyzer  │→ │Generator │ │
│  │  (scan)   │  │  (parse)  │  │ (analyze) │  │(generate)│ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│        │              │              │              │        │
│        ▼              ▼              ▼              ▼        │
│    Token[]        Program      ValidatedProg  AsyncIterable │
│                     (AST)                       <Record>     │
│                                                     │        │
│                                      ┌──────────────┼────────│
│                                      ▼              ▼        │
│                               ┌──────────┐   ┌──────────┐   │
│                               │ Context  │   │ Adapters │   │
│                               │ Manager  │   │JSON/CSV/ │   │
│                               │          │   │   SQL    │   │
│                               └──────────┘   └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Module Boundaries (Core Package)

| Module        | Responsibility      | Input                        | Output                     |
| ------------- | ------------------- | ---------------------------- | -------------------------- |
| **Scanner**   | Lexical analysis    | `string` (source code)       | `Result<Token[]>`          |
| **Parser**    | Syntax analysis     | `Token[]`                    | `Result<Program>`          |
| **Analyzer**  | Semantic validation | `Program`                    | `Result<ValidatedProgram>` |
| **Generator** | Data generation     | `ValidatedProgram` + options | `AsyncIterable<Record>`    |
| **Context**   | Data loading/saving | File paths, tags             | Context data               |
| **Adapters**  | Output formatting   | `AsyncIterable<Record>`      | Formatted output           |

### Data Flow

```
.td file (string)
    │
    ▼ scan()
Token[]
    │
    ▼ parse()
Program (AST)
    │
    ▼ analyze()
ValidatedProgram
    │
    ├──────────────────┐
    ▼                  ▼
Context ────────────► generate()
                       │
                       ▼
              AsyncIterable<Record>
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    JsonAdapter   CsvAdapter   SqlAdapter
          │            │            │
          ▼            ▼            ▼
      .json         .csv       .sql file
```

## Requirements to Structure Mapping

### FR1-FR5: Pattern-Based Generation

- **DSL Parsing**: `scanner/`, `parser/`, `analyzer/`
- **Schema definitions**: `parser/ast.ts` (SchemaNode, FieldNode)
- **Field generators**: `generator/generators/`
- **Uniqueness constraints**: `generator/uniqueness.ts`
- **Templates**: `generator/template.ts`
- **Relationships**: `analyzer/referenceResolver.ts`

### FR6-FR9: Context Management

- **Context loading**: `context/loaders/`
- **Tag-based selection**: `context/selector.ts`
- **Context references**: `analyzer/referenceResolver.ts`
- **Save generated as context**: `context/contextManager.ts`

### FR10-FR13: Cascading Rules

- **Global defaults**: `cli/config/defaults.ts`
- **Workspace defaults**: `cli/config/configLoader.ts`
- **Schema/field overrides**: `analyzer/typeChecker.ts`

### FR14-FR17: CLI Operations

- **Generate command**: `cli/commands/generate.ts`
- **Validate command**: `cli/commands/validate.ts`
- **Init command**: `cli/commands/init.ts`
- **Error messages**: `cli/formatters/errorFormatter.ts`

### FR18-FR21: Pattern Sharing

- **Text-based DSL**: `parser/` (produces human-readable AST from `.td` files)
- **Examples**: `examples/` directory

### FR22-FR25: Data Output

- **JSON output**: `adapters/jsonAdapter.ts`
- **CSV output**: `adapters/csvAdapter.ts`
- **SQL output**: `adapters/sqlAdapter.ts`
- **Metadata**: `common/version.ts`, generation options

### FR26-FR29: Validation

- **Syntax validation**: `scanner/`, `parser/`
- **Semantic validation**: `analyzer/`
- **Error collection**: `common/result.ts`, `common/diagnostic.ts`

## Public API Surface

### @testdata-generator/core

```typescript
// Main exports from packages/core/src/index.ts
export { scan } from './scanner';
export { parse } from './parser';
export { analyze } from './analyzer';
export { generate } from './generator';
export { loadContext, saveContext } from './context';
export { JsonAdapter, CsvAdapter, SqlAdapter } from './adapters';

// Type exports
export type { Token, TokenKind } from './scanner/tokens';
export type { Program, SchemaNode, FieldNode, ProfileNode } from './parser/ast';
export type { ValidatedProgram } from './analyzer';
export type { GenerateOptions, Record } from './generator';
export type { Result, Diagnostic, SourceLocation } from './common';
```

### @testdata-generator/cli

```
td generate <file.td> [options]
  --count, -c <n>       Number of records (default: 10)
  --format, -f <fmt>    Output format: json|csv|sql (default: json)
  --output, -o <path>   Output file (default: stdout)
  --context <path>      Context file path
  --seed, -s <n>        Random seed for reproducibility
  --config <path>       Config file path

td validate <file.td>
  --json                Output validation result as JSON

td init [template]
  Templates: basic, with-relationships, with-context

td version
td help [command]
```

## Integration Points

### Internal Communication

- **CLI → Core**: CLI commands invoke core library functions (`scan`, `parse`, `analyze`, `generate`)
- **Scanner → Parser**: Scanner produces Token[] consumed by Parser
- **Parser → Analyzer**: Parser produces Program (AST) consumed by Analyzer
- **Analyzer → Generator**: Analyzer produces ValidatedProgram consumed by Generator
- **Generator → Adapters**: Generator yields Record objects consumed by adapters
- **Context → Generator**: Generator consumes context data loaded by Context Manager

### External Integrations

- **File System**: Read `.td` files, `.tdconfig.json`, context files (JSON/CSV)
- **File System**: Write generated data to files via adapters
- **npm Registry**: Publish packages for distribution
- **VS Code (Future)**: Language extension for syntax highlighting

## Development Workflow Integration

### Development Structure

```bash
# Install dependencies
bun install

# Development (watch mode)
bun run dev                    # Run in watch mode

# Testing
bun test                       # Run all tests
bun test --coverage           # With coverage report
bun test scanner              # Test specific module

# Build
bun run build                 # Build both packages
cd packages/core && bun run build
cd packages/cli && bun run build

# Linting
bun run lint                  # Lint all packages
bun run lint:fix              # Auto-fix issues

# Publishing
bun run publish               # Publish to npm
```

### Build Process

- **Core package**: TypeScript → JavaScript (ESM) + type declarations
- **CLI package**: TypeScript → JavaScript (ESM) + shebang for `bin/td.ts`
- **Bun bundler**: Creates single-file executables (optional for distribution)

### Deployment Structure

- **npm packages**: Published as `@testdata-generator/core` and `@testdata-generator/cli`
- **CLI global install**: `bun add -g @testdata-generator/cli` or `npm install -g @testdata-generator/cli`
- **Library usage**: Add `@testdata-generator/core` as dev dependency in test projects
