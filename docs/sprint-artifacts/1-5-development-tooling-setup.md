# Story 1.5: Development Tooling Setup

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **consistent code quality tooling across the project**,
So that **all code follows established patterns and maintains high quality**.

## Acceptance Criteria

**Given** I need to enforce code quality and formatting standards
**When** I configure the development tooling
**Then** ESLint is installed with TypeScript support using flat config format (eslint.config.js)
**And** ESLint rules enforce camelCase file naming, private member conventions, and architecture patterns
**And** Prettier is configured with single quotes and trailing commas as specified
**And** a `.prettierrc` file exists with project formatting rules
**And** `bun run lint` command checks all code for violations
**And** `bun run lint:fix` command auto-fixes applicable issues
**And** `bun run format` command formats all code with Prettier
**And** a `.github/workflows/ci.yml` file exists for CI/CD pipeline
**And** CI workflow runs linting, formatting checks, and tests on pull requests
**And** all configuration files are committed to version control

## Tasks / Subtasks

- [ ] Install and configure ESLint with TypeScript support (AC: 1, 2, 5, 6)
  - [ ] Install ESLint 9.x with flat config support
  - [ ] Install TypeScript ESLint parser and plugin
  - [ ] Create `eslint.config.js` using flat config format (NOT .eslintrc)
  - [ ] Configure TypeScript ESLint rules
  - [ ] Add custom rules for camelCase file naming convention
  - [ ] Add custom rules for private member naming (`_memberName` pattern)
  - [ ] Add rules to enforce architecture patterns (module boundaries via index.ts)
  - [ ] Add `lint` script to root package.json: `"lint": "eslint ."`
  - [ ] Add `lint:fix` script to root package.json: `"lint:fix": "eslint . --fix"`
  - [ ] Test linting on existing code to verify rules work
  - [ ] Document any intentional rule exceptions with inline comments

- [ ] Install and configure Prettier (AC: 3, 4, 7)
  - [ ] Install Prettier (latest stable version)
  - [ ] Create `.prettierrc` configuration file
  - [ ] Configure single quotes: `"singleQuote": true`
  - [ ] Configure trailing commas: `"trailingComma": "all"`
  - [ ] Set line width to 100 or 120 (team preference)
  - [ ] Configure other formatting options (tabs vs spaces, etc.)
  - [ ] Add `format` script to root package.json: `"format": "prettier --write ."`
  - [ ] Add `format:check` script: `"format:check": "prettier --check ."`
  - [ ] Create `.prettierignore` to exclude build outputs and node_modules
  - [ ] Run formatter on all existing code to establish baseline

- [ ] Integrate ESLint and Prettier (AC: 1-7)
  - [ ] Install `eslint-config-prettier` to disable conflicting ESLint rules
  - [ ] Install `eslint-plugin-prettier` to run Prettier as ESLint rule (optional approach)
  - [ ] Configure ESLint to not conflict with Prettier formatting
  - [ ] Verify `bun run lint:fix` and `bun run format` work together
  - [ ] Test that fixing lint issues doesn't break formatting and vice versa
  - [ ] Document the recommended workflow: format first, then lint

- [ ] Create CI/CD pipeline configuration (AC: 8, 9, 10)
  - [ ] Create `.github/workflows/` directory
  - [ ] Create `ci.yml` workflow file
  - [ ] Configure workflow to trigger on pull requests and pushes to main
  - [ ] Add Bun setup step (use `oven-sh/setup-bun` action)
  - [ ] Add dependency installation step: `bun install`
  - [ ] Add linting check step: `bun run lint`
  - [ ] Add formatting check step: `bun run format:check`
  - [ ] Add test execution step: `bun test`
  - [ ] Configure matrix strategy for multiple Node.js/Bun versions (if needed)
  - [ ] Test CI workflow on a test branch to verify it works
  - [ ] Document CI workflow and how to debug failures

