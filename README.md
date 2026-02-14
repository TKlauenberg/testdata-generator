# testdata-ai

Declarative test data generation using a custom DSL with deterministic, reproducible output.

## Overview

testdata-ai is a TypeScript-based tool for generating realistic test data from declarative schema definitions. It uses a custom domain-specific language (DSL) to describe data structures and generation rules, producing deterministic output through a seeded PRNG implementation.

## Workspace Structure

This is a Bun monorepo with two packages:

```
testdata-ai/
├── packages/
│   ├── core/                    # @testdata-ai/core (library)
│   │   ├── src/
│   │   │   ├── index.ts         # Public API exports
│   │   │   └── index.test.ts    # Core tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/                     # @testdata-ai/cli (CLI tool)
│       ├── bin/
│       │   ├── td.ts            # CLI executable
│       │   └── td.test.ts       # CLI tests
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json                 # Bun workspaces root
├── tsconfig.json                # Shared TypeScript config
├── bunfig.toml                  # Bun configuration
└── README.md
```

### Packages

- **`@testdata-ai/core`**: Core library containing the scanner, parser, semantic analyzer, and generator
- **`@testdata-ai/cli`**: Command-line interface tool for working with .td schema files

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.x or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd testdata-ai

# Install dependencies
bun install

# Build packages
bun run build

# Run tests
bun test
```

### Running the CLI

```bash
# Show version
bun packages/cli/bin/td.ts --version

# Show help
bun packages/cli/bin/td.ts --help
```

## Development

### Building

```bash
# Build all packages
bun run build

# Build specific package
bun run --cwd packages/core build
bun run --cwd packages/cli build
```

### Testing

```bash
# Run all tests
bun test

# Run tests for specific package
bun test packages/core
bun test packages/cli

# Run via root scripts (workspace-stable paths)
bun run test:core
bun run test:cli
bun run test:bdd
```

CLI command tests and BDD test scripts use workspace-stable paths so they run correctly from the repository root.

#### Test Tags and Selective Execution

Tests are tagged to enable fast feedback loops during development:

**Available Tags:**

- `@slow` - Tests that take >1 second (e.g., 100k+ record generation, large sequences)
- `@performance` - Tests that measure performance against requirements (e.g., validation speed, generation throughput)

**Quick Test Run** (Default - excludes slow tests):
```bash
# Fast feedback: Run all tests except @slow
bun test --exclude @slow

# Fastest: Run only unit tests in specific file
bun test packages/core/src/generator/rng.test.ts
```

**Full Test Suite** (Run before marking story/epic done):
```bash
# Run everything including slow and performance tests
bun test
```

**When to Use:**

- **Development loop:** Use `bun test --exclude @slow` for rapid iteration
- **Pre-commit:** Run full suite or specific package tests
- **CI/CD:** Always run full suite (no exclusions)
- **Before "done":** Run full suite to validate all requirements

**Tagged Tests:**

- Memory efficiency tests (1M records): `@slow @performance`
- Large sequence generation (100k): `@slow`
- Performance validation tests: `@performance`

### Code Quality

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

#### Linting

```bash
# Check for linting errors
bun run lint

# Auto-fix linting errors
bun run lint:fix
```

#### Formatting

```bash
# Format all files
bun run format

# Check if files are formatted
bun run format:check
```

#### File Naming Convention

All TypeScript files must follow **camelCase** naming convention (e.g., `scanner.ts`, not `Scanner.ts`). To validate:

```bash
# Validate all file names follow camelCase convention
bun run validate:file-naming
```

**Note:** Screenplay pattern files (Abilities, Tasks, Questions) in `features/support` directories are allowed to use PascalCase as per SerenityJS conventions.

#### Running All Checks

```bash
# Run linting, formatting, file naming validation, and tests
bun run lint && bun run format:check && bun run validate:file-naming && bun test
```

#### Editor Setup

For the best development experience, install the recommended VS Code extensions:

- **ESLint** (`dbaeumer.vscode-eslint`) - Real-time linting feedback
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting on save
- **Bun** (`oven.bun-vscode`) - Bun language support

The project is configured to:

- Format code automatically on save
- Auto-fix ESLint issues on save
- Use Prettier as the default formatter

#### CI/CD Pipeline

All pull requests and pushes to main run automated checks:

1. **Linting** - ESLint checks for code quality issues
2. **Formatting** - Prettier verifies consistent code style
3. **Tests** - Full test suite execution

To ensure your changes pass CI, run all checks locally before pushing:

```bash
bun run lint && bun run format:check && bun test
```

**Note:** File naming validation (`validate:file-naming`) is not run in CI but is recommended during development.

### Project Structure

- All source files use **camelCase.ts** naming convention
- TypeScript strict mode is enabled throughout
- ESM modules only (no CommonJS)
- Co-located tests (\*.test.ts files next to implementation)
- Each module exports through index.ts

## Technology Stack

- **Runtime**: Bun 1.x
- **Language**: TypeScript 5.x with strict mode
- **CLI Framework**: Commander.js 14.x
- **Testing**: Bun's built-in test runner

## Documentation

See the [docs/](docs/) directory for detailed documentation:

- [Architecture](docs/architecture.md) - System design and technical decisions
- [Project Context](docs/project-context.md) - Implementation rules and conventions
- [Epics](docs/epics.md) - Feature roadmap and sprint planning

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
