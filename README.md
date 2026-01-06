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
```

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

#### Running All Checks

```bash
# Run linting, formatting, and tests
bun run lint && bun run format:check && bun test
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
