# Starter Template Evaluation

## Primary Technology Domain

**CLI Tool + Developer Library** (TypeScript/Bun)

This project is library-first with CLI as the primary interface:

- Core library: `@testdata-ai/core` (DSL parser + generator)
- CLI tool: `@testdata-ai/cli` (command-line interface)

## Runtime Selection: Bun

| Runtime     | Version  | Decision | Rationale                                        |
| ----------- | -------- | -------- | ------------------------------------------------ |
| **Node.js** | 22.x LTS | ❌       | Traditional choice, slower startup               |
| **Bun**     | 1.x      | ✅       | Faster execution, built-in TypeScript, modern DX |

**Why Bun:**

- **Performance**: Significantly faster startup and execution (critical for CLI tools)
- **Built-in TypeScript**: No separate compilation step during development
- **Built-in test runner**: `bun test` replaces need for Vitest/Jest
- **Built-in bundler**: Simpler build pipeline
- **npm compatible**: Still publishes to npm, users can run with Node.js or Bun
- **Modern DX**: Better developer experience for greenfield projects

**Compatibility Note**: The published npm packages will work with both Bun and Node.js 18+. Users can choose their preferred runtime.

## CLI Framework Selection

| Framework        | Version  | Stars | Decision                                                                       |
| ---------------- | -------- | ----- | ------------------------------------------------------------------------------ |
| **oclif**        | v4.22.57 | 9.4k  | ❌ Too opinionated, CLI-first design conflicts with library-first architecture |
| **Yargs**        | v18.0.0  | 11.4k | ❌ Good parsing but less integrated with TypeScript                            |
| **Commander.js** | v14.0.2  | 27.8k | ✅ Lightweight, library-first friendly, excellent TypeScript support           |

## Selected Approach: Custom Minimal Setup with Bun

**Rationale for Not Using Framework Generator:**

- Project is **library-first** (DSL parser is the core, CLI wraps it)
- Custom error handling required (QA-friendly Rust-style errors)
- Hand-written parser needs clean architecture without framework constraints
- Framework starters impose unnecessary structure and dependencies

**Rationale for Commander.js as CLI layer:**

- Lightweight and unobtrusive (doesn't dictate project structure)
- 27.8k stars, mature and battle-tested
- TypeScript support via `@commander-js/extra-typings`
- Full control over error handling and output formatting
- Clean separation: Commander handles argument parsing, we handle everything else

## Project Structure

```
testdata-ai/
├── packages/
│   ├── core/                    # @testdata-ai/core
│   │   ├── src/
│   │   │   ├── scanner/         # Lexical analysis (tokens)
│   │   │   ├── parser/          # Syntax analysis (AST)
│   │   │   ├── analyzer/        # Semantic analysis (validation)
│   │   │   ├── generator/       # Data generation engine
│   │   │   ├── context/         # Context management
│   │   │   ├── adapters/        # Output adapters (JSON/CSV/SQL)
│   │   │   └── index.ts         # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/                     # @testdata-ai/cli
│       ├── src/
│       │   ├── commands/        # generate, validate, init
│       │   ├── formatters/      # Error formatting (Rust-style)
│       │   └── index.ts
│       ├── bin/td.ts            # CLI executable
│       └── package.json
│
├── package.json                 # Bun workspaces root
├── tsconfig.json                # Shared TS config
└── bunfig.toml                  # Bun configuration
```

## Technology Stack

| Category            | Technology   | Version  | Purpose                                     |
| ------------------- | ------------ | -------- | ------------------------------------------- |
| **Runtime**         | Bun          | 1.x      | Fast TypeScript execution, built-in tooling |
| **Language**        | TypeScript   | 5.x      | Type-safe development                       |
| **CLI Framework**   | Commander.js | 14.x     | Argument parsing                            |
| **Testing**         | Bun Test     | Built-in | Unit/integration testing                    |
| **Linting**         | ESLint       | 9.x      | Code quality                                |
| **Formatting**      | Prettier     | Latest   | Code formatting                             |
| **Package Manager** | Bun          | Built-in | Fast dependency management                  |

## Initialization Commands

```bash
# Create project structure
mkdir -p testdata-ai/packages/{core,cli}/src
cd testdata-ai

# Initialize Bun workspace
bun init -y
# Add to package.json: "workspaces": ["packages/*"]

# Initialize core package
cd packages/core && bun init -y
# TypeScript is built-in with Bun

# Initialize cli package
cd ../cli && bun init -y
bun add commander
bun add -d @commander-js/extra-typings @types/bun
```

## Architectural Decisions Established

**Runtime & Build:**

- Bun 1.x as primary runtime (Node.js 18+ compatible for users)
- TypeScript 5.x with strict mode
- ES2022 target, ESM modules
- Bun's built-in bundler for CLI distribution

**Project Organization:**

- Monorepo with Bun workspaces
- Clear separation: core library vs CLI tool
- Shared TypeScript configuration

**CLI Architecture:**

- Commander.js for argument parsing only
- Custom error formatter for QA-friendly messages
- Exit codes: 0 (success), 1 (validation error), 2 (generation error), 3 (file error)

**Testing Strategy:**

- Bun's built-in test runner (`bun test`)
- Test DSL parser phases independently
- Snapshot testing for generated output

**Distribution:**

- Publish to npm registry
- Users can run with `bun` (recommended) or `node`
- Global install: `bun add -g @testdata-ai/cli` or `npm install -g @testdata-ai/cli`

**Note:** Project initialization should be the first implementation story, establishing the monorepo structure and build pipeline before DSL implementation begins.
