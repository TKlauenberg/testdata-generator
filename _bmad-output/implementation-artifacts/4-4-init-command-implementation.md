# Story 4.4: Init Command Implementation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **QA tester**,
I want **to quickly start with template schemas**,
So that **I can learn DSL syntax through examples**.

## Acceptance Criteria

**Given** I want to create a new schema
**When** I implement `td init` command in `packages/cli/src/commands/init.ts`
**Then** `td init` creates a basic schema template in current directory
**And** `td init [template]` accepts template name: `basic` (default) [Note: Additional templates (with-relationships, with-context) will be added in Epic 6/8 when features are implemented]
**And** the basic template includes simple field types and generators (int, float, string, boolean)
**And** templates are stored in `packages/cli/templates/` directory
**And** the command asks for confirmation before overwriting existing files
**And** the command displays next steps after template creation
**And** exit code is 0 on success, 3 if file already exists without confirmation
**And** Gherkin tests verify template creation and file handling

## Tasks / Subtasks

- [ ] Create templates directory and basic template (AC: 4)
  - [ ] Create `packages/cli/templates/` directory
  - [ ] Create `packages/cli/templates/basic.td` with simple field types
  - [ ] Document template in template comment header
  - [ ] Ensure template is valid and can be validated/generated
- [ ] Create `packages/cli/src/commands/init.ts` (AC: 1-8)
  - [ ] Import Commander, File System modules
  - [ ] Define command with `.command('init [template]')`
  - [ ] Accept optional template argument (default: 'basic') (AC: 2)
  - [ ] Load template from `templates/` directory (AC: 4)
  - [ ] Determine output filename (use template name + .td extension)
  - [ ] Check if file exists and prompt for confirmation (AC: 5)
  - [ ] Write template to current directory
  - [ ] Display success message with next steps (AC: 6)
  - [ ] Implement exit codes: 0 (success), 3 (file exists/error) (AC: 7)
- [ ] Register init command in `packages/cli/bin/td.ts` (AC: 1)
  - [ ] Import init command
  - [ ] Add to program with `.addCommand(initCommand)`
- [ ] Create comprehensive unit tests: `packages/cli/src/commands/init.test.ts` (AC: 8)
  - [ ] Test template loading (basic template)
  - [ ] Test file creation in clean directory
  - [ ] Test file exists scenario (with and without confirmation)
  - [ ] Test invalid template name handling
  - [ ] Test exit codes (0 for success, 3 for errors)
  - [ ] Test next steps message display
  - [ ] Test output filename generation
- [ ] Create Gherkin BDD tests: `packages/cli/features/initCommand.feature` (AC: 8)
  - [ ] Scenario: Create basic template successfully
  - [ ] Scenario: File already exists (cancel operation)
  - [ ] Scenario: File already exists (confirm overwrite)
  - [ ] Scenario: Invalid template name
  - [ ] Scenario: Display next steps after creation

## Dev Notes

### Current State Analysis

**What's Already Implemented:**
- ✅ CLI foundation with Commander.js (Story 4.1)
- ✅ Generate command with full pipeline (Story 4.2)
- ✅ Validate command with validation-only workflow (Story 4.3)
- ✅ File I/O patterns established (read .td files, error handling)
- ✅ Core library: complete DSL pipeline (scanner → parser → analyzer → generator)
- ✅ Test fixtures in `packages/cli/fixtures/` for testing
- ✅ Exit code conventions established (0=success, 1=validation, 2=generation, 3=file)
- ✅ Commander.js command pattern established in generate and validate

**What This Story Adds:**
- 🆕 Init command: `td init [template]`
- 🆕 Template system: Load pre-defined schema templates
- 🆕 Templates directory: `packages/cli/templates/`
- 🆕 Basic template: Simple schema with common field types
- 🆕 File existence checking and confirmation prompts
- 🆕 User guidance: Display next steps after template creation
- 🆕 Educational templates for learning DSL syntax