- [ ] Configure editor integration (Optional, but recommended)
  - [ ] Create `.vscode/settings.json` for VS Code users
  - [ ] Configure ESLint and Prettier VS Code extensions
  - [ ] Enable format on save
  - [ ] Enable auto-fix on save for ESLint
  - [ ] Create `.vscode/extensions.json` with recommended extensions
  - [ ] Document editor setup in README

- [ ] Update documentation (AC: 10)
  - [ ] Add linting and formatting section to README.md
  - [ ] Document how to run lint checks locally
  - [ ] Document how to run formatting checks locally
  - [ ] Document CI/CD pipeline and what checks run on PRs
  - [ ] Document how to handle lint rule exceptions
  - [ ] Document editor integration setup

- [ ] Commit and verify all configuration files (AC: 10)
  - [ ] Verify `eslint.config.js` is committed
  - [ ] Verify `.prettierrc` is committed
  - [ ] Verify `.prettierignore` is committed
  - [ ] Verify `.github/workflows/ci.yml` is committed
  - [ ] Verify `.vscode/settings.json` and `.vscode/extensions.json` are committed
  - [ ] Run a full CI check locally to verify everything works
  - [ ] Push to GitHub and verify CI runs successfully

## Dev Notes

### 🎯 ULTIMATE CONTEXT ENGINE ANALYSIS - Everything You Need to Know!

This story establishes the **code quality foundation** for the entire testdata-ai project. Every subsequent story will benefit from automated linting, formatting, and CI checks. This is **essential infrastructure** that prevents technical debt and ensures consistency across the codebase.

### Critical Importance

**Why This Story Matters:**

1. **Consistency Across Development**: With automated formatting and linting, all code follows the same patterns regardless of who writes it. This is crucial for a project that will grow over 50+ stories.

2. **Prevent Architecture Violations**: Custom ESLint rules will enforce the architecture patterns defined in [architecture.md](../architecture.md), such as:
   - camelCase file naming convention (e.g., `scanner.ts`, not `Scanner.ts`)
   - Private member naming convention (`_memberName`)
   - Module boundary enforcement (exports must go through `index.ts`)

3. **Early Error Detection**: CI/CD pipeline catches issues before they reach main branch, maintaining high code quality throughout development.

4. **Developer Experience**: Format-on-save and auto-fix-on-save make development faster and more pleasant. Developers don't waste time on formatting debates.

5. **Foundation for Future Stories**: All subsequent stories (2.1-12.4) will benefit from this tooling infrastructure. It's worth investing time to get this right now.

### Architecture Context

**From [architecture.md](../architecture.md):**

**Technology Stack Decisions:**
- **Bun 1.x** as primary runtime (built-in TypeScript support)
- **TypeScript 5.x** with strict mode enabled
- **ESLint 9.x** for code quality (latest version with flat config)
- **Prettier (latest)** for code formatting
- **Bun's built-in test runner** for testing

**Code Quality Requirements:**
The architecture document specifies several critical conventions that MUST be enforced through tooling:

1. **File Naming Convention**: camelCase for all TypeScript files
   ```
   ✅ scanner.ts, parser.ts, diagnostic.ts
   ❌ Scanner.ts, Parser.ts, Diagnostic.ts
   ```

2. **Private Member Convention**: All private class members must start with underscore
   ```typescript
   ✅ private _tokens: Token[];
   ❌ private tokens: Token[];
   ```

3. **Module Boundaries**: All exports must go through `index.ts` files
   ```typescript
   // packages/core/src/scanner/index.ts
   export { scan } from './scanner';

   // Other files should NOT import from scanner.ts directly
   ✅ import { scan } from './scanner';  // from index.ts
   ❌ import { Scanner } from './scanner/scanner';  // bypassing index
   ```

4. **TypeScript Strict Mode**: All packages use `"strict": true`

5. **ESM Modules**: No CommonJS, only ES modules (`import`/`export`)

