# Story 1.1: Initialize Bun Monorepo with Core and CLI Packages

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a properly structured Bun monorepo with separate core library and CLI packages**,
so that **I can develop the library and CLI tool independently with clear separation of concerns**.

## Acceptance Criteria

**Given** I am setting up the testdata-ai project
**When** I initialize the monorepo structure
**Then** a `packages/core/` directory exists with `package.json`, `tsconfig.json`, and `src/` folder
**And** a `packages/cli/` directory exists with `package.json`, `tsconfig.json`, and `src/` folder
**And** the root `package.json` has `"workspaces": ["packages/*"]` configured
**And** TypeScript strict mode is enabled in all `tsconfig.json` files with `"strict": true`
**And** both packages use ESM modules with `"type": "module"`
**And** I can run `bun install` successfully at the root
**And** the directory structure matches the architecture specification

## Tasks / Subtasks

- [x] Create monorepo root structure (AC: 1, 2, 3)
  - [x] Initialize root `package.json` with workspaces configuration
  - [x] Create `.gitignore` with appropriate entries
  - [x] Create `bunfig.toml` for Bun configuration
- [x] Create packages/core package (AC: 1, 4, 5)
  - [x] Create `packages/core/` directory structure
  - [x] Create `packages/core/package.json` with proper metadata
  - [x] Create `packages/core/tsconfig.json` with strict mode
  - [x] Create `packages/core/src/index.ts` as entry point
- [x] Create packages/cli package (AC: 2, 4, 5)
  - [x] Create `packages/cli/` directory structure
  - [x] Create `packages/cli/package.json` with proper metadata
  - [x] Create `packages/cli/tsconfig.json` with strict mode
  - [x] Create `packages/cli/src/index.ts` as entry point
  - [x] Create `packages/cli/bin/td.ts` as CLI executable
- [x] Create shared TypeScript configuration (AC: 4, 5)
  - [x] Create root `tsconfig.json` with shared settings
  - [x] Configure TypeScript strict mode
  - [x] Configure ESM modules (`"module": "ESNext"`)
  - [x] Configure ESNext target (per architecture)
- [x] Install dependencies and verify setup (AC: 6, 7)
  - [x] Run `bun install` at project root
  - [x] Verify workspace detection and linking
  - [x] Add Commander.js to CLI package
  - [x] Create basic "hello world" CLI command for verification
- [x] Document initial setup (AC: 7)
  - [x] Create README.md with project overview
  - [x] Document workspace structure
  - [x] Add quick start instructions

## Dev Notes

### Critical Architecture Patterns

**From [project-context.md](../project-context.md):**

**Runtime & Technology:**
- **Bun 1.x** - Primary runtime (NOT Node.js). Use `bun` commands exclusively.
- **TypeScript 5.x** with strict mode - `strict: true`, `target: "ESNext"`, `module: "ESNext"`
- **ESM modules only** - NO CommonJS. Use `import/export`, never `require()`
- **Commander.js v14.0.2** - CLI framework for argument parsing

**File Naming Convention (CRITICAL):**
- ALL files MUST use `camelCase.ts` format
- ❌ NEVER use: kebab-case.ts, snake_case.ts, PascalCase.ts
- ✅ Examples: `scanner.ts`, `astNodes.ts`, `errorFormatter.ts`
- Directories also use camelCase: `scanner/`, `parser/`, `generator/`

**Module Organization:**
- Every module exports through `index.ts` - single export point
- Clear module boundaries enforced
- Core package MUST NOT import from CLI package (one-way dependency)