**What's Deferred to Future Stories:**
- ⏭️ Story 4.5: Advanced Rust-style error formatter
- ⏭️ Epic 6: Advanced templates with relationships (with-relationships template)
- ⏭️ Epic 8: Context-based templates (with-context template)

**Key Difference from Previous Stories:**
This story focuses on **creating** files rather than **reading** them, and introduces interactive confirmation prompts for better user experience.

### Architecture Context

**Project Structure:**
```
packages/cli/
├── bin/
│   └── td.ts              # Main CLI entry point ✅ EXISTS
├── src/
│   ├── commands/
│   │   ├── generate.ts    # ✅ EXISTS (Story 4.2)
│   │   ├── generate.test.ts # ✅ EXISTS
│   │   ├── validate.ts    # ✅ EXISTS (Story 4.3)
│   │   ├── validate.test.ts # ✅ EXISTS
│   │   ├── init.ts        # 🆕 THIS STORY
│   │   └── init.test.ts   # 🆕 THIS STORY
│   └── formatters/        # Future: Story 4.5
├── templates/             # 🆕 THIS STORY
│   └── basic.td           # 🆕 THIS STORY
├── features/
│   ├── cliFoundation.feature      # ✅ EXISTS (Story 4.1)
│   ├── generateCommand.feature    # ✅ EXISTS (Story 4.2)
│   ├── validateCommand.feature    # ✅ EXISTS (Story 4.3)
│   └── initCommand.feature        # 🆕 THIS STORY
└── fixtures/              # ✅ EXISTS (Story 4.2)
    └── valid-simple.td    # ✅ EXISTS (can be used as reference)
```

**Core Library Integration Points:**
From `@testdata-ai/core` package:
```typescript
// Not needed directly - init just copies template files
// But template must be valid for validate/generate commands
import { scan, parse, analyze } from '@testdata-ai/core';
```

**CLI Command Pattern (Commander.js):**
```typescript
import { Command } from 'commander';

export const initCommand = new Command('init')
  .description('Initialize a new schema from template')
  .argument('[template]', 'Template name (basic)', 'basic')
  .action(async (template: string) => {
    // Implementation here
  });
```

### Technical Requirements

**Template System Design:**

The init command follows a simple file-based template system:

1. **Template Storage**: Templates stored in `packages/cli/templates/` directory
2. **Template Naming**: Templates named as `{template-name}.td`
3. **Template Loading**: Read template file synchronously at runtime
4. **Output Naming**: Output file named as `{template-name}.td` in current directory

**Template Content (basic.td):**

```typescript
// File: packages/cli/templates/basic.td
//
// This is a basic testdata-ai schema template demonstrating
// common field types and generators.
//
// To generate data from this schema:
//   td generate basic.td --count 10
//
// To validate this schema:
//   td validate basic.td

schema User {
  id: number
  username: string
  email: string
  active: boolean
  score: number
}
```

**Init Command Flow:**

```typescript
async function initCommand(template: string) {
  // 1. Validate template name exists
  const templatePath = path.join(__dirname, '../templates', `${template}.td`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template '${template}' not found`);
    console.error('Available templates: basic');
    process.exit(3);
  }

  // 2. Determine output filename
  const outputFilename = `${template}.td`;
  const outputPath = path.join(process.cwd(), outputFilename);

  // 3. Check if file already exists
  if (fs.existsSync(outputPath)) {
    // Prompt for confirmation (use readline for interactive input)
    const answer = await promptConfirmation(
      `File '${outputFilename}' already exists. Overwrite? (y/n): `
    );

    if (!answer) {
      console.log('Operation cancelled');
      process.exit(3);
    }
  }

  // 4. Copy template to current directory
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  await fs.writeFile(outputPath, templateContent, 'utf-8');

  // 5. Display success and next steps
  console.log(`✓ Created ${outputFilename}`);
  console.log('\nNext steps:');
  console.log(`  1. Edit ${outputFilename} to customize your schema`);
  console.log(`  2. Validate: td validate ${outputFilename}`);
  console.log(`  3. Generate data: td generate ${outputFilename} --count 10`);

  process.exit(0);
}
```

**User Confirmation Prompt:**

Use Node.js `readline` for interactive confirmation:

```typescript
import * as readline from 'readline';