**From [architecture.md](../architecture.md#distribution-strategy):**
- Prettier configuration: Single quotes, trailing commas
- ESLint configuration: TypeScript plugin with strict rules
- CI/CD: GitHub Actions for automated checks

**From [project-context.md](../project-context.md):**

**Technology Stack:**
- Bun 1.x (primary runtime)
- TypeScript 5.x with strict mode
- ESLint with TypeScript plugin
- Prettier (single quotes, trailing commas)

**Critical Project Rules:**
- NO `any` types (strict mode prevents this)
- Explicit return types for all public functions
- Named exports preferred over default exports
- ESM modules only (no `require()`)

### Previous Story Intelligence

**From Story 1.1 (Initialize Bun Monorepo):**
- Workspace structure established: `packages/core/` and `packages/cli/`
- Root `package.json` configured with `"workspaces": ["packages/*"]`
- TypeScript configured with strict mode
- Bun 1.x is the primary runtime

**From Story 1.2 (Result Type Pattern):**
- Created `packages/core/src/common/result.ts`
- Used TypeScript discriminated unions
- Implemented unit tests using Bun test runner
- Exported through `packages/core/src/common/index.ts`
- **Pattern established**: All exports go through index.ts files

**From Story 1.3 (Diagnostic System):**
- Created `packages/core/src/common/diagnostic.ts`
- Implemented comprehensive error reporting types
- Added unit tests
- Exported through common index.ts
- **Pattern established**: Co-located tests (*.test.ts next to implementation)

**From Story 1.4 (Gherkin/BDD Testing Infrastructure):**
- Set up Cucumber with SerenityJS Screenplay pattern
- Created `packages/core/features/` directory structure
- Implemented Actors, Abilities, Tasks, Questions pattern
- Created comprehensive README.md documentation
- **Testing Pattern**: BDD tests in features/, unit tests co-located
- **Key Files Created**:
  - `features/example.feature` - Example feature file
  - `features/step_definitions/example.steps.ts` - Step definitions
  - `features/support/screenplay/Actors.ts` - Actor configuration
  - `features/support/abilities/`, `tasks/`, `questions/` - Screenplay components
  - `tests/cucumber.runner.ts` - Bun test integration

**Development Patterns Observed:**
1. **Strict TypeScript**: All code uses strict mode with explicit types
2. **Module exports**: Everything exports through index.ts
3. **Co-located tests**: Unit tests (*.test.ts) next to implementation
4. **Separate BDD tests**: Feature files in dedicated features/ directory
5. **Comprehensive documentation**: Each story includes detailed README.md

### Git Intelligence

**Recent Commits Analysis:**
```
f138008 - implementation of story 1.4 (Gherkin/BDD infrastructure)
15d68a5 - create-story 1.4
d9cbcf7 - feat: complete implementation of the diagnostic system (Story 1.3)
c65446f - create story details for story 1.3
2c517c2 - Implement Result type pattern for error handling (Story 1.2)
30984ab - delete archive folder
3afc10a - implementation + review Story 1.1 (Bun monorepo initialization)
```

**Patterns from Git History:**

1. **Story Implementation Pattern**: Each story follows create-story → implementation → review cycle
2. **Commit Messages**: Use conventional commits format (feat:, create story, implementation)
3. **File Creation Pattern**: Stories create complete feature implementations with tests and docs
4. **No Linting Yet**: This is the first story to add automated code quality tooling
5. **CI/CD Gap**: No CI pipeline exists yet - this story will create it

**Files Modified in Story 1.4:**
- Created comprehensive Cucumber/SerenityJS infrastructure
- Added multiple feature files and step definitions
- Created Screenplay pattern components (Abilities, Tasks, Questions)
- Updated sprint-status.yaml
- Added .gitattributes for line ending consistency

**Key Insight**: The project has been growing without automated linting/formatting. This story will retroactively apply formatting to all existing code and establish CI checks to prevent quality regressions.

### Latest Technical Specifics

**ESLint 9.x Flat Config (CRITICAL - NEW FORMAT):**

ESLint 9.x introduced a **new flat config format** that replaces the old `.eslintrc` format. This is a **breaking change** and is now the recommended approach.

**Old Format (DO NOT USE):**
```json
// .eslintrc.json
{
  "extends": ["eslint:recommended"],
  "rules": { ... }
}
```

**New Flat Config Format (USE THIS):**
```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Custom rules
    }
  }
];
```

**Key Differences:**
1. **File name**: `eslint.config.js` (NOT `.eslintrc.js`)
2. **Export format**: Default export of array (NOT JSON object)
3. **Config composition**: Spread configs into array
4. **Glob patterns**: Built into config objects
5. **No extends**: Use spread operator instead

**TypeScript ESLint v8 (Latest):**

The `typescript-eslint` package provides full TypeScript support for ESLint 9.x.

**Installation:**
```bash
bun add -D eslint @eslint/js typescript-eslint
```

**Basic Configuration:**
```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
    },
  },
);
```

**Custom Rules for Project Conventions:**

We need custom rules to enforce:
1. **camelCase file naming**: Check that all .ts files use camelCase
2. **Private member naming**: Check that private class members start with `_`
3. **Module boundary enforcement**: Ensure imports go through index.ts

These can be implemented as custom ESLint rules or as separate linting scripts.

**Prettier 3.x (Latest):**

Prettier 3.x is stable and widely adopted. Configuration is straightforward.

**Installation:**
```bash
bun add -D prettier eslint-config-prettier eslint-plugin-prettier
```

**Configuration (.prettierrc):**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**Integration with ESLint:**

Option 1: Disable conflicting rules (recommended)
```javascript
// eslint.config.js
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // ... other configs
  eslintConfigPrettier, // Disables ESLint rules that conflict with Prettier
];
```

Option 2: Run Prettier as ESLint rule (more integrated)
```javascript
// eslint.config.js
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  // ... other configs
  eslintPluginPrettier, // Runs Prettier as ESLint rule
];
```

**Recommendation**: Use Option 1 (disable conflicts) for better performance. Run Prettier separately.

**GitHub Actions for Bun:**

Use the official `oven-sh/setup-bun` action for CI/CD.

**Basic CI Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run linting
        run: bun run lint

      - name: Check formatting
        run: bun run format:check

      - name: Run tests
        run: bun test
```

**Performance Note**: GitHub Actions runners have Bun pre-installed on some images, making setup very fast.

**VS Code Integration:**

For optimal developer experience, configure VS Code extensions.

**Required Extensions:**
- `dbaeumer.vscode-eslint` - ESLint integration
- `esbenp.prettier-vscode` - Prettier integration

**.vscode/settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript"]
}
```

**.vscode/extensions.json:**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "oven.bun-vscode"
  ]
}
```

### Developer Context & Guardrails

**🎯 CRITICAL IMPLEMENTATION REQUIREMENTS:**

1. **Use ESLint 9.x Flat Config Format**
   - File: `eslint.config.js` (NOT .eslintrc.json)
   - Export: Default export of array
   - DO NOT use old `.eslintrc` format

2. **Enforce Project Conventions**
   - camelCase file naming (e.g., `scanner.ts`)
   - Private member naming (`_memberName`)
   - Module boundary enforcement (index.ts exports)

3. **Prettier Configuration**
   - Single quotes: `"singleQuote": true`
   - Trailing commas: `"trailingComma": "all"`
   - Consistent with [architecture.md](../architecture.md) specifications

4. **CI/CD Pipeline**
   - Use `oven-sh/setup-bun` action for Bun setup
   - Run lint, format check, and tests on PRs
   - Fail CI if any check fails

5. **Package.json Scripts**
   - `lint`: Run ESLint on all files
   - `lint:fix`: Auto-fix ESLint issues
   - `format`: Format all files with Prettier
   - `format:check`: Check if files are formatted

6. **Documentation**
   - Update README.md with linting and formatting instructions
   - Document CI/CD pipeline
   - Document editor setup

### Technical Requirements

**ESLint Configuration (eslint.config.js):**
- Use flat config format (ESLint 9.x)
- Configure TypeScript support via `typescript-eslint`
- Enable recommended TypeScript rules
- Add custom rules for:
  - Explicit function return types (warn)
  - No `any` types (error)
  - No unused variables (error, except `_` prefixed)
- Disable rules that conflict with Prettier
- Configure file patterns to lint

**Prettier Configuration (.prettierrc):**
- Single quotes: `true`
- Trailing commas: `"all"`
- Print width: 100 (or 120)
- Tab width: 2
- Use spaces (not tabs)
- Semicolons: `true`

**CI/CD Workflow (.github/workflows/ci.yml):**
- Trigger: Pull requests to main, pushes to main
- Setup Bun using `oven-sh/setup-bun@v1`
- Install dependencies: `bun install`
- Run lint check: `bun run lint`
- Run format check: `bun run format:check`
- Run tests: `bun test`
- Fail if any step fails

**Package.json Scripts:**
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "bun test"
  }
}
```