**From [architecture.md](../architecture.md#starter-template-evaluation):**

**Monorepo Structure:**
```
testdata-ai/
├── packages/
│   ├── core/                    # @testdata-ai/core (library)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts         # Public API exports
│   └── cli/                     # @testdata-ai/cli (CLI tool)
│       ├── package.json
│       ├── tsconfig.json
│       ├── bin/
│       │   └── td.ts            # CLI executable
│       └── src/
│           └── index.ts
├── package.json                 # Bun workspaces root
├── tsconfig.json                # Shared TS config
├── bunfig.toml                  # Bun configuration
└── README.md
```

**TypeScript Strict Mode Requirements (CRITICAL):**
- `strict: true` in ALL tsconfig.json files
- No `any` types allowed
- Explicit return types for all public functions
- Non-null assertions forbidden

**Package Configuration:**
- Root package.json: `"workspaces": ["packages/*"]`
- All packages: `"type": "module"` for ESM
- Core package: Named `@testdata-ai/core`
- CLI package: Named `@testdata-ai/cli`

### Implementation Guidance

**Initialization Steps (from [architecture.md](../architecture.md#initialization-commands)):**

1. **Create project structure:**
   ```bash
   mkdir -p testdata-ai/packages/{core,cli}/src
   cd testdata-ai
   ```

2. **Initialize Bun workspace:**
   ```bash
   bun init -y
   # Add to package.json: "workspaces": ["packages/*"]
   ```

3. **Initialize core package:**
   ```bash
   cd packages/core && bun init -y
   ```

4. **Initialize cli package:**
   ```bash
   cd ../cli && bun init -y
   bun add commander
   bun add -d @commander-js/extra-typings @types/bun
   ```

**Key Files to Create:**

**Root `package.json`:**
```json
{
  "name": "testdata-ai",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --cwd packages/core build && bun run --cwd packages/cli build",
    "test": "bun test"
  }
}
```

**Root `tsconfig.json` (shared base configuration):**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "exclude": ["node_modules", "dist"]
}
```

**`packages/core/package.json`:**
```json
{
  "name": "@testdata-ai/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**`packages/core/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

**`packages/core/src/index.ts`:**
```typescript
// Public API exports - will be expanded in future stories
export const version = '0.1.0';
```

**`packages/cli/package.json`:**
```json
{
  "name": "@testdata-ai/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "td": "./bin/td.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "@testdata-ai/core": "workspace:*",
    "commander": "^14.0.2"
  },
  "devDependencies": {
    "@commander-js/extra-typings": "^2.1.0",
    "@types/bun": "^1.0.0"
  }
}
```

**`packages/cli/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "bin/**/*"]
}
```

**`packages/cli/bin/td.ts`:**
```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { version } from '@testdata-ai/core';

const program = new Command();

program
  .name('td')
  .description('testdata-ai - Declarative test data generation')
  .version(version);

// Future commands will be added here in subsequent stories

program.parse();
```

**`packages/cli/src/index.ts`:**
```typescript
// CLI implementation - will be expanded in future stories
export { /* future exports */ };
```

**`.gitignore`:**
```
node_modules/
dist/
*.log
.DS_Store
*.tsbuildinfo
```

**`bunfig.toml`:**
```toml
[install]
# Bun-specific configuration
peer = true

[test]
# Test configuration
preload = []
```

### Project Structure Compliance

**Alignment with Unified Structure:**
- ✅ Matches [architecture.md](../architecture.md#project-structure) exactly
- ✅ Two-package monorepo: `core/` (library) and `cli/` (tool)
- ✅ Clear separation of concerns
- ✅ Bun workspaces for dependency management
- ✅ TypeScript strict mode enabled throughout

**No Conflicts Detected:**
- Structure is foundational - no existing code to conflict with
- Establishes base patterns for all future stories
- All naming conventions follow camelCase requirement

### Testing Requirements

**From [project-context.md](../project-context.md#testing-rules):**

- **Test runner:** Bun's built-in test runner (NOT Jest, NOT Mocha)
- **Test organization:** Co-located tests as `*.test.ts` files
- **Test commands:** `bun test` to run all tests

**For this story, create basic verification tests:**

**`packages/core/src/index.test.ts`:**
```typescript
import { describe, test, expect } from 'bun:test';
import { version } from './index';

describe('Core Package', () => {
  test('exports version', () => {
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  });
});
```

**`packages/cli/bin/td.test.ts`:**
```typescript
import { describe, test, expect } from 'bun:test';
import { spawn } from 'bun';

describe('CLI', () => {
  test('shows version', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--version']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('0.1.0');
  });

  test('shows help', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('testdata-ai');
  });
});
```

### References

**All technical requirements sourced from:**

1. **[project-context.md](../project-context.md)** - Complete sections:
   - Technology Stack & Versions
   - TypeScript Strict Mode Requirements
   - File Naming Conventions (camelCase.ts)
   - Testing Rules (Bun test runner)
   - Module Organization

2. **[architecture.md](../architecture.md)** - Sections:
   - Starter Template Evaluation (#runtime-selection-bun)
   - CLI Framework Selection (#cli-framework-selection)
   - Project Structure (#project-structure)
   - Technology Stack (#technology-stack)
   - Initialization Commands (#initialization-commands)

3. **[epics.md](../epics.md)** - Section:
   - Epic 1: Project Foundation & Development Setup
   - Story 1.1: Initialize Bun Monorepo with Core and CLI Packages

### Critical Success Criteria

**Definition of Done:**
1. ✅ All directories created matching architecture specification
2. ✅ All package.json files have correct metadata and workspace configuration
3. ✅ All tsconfig.json files enable strict mode and ESM modules
4. ✅ `bun install` runs successfully without errors
5. ✅ `bun test` runs successfully in both packages
6. ✅ CLI executable can be run with `bun packages/cli/bin/td.ts --version`
7. ✅ CLI shows version and help text correctly
8. ✅ All file names use camelCase convention
9. ✅ No Node.js or npm commands used (Bun only)
10. ✅ README.md documents the setup

**Verification Commands:**
```bash
# Verify structure
ls -la packages/core/src
ls -la packages/cli/bin

# Verify installation
bun install

# Verify tests
bun test

# Verify CLI
bun packages/cli/bin/td.ts --version
bun packages/cli/bin/td.ts --help
```

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

**Code Review Fixes Applied (2026-01-01):**
- Fixed Issue #1: Removed node_modules, dist, and build artifacts from git staging
- Fixed Issue #2: Cleaned root tsconfig.json to match specification exactly (removed NestJS decorator configs)
- Fixed Issue #3: Updated .gitignore with recursive patterns (dist/ not /dist)
- Fixed Issue #4: Updated File List to include all created/modified files
- Fixed Issue #5: Improved test coverage with workspace integration tests (8 tests total)
- Fixed Issue #6: Fixed packages/cli/src/index.ts syntax error (removed invalid empty export)
- Fixed Issue #7: Removed docs/ exclusion from tsconfig.json (back to spec)
- Fixed Issue #8: Documented bun.lock decision (excluded from git for library packages)

All fixes verified with passing tests and clean git status.

### Completion Notes List

**Implementation Summary:**
- ✅ Created Bun monorepo structure with workspaces configuration
- ✅ Initialized @testdata-ai/core package with TypeScript strict mode
- ✅ Initialized @testdata-ai/cli package with Commander.js integration
- ✅ Configured shared TypeScript configuration with ESNext target and ESM modules
- ✅ Successfully ran `bun install` and verified workspace linking
- ✅ Created functional CLI executable (`td`) with version and help commands
- ✅ Implemented comprehensive test coverage for both packages
- ✅ All tests pass: 8 tests across core, CLI, and workspace integration
- ✅ Updated README.md with project overview, structure, and quick start guide
- ✅ Fixed root tsconfig.json to match specification (removed NestJS artifacts)
- ✅ Fixed .gitignore to properly exclude build artifacts
- ✅ Removed build artifacts from git staging (node_modules, dist, *.tsbuildinfo)

**Technical Decisions:**
- Removed `@commander-js/extra-typings` dependency (version not available)
- Root tsconfig.json cleaned to match exact specification from Dev Notes
- Updated .gitignore patterns to use recursive exclusions (dist/ vs /dist)
- Added workspace integration tests to verify package linking
- Fixed packages/cli/src/index.ts syntax error (invalid empty export)
- bun.lock excluded from commits (standard for libraries, may reconsider for applications)

**Files Created/Modified:**
- Created: `package.json` (root)
- Created: `bunfig.toml`
- Modified: `tsconfig.json` (root - configured per specification, removed NestJS artifacts)
- Modified: `.gitignore` (updated patterns to properly exclude build artifacts)
- Created: `packages/core/package.json`
- Created: `packages/core/tsconfig.json`
- Created: `packages/core/src/index.ts`
- Created: `packages/core/src/index.test.ts`
- Created: `packages/cli/package.json`
- Created: `packages/cli/tsconfig.json`
- Created: `packages/cli/src/index.ts`
- Created: `packages/cli/src/workspace.test.ts` (workspace integration tests)
- Created: `packages/cli/bin/td.ts`
- Created: `packages/cli/bin/td.test.ts`
- Modified: `README.md` (replaced old content with testdata-ai documentation)

**Build Artifacts (NOT committed to git):**
- bun.lock (dependency lock file)
- packages/core/dist/* (TypeScript build output)
- packages/core/tsconfig.tsbuildinfo (TypeScript incremental build cache)
- packages/*/node_modules/* (installed dependencies)

### File List

- package.json
- bunfig.toml
- tsconfig.json
- .gitignore
- packages/core/package.json
- packages/core/tsconfig.json
- packages/core/src/index.ts
- packages/core/src/index.test.ts
- packages/cli/package.json
- packages/cli/tsconfig.json
- packages/cli/src/index.ts
- packages/cli/src/workspace.test.ts
- packages/cli/bin/td.ts
- packages/cli/bin/td.test.ts
- README.md