async function promptConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
```

**Exit Codes (Epic 4 Convention):**

| Exit Code | Scenario            | Example                         |
| --------- | ------------------- | ------------------------------- |
| 0         | Success             | Template created successfully   |
| 3         | File/template error | Template not found, file exists |

Note: Exit codes 1 (validation) and 2 (generation) don't apply to init command.

**Error Handling:**

```typescript
// Template not found
if (!templateExists) {
  console.error(`Error: Template '${template}' not found`);
  console.error('Available templates: basic');
  process.exit(3);
}

// File already exists (user declined overwrite)
if (fileExists && !confirmed) {
  console.log('Operation cancelled');
  process.exit(3);
}

// File write error
try {
  await fs.writeFile(outputPath, content);
} catch (err) {
  console.error(`Error creating file: ${err.message}`);
  process.exit(3);
}
```

### Library and Framework Requirements

**Commander.js v14.0.2 Patterns:**

Story 4.2 and 4.3 established the command pattern. Init command follows similar structure:

```typescript
// Define command with optional argument
export const initCommand = new Command('init')
  .description('Initialize a new schema from template')
  .argument('[template]', 'Template name (default: basic)', 'basic')
  .action(async (template: string) => {
    try {
      // 1. Validate template exists
      // 2. Check output file
      // 3. Prompt for confirmation if needed
      // 4. Copy template
      // 5. Display next steps
      process.exit(0);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(3);
    }
  });
```

**File I/O Patterns:**

Reuse and adapt patterns from Stories 4.2 and 4.3:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

// Read template (synchronous for simplicity - small files)
const templatePath = path.join(__dirname, '../templates', `${template}.td`);
const content = await fs.readFile(templatePath, 'utf-8');

// Check file exists (synchronous)
const fileExists = await fs.access(outputPath)
  .then(() => true)
  .catch(() => false);

// Write output file
await fs.writeFile(outputPath, content, 'utf-8');
```

**Interactive I/O with Readline:**

```typescript
import * as readline from 'readline';

async function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Path Resolution:**

```typescript
// Template path (relative to command file)
const templatePath = path.join(__dirname, '../templates', `${template}.td`);

// Output path (current working directory)
const outputPath = path.join(process.cwd(), `${template}.td`);

// Alternative: Use import.meta.url for ESM
const __dirname = path.dirname(new URL(import.meta.url).pathname);
```

### File Structure Requirements

**Files to Create:**

1. **packages/cli/templates/basic.td** (TEMPLATE):

```typescript
// testdata-ai Basic Schema Template
//
// This template demonstrates the fundamental field types and generators
// available in testdata-ai DSL.
//
// Quick Start:
//   1. Customize the schema by adding, removing, or modifying fields
//   2. Validate your schema: td validate basic.td
//   3. Generate test data: td generate basic.td --count 10
//
// Field Types:
//   - number: Numeric values (integers or floats)
//   - string: Text values
//   - boolean: true/false values
//
// Learn More:
//   - Full documentation: docs/dsl-reference.md
//   - More examples: examples/ directory

schema User {
  id: number
  username: string
  email: string
  active: boolean
  score: number
}
```

2. **packages/cli/src/commands/init.ts** (MAIN IMPLEMENTATION):

```typescript
/**
 * Init Command Implementation
 *
 * Implements the `td init` command for initializing new schemas from templates.
 *
 * @module commands/init
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Get the directory name for ESM modules.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Available template names.
 */
const AVAILABLE_TEMPLATES = ['basic'];

/**
 * Default template name.
 */
const DEFAULT_TEMPLATE = 'basic';

/**
 * Init command for creating new schemas from templates.
 *
 * Usage:
 *   td init
 *   td init basic
 */