### Architecture Compliance

**Module Structure:**
```
testdata-ai/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── .vscode/
│   ├── settings.json           # VS Code editor settings
│   └── extensions.json         # Recommended extensions
├── packages/
│   ├── core/
│   │   └── [existing structure]
│   └── cli/
│       └── [existing structure]
├── eslint.config.js            # ESLint flat config (NEW)
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore patterns
└── package.json                # Root scripts: lint, format
```

**File Naming Convention Enforcement:**

ESLint cannot enforce file naming directly, but we can add a custom script or use a plugin.

**Option 1: Custom validation script**
```typescript
// scripts/validate-file-names.ts
import { readdirSync } from 'fs';
import { join } from 'path';

function validateFileNames(dir: string): string[] {
  const errors: string[] = [];
  const files = readdirSync(dir, { recursive: true });

  for (const file of files) {
    if (typeof file === 'string' && file.endsWith('.ts')) {
      const basename = file.split('/').pop()!;
      if (basename.match(/^[A-Z]/)) {
        errors.push(`${file}: File name should use camelCase, not PascalCase`);
      }
    }
  }

  return errors;
}
```

**Option 2: Use eslint-plugin-filename-rules (if compatible with ESLint 9)**

**Recommendation**: Start with manual validation script, add to pre-commit hooks if needed.