export const initCommand = new Command('init')
  .description('Initialize a new schema from template')
  .argument('[template]', `Template name (default: ${DEFAULT_TEMPLATE})`, DEFAULT_TEMPLATE)
  .action(async (template: string) => {
    try {
      // 1. Validate template name
      if (!AVAILABLE_TEMPLATES.includes(template)) {
        console.error(`Error: Template '${template}' not found`);
        console.error(`Available templates: ${AVAILABLE_TEMPLATES.join(', ')}`);
        process.exit(3);
      }

      // 2. Resolve template path
      const templatePath = path.join(__dirname, '../../templates', `${template}.td`);

      // Verify template file exists
      try {
        await fs.access(templatePath);
      } catch {
        console.error(`Error: Template file not found at ${templatePath}`);
        process.exit(3);
      }

      // 3. Determine output path
      const outputFilename = `${template}.td`;
      const outputPath = path.join(process.cwd(), outputFilename);

      // 4. Check if output file already exists
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        const confirmed = await promptConfirmation(
          `File '${outputFilename}' already exists. Overwrite? (y/n): `
        );

        if (!confirmed) {
          console.log('Operation cancelled');
          process.exit(3);
        }
      }

      // 5. Read template content
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // 6. Write to output file
      await fs.writeFile(outputPath, templateContent, 'utf-8');

      // 7. Display success message and next steps
      console.log(`✓ Created ${outputFilename}`);
      console.log('\nNext steps:');
      console.log(`  1. Edit ${outputFilename} to customize your schema`);
      console.log(`  2. Validate: td validate ${outputFilename}`);
      console.log(`  3. Generate data: td generate ${outputFilename} --count 10`);
      console.log('\nLearn more: docs/dsl-reference.md\n');

      process.exit(0);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Error: ${error.message}`);
      process.exit(3);
    }
  });

/**
 * Prompt user for yes/no confirmation.
 *
 * @param prompt - The prompt message to display
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
async function promptConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
```

3. **packages/cli/src/commands/init.test.ts** (UNIT TESTS):

```typescript
/**
 * Init Command Unit Tests
 *
 * Tests for the `td init` command implementation.
 *
 * @module commands/init.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { initCommand } from './init';

describe('Init Command', () => {
  const testOutputDir = path.join(__dirname, '../../test-output');
  const originalCwd = process.cwd();

  beforeEach(async () => {
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
    // Change to test directory
    process.chdir(testOutputDir);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(originalCwd);
    // Clean up test output directory
    await fs.rm(testOutputDir, { recursive: true, force: true });
  });

  describe('Template Loading', () => {
    it('should create basic.td template in current directory', async () => {
      // Mock stdin for non-interactive testing
      const result = await executeInitCommand(['basic']);

      // Verify file was created
      const filePath = path.join(testOutputDir, 'basic.td');
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);

      // Verify content is valid
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('schema');
      expect(content).toContain('User');
    });

    it('should use basic template as default', async () => {
      const result = await executeInitCommand([]);

      const filePath = path.join(testOutputDir, 'basic.td');
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });
  });

  describe('Template Validation', () => {
    it('should exit with code 3 for invalid template name', async () => {
      const result = await executeInitCommand(['nonexistent']);

      expect(result.exitCode).toBe(3);
      expect(result.stderr).toContain('Template');
      expect(result.stderr).toContain('not found');
    });

    it('should list available templates on error', async () => {
      const result = await executeInitCommand(['invalid']);

      expect(result.stderr).toContain('Available templates');
      expect(result.stderr).toContain('basic');
    });
  });

  describe('File Existence Handling', () => {
    it('should exit with code 3 if file exists and user cancels', async () => {
      // Create file first
      const filePath = path.join(testOutputDir, 'basic.td');
      await fs.writeFile(filePath, 'existing content', 'utf-8');

      // Mock stdin to answer 'n' for no
      const result = await executeInitCommand(['basic'], 'n\n');

      expect(result.exitCode).toBe(3);
      expect(result.stdout).toContain('cancelled');

      // Verify original content unchanged
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('existing content');
    });

    it('should overwrite if file exists and user confirms', async () => {
      // Create file first
      const filePath = path.join(testOutputDir, 'basic.td');
      await fs.writeFile(filePath, 'old content', 'utf-8');

      // Mock stdin to answer 'y' for yes
      const result = await executeInitCommand(['basic'], 'y\n');

      expect(result.exitCode).toBe(0);

      // Verify file was overwritten
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).not.toBe('old content');
      expect(content).toContain('schema');
    });
  });

  describe('Success Output', () => {
    it('should display success message', async () => {
      const result = await executeInitCommand(['basic']);

      expect(result.stdout).toContain('Created');
      expect(result.stdout).toContain('basic.td');
    });

    it('should display next steps', async () => {
      const result = await executeInitCommand(['basic']);

      expect(result.stdout).toContain('Next steps');
      expect(result.stdout).toContain('Edit');
      expect(result.stdout).toContain('Validate');
      expect(result.stdout).toContain('Generate');
    });

    it('should include validate command in next steps', async () => {
      const result = await executeInitCommand(['basic']);

      expect(result.stdout).toContain('td validate basic.td');
    });

    it('should include generate command example in next steps', async () => {
      const result = await executeInitCommand(['basic']);

      expect(result.stdout).toContain('td generate basic.td');
    });
  });

  describe('Exit Codes', () => {
    it('should exit with code 0 on success', async () => {
      const result = await executeInitCommand(['basic']);

      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 3 for invalid template', async () => {
      const result = await executeInitCommand(['invalid']);

      expect(result.exitCode).toBe(3);
    });

    it('should exit with code 3 if user cancels overwrite', async () => {
      // Create existing file
      const filePath = path.join(testOutputDir, 'basic.td');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const result = await executeInitCommand(['basic'], 'n\n');

      expect(result.exitCode).toBe(3);
    });
  });
});

/**
 * Helper function to execute init command and capture output.
 *
 * @param args - Command arguments
 * @param stdin - Simulated stdin input
 * @returns Promise with exit code and output
 */
async function executeInitCommand(
  args: string[],
  stdin?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  // Implementation would use child_process or similar to execute command
  // For now, this is a placeholder showing the expected interface
  throw new Error('Not implemented - requires process execution mock');
}
```

4. **packages/cli/features/initCommand.feature** (GHERKIN TESTS):

```gherkin
Feature: Init Command - Schema Template Initialization
  As a QA tester
  I want to initialize new schemas from templates
  So that I can quickly start with example schemas

  Background:
    Given the CLI is installed
    And I am in an empty directory

  @init @happy-path
  Scenario: Create basic template successfully
    When QA Tester runs command "td init"
    Then the command should succeed with exit code 0
    And a file named "basic.td" should be created
    And the file should contain a valid schema definition
    And the output should contain "✓ Created basic.td"
    And the output should contain "Next steps"
    And the output should mention "td validate basic.td"
    And the output should mention "td generate basic.td"

  @init @template-selection
  Scenario: Create basic template explicitly
    When QA Tester runs command "td init basic"
    Then the command should succeed with exit code 0
    And a file named "basic.td" should be created
    And the file should contain a valid schema definition

  @init @error-handling
  Scenario: Invalid template name
    When QA Tester runs command "td init nonexistent"
    Then the command should fail with exit code 3
    And the error output should contain "Template 'nonexistent' not found"
    And the error output should contain "Available templates: basic"
    And no file should be created

  @init @file-handling
  Scenario: File already exists - cancel operation
    Given a file named "basic.td" already exists
    When QA Tester runs command "td init" and answers "n"
    Then the command should fail with exit code 3
    And the output should contain "Operation cancelled"
    And the existing file should not be modified

  @init @file-handling
  Scenario: File already exists - confirm overwrite
    Given a file named "basic.td" already exists with content "old schema"
    When QA Tester runs command "td init" and answers "y"
    Then the command should succeed with exit code 0
    And the file "basic.td" should be overwritten
    And the file should contain the template content
    And the file should not contain "old schema"

  @init @guidance
  Scenario: Display helpful next steps after creation
    When QA Tester runs command "td init"
    Then the output should guide the user with:
      | Next Step    | Description                            |
      | Edit         | Edit basic.td to customize your schema |
      | Validate     | td validate basic.td                   |
      | Generate     | td generate basic.td --count 10        |
    And the output should mention documentation

  @init @template-validity
  Scenario: Created template should be valid
    When QA Tester runs command "td init"
    And QA Tester runs command "td validate basic.td"
    Then the validate command should succeed
    And the output should contain "✓ Schema is valid"
```

### Testing Requirements

**Unit Test Coverage:**

Must cover these scenarios:
- ✅ Template loading (basic template)
- ✅ Default template when no argument provided
- ✅ File creation in current directory
- ✅ Invalid template name error handling
- ✅ File exists with user cancellation
- ✅ File exists with user confirmation (overwrite)
- ✅ Success message display
- ✅ Next steps guidance display
- ✅ Exit codes (0 for success, 3 for errors)

**Gherkin Test Coverage:**

Must verify these behaviors:
- ✅ Create basic template successfully (default)
- ✅ Create basic template explicitly
- ✅ Handle invalid template name
- ✅ Handle file already exists (cancel)
- ✅ Handle file already exists (overwrite)
- ✅ Display comprehensive next steps
- ✅ Created template is valid (can be validated/generated)

### Previous Story Intelligence

**Learnings from Story 4.3 (Validate Command):**

1. **File I/O Error Handling Pattern Established:**
   - Use try-catch with specific error code checking (ENOENT, EACCES)
   - Exit code 3 for all file-related errors
   - Consistent error message format: "Error: {message}"

2. **Commander.js Command Structure:**
   - Export named constant: `export const commandName = new Command()`
   - Use `.action(async () => {})` for async operations
   - Register in `bin/td.ts` with `.addCommand(commandName)`

3. **Output Formatting:**
   - Success messages start with ✓ symbol
   - Error messages go to stderr with `console.error`
   - Exit codes must be explicit: `process.exit(code)`

4. **Testing Approach:**
   - Co-located unit tests: `{command}.test.ts`
   - Separate Gherkin features: `features/{command}Command.feature`
   - Use fixtures for test data
   - Mock file system operations in unit tests

**Code Patterns to Reuse from Story 4.3:**

```typescript
// ✅ DO: Use this error handling pattern
try {
  const content = await fs.readFile(file, 'utf-8');
} catch (err: unknown) {
  const error = err as { code?: string; message?: string };
  if (error.code === 'ENOENT') {
    console.error(`Error: File '${file}' not found`);
  }
  process.exit(3);
}

// ✅ DO: Use this success output pattern
console.log('✓ Schema is valid');

// ✅ DO: Use explicit exit codes
process.exit(0); // Success
process.exit(3); // File error
```

**What NOT to Do (Anti-patterns from previous stories):**

- ❌ DON'T mix stdout (console.log) and stderr (console.error) incorrectly
- ❌ DON'T forget to handle all file error cases (ENOENT, EACCES, etc.)
- ❌ DON'T use implicit exit (let process end naturally) - always explicit
- ❌ DON'T skip confirmation prompt for destructive operations
- ❌ DON'T forget ESLint disable comments for intentional console usage

### Git Intelligence Summary

**Recent Commits Analysis (Last 10 commits):**

- `3c84a1f`: code-review 4.3 (validate command)
- `f4cce16`: implementation 4.3 (validate command)
- `e14ae8b`: created story 4.3
- `a8a6d21`: code review 4.2 (generate command)
- `079a9f6`: implement story 4.2 (generate command)
- `7efbfa7`: create-story 4.2
- `0243967`: fix Story 4.1 (code review - cleanup, enhance tests, fix configs)
- `8c48427`: create-story 4.1 (CLI foundation)

**Patterns Observed:**

1. **Story → Implementation → Code Review Flow:**
   - Create story → Implement → Run code review
   - Each story gets dedicated implementation commit
   - Code reviews result in fix commits

2. **Files Modified Per Story (Typical Epic 4 Pattern):**
   - Create `packages/cli/src/commands/{command}.ts`
   - Create `packages/cli/src/commands/{command}.test.ts`
   - Create `packages/cli/features/{command}Command.feature`
   - Update `packages/cli/bin/td.ts` to register command

3. **Testing Conventions:**
   - Unit tests run with Bun test framework
   - Gherkin tests created for all commands
   - Fixtures reused across stories

4. **Library Usage Patterns:**
   - Commander.js v14.0.2 for CLI structure
   - Core library imports from `@testdata-ai/core`
   - File system operations with `fs/promises`

**Recommended Git Workflow for This Story:**

```bash
# After implementation
git add packages/cli/templates/basic.td
git add packages/cli/src/commands/init.ts
git add packages/cli/src/commands/init.test.ts
git add packages/cli/features/initCommand.feature
git add packages/cli/bin/td.ts  # If modified to register command
git commit -m "implementation 4.4: init command with basic template"

# After tests pass
bun test
git add .  # If test fixes needed
git commit -m "test: verify init command behavior"

# After code review
git add .  # Code review fixes
git commit -m "code-review 4.4: address init command feedback"
```

### Latest Technical Information

**Commander.js v14.0.2 Latest Patterns (2024):**

**Arguments vs Options:**
- Use `.argument()` for positional required/optional args
- Use `.option()` for named flags
- Default values can be specified in argument definition

```typescript
// ✅ Correct pattern for optional argument with default
.argument('[template]', 'Template name', 'basic')

// Alternative: Named option
.option('-t, --template <name>', 'Template name', 'basic')
```

**Async Action Handlers:**
Commander.js v14 fully supports async/await:

```typescript
.action(async (arg, options) => {
  await someAsyncOperation();
  process.exit(0);
})
```

**Node.js Readline Interface (Current Best Practices):**

Modern Node.js recommends `readline/promises` for async readline:

```typescript
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const answer = await rl.question('Prompt: ');
rl.close();
```

**Alternative: Simple callback-based (more widely supported):**

```typescript
import * as readline from 'readline';

function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**ESM Module Path Resolution:**

For ESM modules (which testdata-ai uses), use `import.meta.url`:

```typescript
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Bun-Specific Optimizations:**

While targeting Node.js compatibility, Bun offers faster alternatives:

```typescript
// Node.js standard (compatible)
import * as fs from 'fs/promises';

// Bun-specific (faster but less portable)
const file = Bun.file('path/to/file.td');
const content = await file.text();
```

**Recommendation:** Stick with Node.js `fs/promises` for maximum compatibility.

### Project Context Reference

**Foundation Patterns Documentation:**

See [docs/foundation-patterns.md](../../docs/foundation-patterns.md) for complete reference on:
- Result type pattern usage
- Diagnostic system for errors
- Testing conventions (unit + Gherkin)
- Code style and naming conventions

**Example Schema Files:**

Reference existing examples for inspiration:
- [examples/basic/users.td](../../examples/basic/users.td) - Simple schema example
- [packages/cli/fixtures/valid-simple.td](../../packages/cli/fixtures/valid-simple.td) - Minimal test fixture

**Architecture Documentation:**

Comprehensive architecture decisions:
- [Architecture Core Decisions](../../_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md)
- [Implementation Patterns](../../_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- [Project Structure](../../_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md)

### References

**Epic:** [Epic 4: CLI Tool Interface](../../_bmad-output/planning-artifacts/epics/epic-4-cli-tool-interface.md)

**Previous Stories:**
- [Story 4.1: CLI Foundation](./4-1-cli-foundation-with-commander-js.md) - Base CLI setup
- [Story 4.2: Generate Command](./4-2-generate-command-implementation.md) - File I/O patterns
- [Story 4.3: Validate Command](./4-3-validate-command-implementation.md) - Command structure pattern

**Architecture:**
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#cli-operations]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#cli-package-structure]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#file-naming]

## Dev Agent Record

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent - record of decisions, deviations, blockers -->

### File List

<!-- Will be filled by dev agent - all files created or modified -->