**Private Member Naming Enforcement:**

TypeScript ESLint can enforce this with a custom rule:

```javascript
// eslint.config.js
{
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: ['property', 'method'],
        modifiers: ['private'],
        format: ['camelCase'],
        leadingUnderscore: 'require',
      },
    ],
  },
}
```

**Module Boundary Enforcement:**

This is harder to enforce automatically. Options:
1. **Import resolution plugin**: Restrict imports that bypass index.ts
2. **Manual code review**: Check during PRs
3. **Custom linting rule**: Write custom ESLint rule

**Recommendation**: Start with code review, add automated check if violations become common.

### Library & Framework Requirements

**Required Dependencies (devDependencies):**
```json
{
  "devDependencies": {
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0"
  }
}
```

**Framework Versions:**
- ESLint: 9.x (latest with flat config)
- TypeScript ESLint: 8.x (compatible with ESLint 9)
- Prettier: 3.x (latest stable)
- eslint-config-prettier: 9.x (disables conflicting rules)

**Installation Commands:**
```bash
# Install ESLint with TypeScript support
bun add -D eslint @eslint/js typescript-eslint

# Install Prettier
bun add -D prettier

# Install ESLint-Prettier integration
bun add -D eslint-config-prettier eslint-plugin-prettier
```

**Note on Bun Compatibility:**
- All these tools are Bun-compatible
- ESLint runs natively on Bun
- Prettier works seamlessly with Bun
- GitHub Actions has Bun support via `oven-sh/setup-bun`

### File Structure Requirements

**Configuration Files to Create:**
1. `eslint.config.js` - ESLint flat config (root)
2. `.prettierrc` - Prettier configuration (root)
3. `.prettierignore` - Prettier ignore patterns (root)
4. `.github/workflows/ci.yml` - GitHub Actions CI workflow
5. `.vscode/settings.json` - VS Code editor settings
6. `.vscode/extensions.json` - Recommended VS Code extensions

**Ignore Patterns:**

**.prettierignore:**
```
node_modules
dist
build
coverage
*.min.js
```

**Note on .eslintignore:**
- With flat config, ignore patterns are in `eslint.config.js`
- No separate `.eslintignore` file needed

```javascript
// eslint.config.js
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },
  // ... other configs
];
```

### Testing Requirements

**What to Test:**
1. **Linting works**: Run `bun run lint` on codebase
2. **Formatting works**: Run `bun run format` on codebase
3. **Auto-fix works**: Run `bun run lint:fix` and verify issues are fixed
4. **CI workflow runs**: Create test PR and verify all checks pass
5. **Editor integration**: Test VS Code format-on-save and auto-fix

**Manual Testing Steps:**
1. Create a file with linting violations (e.g., `any` type)
2. Run `bun run lint` - should report error
3. Run `bun run lint:fix` - should fix if auto-fixable
4. Create a file with formatting issues (e.g., double quotes)
5. Run `bun run format:check` - should fail
6. Run `bun run format` - should fix formatting
7. Push to GitHub - CI should run and pass all checks

**No Automated Tests Needed:**
- This is infrastructure setup, not application logic
- Manual verification is sufficient
- CI workflow will validate everything works

### Previous Story Intelligence Summary

**Key Patterns to Follow:**
1. **Export through index.ts**: All modules export via index.ts
2. **Co-located tests**: Unit tests next to implementation
3. **Comprehensive documentation**: Create detailed README or update main README
4. **TypeScript strict mode**: No `any` types, explicit return types
5. **Commit messages**: Use conventional commits format

**Files to Update:**
- `package.json` (root) - Add lint and format scripts
- `README.md` (root) - Add section on code quality tooling
- `docs/sprint-artifacts/sprint-status.yaml` - Update story status

**Files to Create:**
- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`
- `.github/workflows/ci.yml`
- `.vscode/settings.json`
- `.vscode/extensions.json`

**DO NOT Create:**
- `.eslintrc.json` or `.eslintrc.js` (old format)
- `.eslintignore` (use ignores in flat config)

### Project Context Reference

**Primary Reference Documents:**
- [Architecture Document](../architecture.md) - Technology stack, code conventions
- [Project Context](../project-context.md) - Critical implementation rules
- [Epics](../epics.md) - Story 1.5 acceptance criteria

**Critical Rules from Project Context:**
1. **Bun 1.x** is primary runtime
2. **TypeScript strict mode** required
3. **No `any` types** allowed
4. **ESM modules only** (no CommonJS)
5. **Named exports** preferred
6. **camelCase file naming** convention
7. **Private members** with `_` prefix

**Technology Stack:**
- Runtime: Bun 1.x
- Language: TypeScript 5.x (strict mode)
- Linting: ESLint 9.x (flat config)
- Formatting: Prettier 3.x
- CI/CD: GitHub Actions

### References

**Source Documents:**
- [Source: docs/epics.md#story-15-development-tooling-setup] - Acceptance criteria
- [Source: docs/architecture.md#technology-stack] - ESLint/Prettier configuration
- [Source: docs/architecture.md#code-quality-requirements] - File naming, private member conventions
- [Source: docs/project-context.md#technology-stack] - Bun, TypeScript, ESLint versions
- [Source: docs/project-context.md#language-specific-rules] - TypeScript conventions
- [Source: docs/sprint-artifacts/1-4-gherkin-bdd-testing-infrastructure.md] - Previous story patterns

**External Documentation:**
- ESLint 9.x Flat Config: https://eslint.org/docs/latest/use/configure/configuration-files-new
- TypeScript ESLint: https://typescript-eslint.io/
- Prettier: https://prettier.io/docs/en/configuration.html
- GitHub Actions Bun Setup: https://github.com/oven-sh/setup-bun

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent during implementation_

### Debug Log References

_To be filled by Dev agent during implementation_

### Completion Notes List

_To be filled by Dev agent during implementation_

### File List

_To be filled by Dev agent during implementation_

---

**Story Created**: 2026-01-06
**Epic**: 1 (Project Foundation & Development Setup)
**Story Number**: 1.5
**Status**: ready-for-dev
**Next Step**: Run `dev-story` with Dev agent to implement this story
