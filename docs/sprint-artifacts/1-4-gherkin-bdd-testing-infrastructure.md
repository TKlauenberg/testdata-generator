# Story 1.4: Gherkin/BDD Testing Infrastructure

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **Gherkin/BDD testing infrastructure integrated with Bun**,
So that **all subsequent tests can be written in readable Given/When/Then format that aligns with our acceptance criteria**.

## Acceptance Criteria

**Given** I need to write BDD-style tests for the project
**When** I set up the Gherkin testing infrastructure
**Then** `@cucumber/cucumber` is installed and configured to run via `runCucumber()` function
**And** `@serenity-js/cucumber` and related SerenityJS packages are installed for Screenplay pattern
**And** a `features/` directory exists in `packages/core/` with example `.feature` files
**And** step definitions use the Screenplay pattern with Actors, Abilities, Tasks, and Questions
**And** an example feature file demonstrates Given/When/Then syntax with passing tests
**And** `bun test` command runs both regular tests and Cucumber feature tests via `runCucumber()`
**And** documentation explains how to write feature files and Screenplay-based step definitions
**And** the test setup supports TypeScript for all Screenplay components
**And** future stories can reference this Screenplay pattern for their test implementations

## Tasks / Subtasks

- [ ] Install Cucumber and SerenityJS frameworks (AC: 1)
  - [ ] Add `@cucumber/cucumber` to `packages/core/package.json`
  - [ ] Add `@serenity-js/cucumber` for Screenplay pattern integration
  - [ ] Add `@serenity-js/core` for Screenplay pattern core features
  - [ ] Add `@serenity-js/assertions` for fluent assertions in Screenplay
  - [ ] Add `@serenity-js/serenity-bdd` for test reporting
  - [ ] Configure SerenityJS for Bun runtime compatibility
  - [ ] Verify all packages work with Bun's TypeScript support
- [ ] Configure Cucumber with runCucumber function (AC: 1, 7)
  - [ ] Create `cucumber.config.ts` or `cucumber.js` configuration
  - [ ] Set up `runCucumber()` integration with Bun test runner
  - [ ] Configure feature file paths and step definition paths
  - [ ] Configure TypeScript support for step definitions
  - [ ] Create test script that invokes `runCucumber()` function
  - [ ] Update `package.json` with test:bdd or test:cucumber script
- [ ] Create features directory structure (AC: 2, 3)
  - [ ] Create `packages/core/features/` directory
  - [ ] Create `packages/core/features/step_definitions/` directory
  - [ ] Create `packages/core/features/support/` directory for hooks and utilities
  - [ ] Add `.gitkeep` or initial files to establish structure
- [ ] Create example feature file (AC: 2, 4)
  - [ ] Write example feature: `packages/core/features/example.feature`
  - [ ] Use Given/When/Then syntax demonstrating project patterns
  - [ ] Include multiple scenarios to show different test patterns
  - [ ] Align with acceptance criteria format used in epics
  - [ ] Include tags for test organization (e.g., @example, @unit)
- [ ] Set up Screenplay pattern infrastructure (AC: 3, 4, 7)
  - [ ] Create directory structure for Screenplay components:
    - [ ] `packages/core/features/support/abilities/` (Abilities implemented in future stories)
    - [ ] `packages/core/features/support/tasks/` (Tasks implemented in future stories)
    - [ ] `packages/core/features/support/questions/` (Questions implemented in future stories)
    - [ ] `packages/core/features/support/screenplay/` (utilities and helpers)
  - [ ] Create Actor configuration and Cast in support/screenplay/Actors.ts
  - [ ] Set up SerenityJS crew configuration for reporters
  - [ ] Use SerenityJS TypeScript types throughout
- [ ] Implement example step definitions using Screenplay (AC: 3, 4, 7)
  - [ ] Create `packages/core/features/step_definitions/example.steps.ts`
  - [ ] Implement basic example showing Screenplay pattern structure
  - [ ] Demonstrate Actor parameter in step definitions
  - [ ] Show pattern: Given/When use Actor.attemptsTo(Task), Then use Actor.asks(Question)
  - [ ] Use placeholder/simple Tasks and Questions for demonstration
  - [ ] Document that real Abilities/Tasks/Questions will be implemented with actual features
- [ ] Integrate runCucumber with Bun test command (AC: 5)
  - [ ] Create test runner file that calls `runCucumber()` with configuration
  - [ ] Ensure `bun test` command discovers and runs the Cucumber test runner
  - [ ] Verify `bun test` runs both unit tests (.test.ts) and Cucumber tests (.feature)
  - [ ] Configure SerenityJS reporter for clear feature/scenario output
  - [ ] Test that failures are reported correctly with Screenplay context
  - [ ] Ensure CI compatibility (Cucumber tests run in CI environment)
- [ ] Write comprehensive documentation (AC: 6)
  - [ ] Create `packages/core/features/README.md`
  - [ ] Document how to write new feature files
  - [ ] Document the Screenplay pattern: Actors, Abilities, Tasks, Questions
  - [ ] Document how to write Screenplay-based step definitions
  - [ ] Provide examples of common Screenplay patterns (Tasks, Questions, Abilities)
  - [ ] Document how to run Cucumber tests via runCucumber() and Bun
  - [ ] Explain how Actors maintain state through Abilities
  - [ ] Document SerenityJS assertion patterns with Ensure
  - [ ] Document best practices for Screenplay BDD testing in this project
- [ ] Export through module index if needed (AC: 8)
  - [ ] If custom utilities created, export through appropriate index.ts
  - [ ] Ensure future stories can import shared step definition utilities
  - [ ] Document any exported utilities in README
- [ ] Verify complete integration (AC: 4, 5, 8)
  - [ ] Run `bun test` and verify all tests pass
  - [ ] Verify both .test.ts and .feature files execute
  - [ ] Check test output formatting is clear
  - [ ] Verify example feature demonstrates full workflow
  - [ ] Confirm setup is ready for use in future stories

## Dev Notes

### 🎯 ULTIMATE CONTEXT ENGINE ANALYSIS - Everything You Need to Know!

This story is **FOUNDATIONAL** for the entire testing strategy of testdata-ai. Every future story will write tests using this BDD infrastructure, so it must be robust, well-documented, and easy to use. The acceptance criteria in the epics document are already written in Given/When/Then format, making BDD the natural testing approach.

### Critical Importance

**Why BDD/Gherkin with Screenplay Pattern for This Project:**

1. **Alignment with Acceptance Criteria**: All stories in [epics.md](../epics.md) have acceptance criteria written in Given/When/Then format. Using Gherkin for tests creates perfect traceability from requirements to test implementation.

2. **QA-Friendly Documentation**: Since the target users are QA testers, having tests written in natural language (Gherkin) serves double duty as both tests and usage documentation. QA testers can read the `.feature` files to understand how the tool works.

3. **Behavior-Driven Development**: The DSL parser and generator are complex systems with many edge cases. BDD helps us think about behavior from the user's perspective rather than implementation details.

4. **Living Documentation**: As the DSL evolves, the feature files serve as living documentation of what the system does and how it should behave.

5. **Screenplay Pattern Benefits**: The Screenplay pattern provides a maintainable, reusable testing architecture where:
   - **Actors** represent users/testers interacting with the system
   - **Abilities** encapsulate what Actors can do (parse schemas, generate data, etc.)
   - **Tasks** represent high-level business actions (validate schema, generate records)
   - **Questions** allow querying system state (what was the validation result?)
   - **Separation of Concerns**: Test intent (step definitions) is separated from implementation (Tasks/Questions)
   - **Reusability**: Tasks and Questions can be composed and reused across scenarios

### Architecture Context

**From [architecture.md](../architecture.md#testing-strategy):**

The architecture document doesn't explicitly mandate Gherkin, but it does specify:
- Bun's built-in test runner is the primary test framework
- Tests should be comprehensive and cover edge cases
- Testing strategy should validate each compilation phase independently

**From [project-context.md](../project-context.md#testing-rules):**

The project context specifies:
- **Bun's built-in test runner** is mandatory (NOT Jest, NOT Mocha)
- Co-located tests (*.test.ts files next to implementation)
- Test structure uses Bun's `describe`, `test`, `expect`
- Running tests: `bun test`, `bun test scanner`, `bun test --coverage`

**Integration Challenge**: We need to integrate Cucumber with Bun's test runner using the `runCucumber()` function while maintaining compatibility with Bun's test command.

### Framework Decision: Cucumber with SerenityJS Screenplay Pattern

**DECISION MADE**: Use `@cucumber/cucumber` with SerenityJS for the Screenplay pattern implementation.

#### Chosen Approach: Cucumber + SerenityJS

**Framework Stack:**
- `@cucumber/cucumber` - Standard Cucumber runner with `runCucumber()` function
- `@serenity-js/cucumber` - SerenityJS integration for Cucumber
- `@serenity-js/core` - Core Screenplay pattern implementation
- `@serenity-js/assertions` - Fluent assertions (Ensure, Check)
- `@serenity-js/serenity-bdd` - Test reporting and documentation

**Why This Stack:**

1. **Standard Cucumber**: Using `@cucumber/cucumber` with `runCucumber()` provides the official Gherkin implementation with full .feature file support
2. **Screenplay Pattern**: SerenityJS provides the best Screenplay pattern implementation for TypeScript/JavaScript
3. **Maintainability**: Screenplay pattern separates test intent from implementation, making tests more maintainable
4. **Reusability**: Tasks, Questions, and Abilities can be shared across scenarios and features
5. **Type Safety**: Full TypeScript support throughout the stack
6. **Community**: Both Cucumber and SerenityJS are mature, well-documented frameworks

**Integration with Bun:**

The `runCucumber()` function can be invoked from a Bun test file:

```typescript
// tests/cucumber.runner.ts
import { runCucumber } from '@cucumber/cucumber';
import { configure } from '@serenity-js/core';

// Bun test that runs Cucumber
import { test } from 'bun:test';

test('Run Cucumber features', async () => {
  // Configure SerenityJS
  configure({
    crew: [
      // Configure reporters, stage crew
    ]
  });

  // Run Cucumber with configuration
  const result = await runCucumber({
    parallel: 0,
    format: ['progress'],
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    import: ['features/**/*.feature']
  });

  if (!result.success) {
    throw new Error('Cucumber tests failed');
  }
});
```

**Screenplay Pattern Architecture:**

```typescript
// Actor with Abilities
const tester = Actor.named('QA Tester').whoCan(
  ParseSchemas.usingCoreLibrary(),
  GenerateData.usingCoreLibrary(),
  ValidateSchemas.usingCoreLibrary()
);

// Task example
export class ValidateSchema implements Task {
  static fromSource(source: string) {
    return new ValidateSchema(source);
  }

  async performAs(actor: Actor): Promise<void> {
    const validate = ValidateSchemas.as(actor);
    await actor.attemptsTo(
      validate.schema(this.source)
    );
  }
}

// Question example
export class ValidationResult implements Question<Result<ValidatedProgram>> {
  async answeredBy(actor: Actor): Promise<Result<ValidatedProgram>> {
    return ValidateSchemas.as(actor).getLastResult();
  }
}

// Step definition using Screenplay
Given('{actor} has a valid DSL schema', (actor: Actor) => {
  // Actor setup
});

When('{actor} validates the schema', async (actor: Actor) => {
  await actor.attemptsTo(
    ValidateSchema.fromSource(actor.recall('schemaSource'))
  );
});

Then('{actor} should see validation succeeded', async (actor: Actor) => {
  await actor.attemptsTo(
    Ensure.that(ValidationResult.value(), property('ok', equals(true)))
  );
});
```

### Directory Structure with Screenplay Pattern

```
packages/core/
├── src/
│   ├── scanner/
│   │   ├── scanner.ts
│   │   └── scanner.test.ts          # Unit tests (Bun native)
│   ├── parser/
│   │   ├── parser.ts
│   │   └── parser.test.ts           # Unit tests (Bun native)
│   └── common/
│       ├── result.ts
│       └── result.test.ts           # Unit tests (Bun native)
│
├── features/                          # BDD/Cucumber tests with Screenplay
│   ├── README.md                      # Complete Screenplay pattern documentation
│   ├── example.feature                # Example feature file (simple demonstration)
│   ├── step_definitions/
│   │   ├── example.steps.ts          # Example step definitions using Screenplay pattern
│   │   └── common.steps.ts           # Common/shared step definitions (future)
│   └── support/
│       ├── serenity.config.ts         # SerenityJS configuration
│       ├── abilities/                 # Screenplay Abilities (created per feature)
│       │   └── .gitkeep               # Abilities implemented with actual features
│       ├── tasks/                     # Screenplay Tasks (created per feature)
│       │   └── .gitkeep               # Tasks implemented with actual features
│       ├── questions/                 # Screenplay Questions (created per feature)
│       │   └── .gitkeep               # Questions implemented with actual features
│       └── screenplay/                # Screenplay utilities
│           ├── Actors.ts              # Actor configuration/factory (Cast)
│           └── helpers.ts             # Screenplay helper utilities
│
├── tests/
│   └── cucumber.runner.ts             # Bun test that runs Cucumber via runCucumber()
│
└── package.json
```

**Rationale:**
- **Co-location for unit tests**: `*.test.ts` files stay next to implementation (Bun best practice)
- **Separate features/ for BDD**: Cucumber tests in dedicated folder (Cucumber convention)
- **Screenplay components organized**: Abilities, Tasks, Questions in separate folders for clarity
- **Clear separation**: Unit tests test functions, Cucumber tests test behavior using Screenplay pattern
- **Bun integration**: `tests/cucumber.runner.ts` invokes `runCucumber()` within Bun test
- **Deferred implementation**: Concrete Abilities, Tasks, and Questions will be implemented in future stories alongside the features they test (e.g., ParseSchemas ability with Story 2.1 Scanner)

### Example Feature File Content

**File: `packages/core/features/example.feature`**

```gherkin
Feature: Test Data Generation
  As a QA tester
  I want to validate my DSL schemas
  So that I can ensure they are correct before generating data

  Background:
    Given the testdata-ai core library is initialized

  @validation @happy-path
  Scenario: Valid schema validation succeeds
    Given I have a valid DSL schema with the following content:
      """
      schema User {
        id: uuid;
        name: string;
        email: string;
      }
      """
    When I validate the schema
    Then the validation should succeed
    And the validated schema should contain a "User" schema
    And the "User" schema should have 3 fields

  @validation @error-handling
  Scenario: Invalid schema reports clear errors
    Given I have an invalid DSL schema with the following content:
      """
      schema User {
        id uuid
        name: string;
      }
      """
    When I validate the schema
    Then the validation should fail
    And the error message should mention "expected ':' after field name"
    And the error location should point to line 2

  @generation @deterministic
  Scenario: Same seed produces same data
    Given I have a valid DSL schema for "User"
    And I use seed value 42
    When I generate 3 records
    And I generate 3 records again with the same seed
    Then both generation results should be identical
```

### Screenplay Pattern Implementation Examples

#### Ability: ParseSchemas

**File: `packages/core/features/support/abilities/ParseSchemas.ts`**

```typescript
import { Ability, Actor, AnswersQuestions, UsesAbilities } from '@serenity-js/core';
import { validateSchema, type Result, type ValidatedProgram, type Diagnostic } from '../../../src/index';

export class ParseSchemas implements Ability {
  private lastResult?: Result<ValidatedProgram, Diagnostic[]>;
  private schemaSource?: string;

  static usingCoreLibrary(): ParseSchemas {
    return new ParseSchemas();
  }

  async parseSchema(source: string, filename: string = 'test.td'): Promise<void> {
    this.schemaSource = source;
    this.lastResult = validateSchema(source, filename);
  }

  getLastResult(): Result<ValidatedProgram, Diagnostic[]> | undefined {
    return this.lastResult;
  }

  getSchemaSource(): string | undefined {
    return this.schemaSource;
  }

  static as(actor: Actor & UsesAbilities & AnswersQuestions): ParseSchemas {
    return actor.abilityTo(ParseSchemas);
  }
}
```

#### Task: ValidateSchema

**File: `packages/core/features/support/tasks/ValidateSchema.ts`**

```typescript
import { Task, Actor } from '@serenity-js/core';
import { ParseSchemas } from '../abilities/ParseSchemas';

export class ValidateSchema implements Task {
  static withSource(source: string): ValidateSchema {
    return new ValidateSchema(source);
  }

  constructor(private source: string) {}

  async performAs(actor: Actor): Promise<void> {
    const parseAbility = ParseSchemas.as(actor);
    await parseAbility.parseSchema(this.source);
  }

  toString(): string {
    return `#actor validates a DSL schema`;
  }
}
```

#### Question: ValidationResult

**File: `packages/core/features/support/questions/ValidationResult.ts`**

```typescript
import { Question, Actor } from '@serenity-js/core';
import { ParseSchemas } from '../abilities/ParseSchemas';
import type { Result, ValidatedProgram, Diagnostic } from '../../../src/index';

export class ValidationResult implements Question<Result<ValidatedProgram, Diagnostic[]> | undefined> {
  static value(): ValidationResult {
    return new ValidationResult();
  }

  async answeredBy(actor: Actor): Promise<Result<ValidatedProgram, Diagnostic[]> | undefined> {
    return ParseSchemas.as(actor).getLastResult();
  }

  toString(): string {
    return `the validation result`;
  }
}

export class ValidationSucceeded implements Question<boolean> {
  static check(): ValidationSucceeded {
    return new ValidationSucceeded();
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    const result = await ValidationResult.value().answeredBy(actor);
    return result?.ok === true;
  }

  toString(): string {
    return `validation succeeded`;
  }
}
```

#### Step Definitions Using Screenplay Pattern

**File: `packages/core/features/step_definitions/example.steps.ts`**

```typescript
import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { Actor, Cast, Ensure, equals, property } from '@serenity-js/core';
import { ParseSchemas } from '../support/abilities/ParseSchemas';
import { GenerateData } from '../support/abilities/GenerateData';
import { ValidateSchema } from '../support/tasks/ValidateSchema';
import { GenerateRecords } from '../support/tasks/GenerateRecords';
import { ValidationResult, ValidationSucceeded } from '../support/questions/ValidationResult';
import { GeneratedRecords } from '../support/questions/GeneratedRecords';

// Actor setup (typically in support/serenity.config.ts)
class TestCast implements Cast {
  prepare(actor: Actor): Actor {
    return actor.whoCan(
      ParseSchemas.usingCoreLibrary(),
      GenerateData.usingCoreLibrary()
    );
  }
}

// Step definitions with Screenplay pattern
Given('{actor} has a valid DSL schema with the following content:', async (actor: Actor, docString: string) => {
  await actor.attemptsTo(
    Note.that('schemaSource', docString)
  );
});

When('{actor} validates the schema', async (actor: Actor) => {
  const schemaSource = await actor.recall('schemaSource');
  await actor.attemptsTo(
    ValidateSchema.withSource(schemaSource)
  );
});

Then('{actor} should see that validation succeeded', async (actor: Actor) => {
  await actor.attemptsTo(
    Ensure.that(ValidationSucceeded.check(), equals(true))
  );
});

Then('{actor} should see that validation failed', async (actor: Actor) => {
  await actor.attemptsTo(
    Ensure.that(ValidationSucceeded.check(), equals(false))
  );
});

Then('the validated schema should contain a {string} schema', async (actor: Actor, schemaName: string) => {
  const result = await actor.asks(ValidationResult.value());
  
  await actor.attemptsTo(
    Ensure.that(result, property('ok', equals(true)))
  );
  
  if (result?.ok) {
    const hasSchema = result.value.schemas.some((s: any) => s.name === schemaName);
    await actor.attemptsTo(
      Ensure.that(hasSchema, equals(true))
    );
  }
});

When('{actor} generates {int} records with seed {int}', async (actor: Actor, count: number, seed: number) => {
  const schemaSource = await actor.recall('schemaSource');
  await actor.attemptsTo(
    GenerateRecords.fromSource(schemaSource).withCount(count).withSeed(seed)
  );
});

Then('{actor} should see {int} generated records', async (actor: Actor, expectedCount: number) => {
  const records = await actor.asks(GeneratedRecords.all());
  await actor.attemptsTo(
    Ensure.that(records.length, equals(expectedCount))
  );
});
```

### Integration with Previous Stories Using Screenplay

**Story 1.2 (Result Type Pattern)**: Screenplay Questions and Tasks work seamlessly with Result types:

```typescript
// Question that returns Result type
export class ValidationResult implements Question<Result<ValidatedProgram, Diagnostic[]>> {
  async answeredBy(actor: Actor): Promise<Result<ValidatedProgram, Diagnostic[]>> {
    return ParseSchemas.as(actor).getLastResult();
  }
}

// Using in step definition with Ensure
Then('{actor} should see validation succeeded', async (actor: Actor) => {
  const result = await actor.asks(ValidationResult.value());
  
  await actor.attemptsTo(
    Ensure.that(result, property('ok', equals(true)))
  );
  
  if (result.ok) {
    // TypeScript narrows type, can safely access result.value
    const validatedProgram = result.value;
  }
});
```

**Story 1.3 (Diagnostic System)**: Questions can query diagnostic information:

```typescript
// Question for diagnostic errors
export class DiagnosticErrors implements Question<Diagnostic[]> {
  async answeredBy(actor: Actor): Promise<Diagnostic[]> {
    const result = await ValidationResult.value().answeredBy(actor);
    return result && !result.ok ? result.errors : [];
  }
}

export class FirstErrorMessage implements Question<string> {
  async answeredBy(actor: Actor): Promise<string> {
    const errors = await DiagnosticErrors.answeredBy(actor);
    return errors[0]?.message || '';
  }
}

export class ErrorLineNumber implements Question<number | undefined> {
  async answeredBy(actor: Actor): Promise<number | undefined> {
    const errors = await DiagnosticErrors.answeredBy(actor);
    return errors[0]?.location?.line;
  }
}

// Using in step definitions
Then('{actor} should see an error at line {int}', async (actor: Actor, lineNumber: number) => {
  await actor.attemptsTo(
    Ensure.that(ErrorLineNumber.value(), equals(lineNumber))
  );
});

Then('the error message should mention {string}', async (actor: Actor, expectedText: string) => {
  const errorMessage = await actor.asks(FirstErrorMessage.value());
  await actor.attemptsTo(
    Ensure.that(errorMessage, includes(expectedText))
  );
});
```

### Bun Integration with runCucumber()

**File: `tests/cucumber.runner.ts`**

```typescript
import { test } from 'bun:test';
import { runCucumber } from '@cucumber/cucumber';
import { configure } from '@serenity-js/core';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';
import { ConsoleReporter } from '@serenity-js/console-reporter';

test('Run Cucumber BDD tests with Screenplay pattern', async () => {
  // Configure SerenityJS
  configure({
    crew: [
      ConsoleReporter.forDarkTerminals(),
      new SerenityBDDReporter(),
    ],
  });

  // Run Cucumber with configuration
  const { success } = await runCucumber({
    parallel: 0,
    format: ['progress', 'json:test-results/cucumber-report.json'],
    require: [
      'features/step_definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    import: ['features/**/*.feature'],
    requireModule: ['ts-node/register'], // or configure for Bun's TS support
  });

  if (!success) {
    throw new Error('Cucumber tests failed');
  }
});
```

**Running Tests:**
```bash
# Run all tests (unit + Cucumber)
bun test

# Run only Cucumber tests
bun test cucumber.runner

# Run with Bun's native test runner
bun test --preload ./tests/cucumber.runner.ts
```
  }
});
```

**Story 1.3 (Diagnostic System)**: Step definitions will validate diagnostics:

```typescript
Then('the error location should point to line {int}', function(lineNumber: number) {
  if (context.validationResult.ok) throw new Error('Expected validation to fail');
  const diagnostic = context.validationResult.errors[0];
  expect(diagnostic.location.line).toBe(lineNumber);
});

Then('the error should include a helpful suggestion', function() {
  if (context.validationResult.ok) throw new Error('Expected validation to fail');
  const diagnostic = context.validationResult.errors[0];
  expect(diagnostic.suggestion).toBeDefined();
  expect(diagnostic.suggestion).not.toBe('');
});
```

### Documentation Requirements

**File: `packages/core/features/README.md`**

Must include comprehensive Screenplay pattern documentation:

1. **Overview**: 
   - What BDD testing is and why we use it
   - Introduction to Screenplay pattern and its benefits
   - How Screenplay separates test intent from implementation

2. **Framework Stack**:
   - Cucumber with `runCucumber()` function
   - SerenityJS for Screenplay pattern
   - Bun integration approach
   - Why this stack was chosen

3. **Running Tests**:
   - How to run all tests: `bun test`
   - How to run only Cucumber tests: `bun test cucumber.runner`
   - How to run specific features
   - How to use tags: `@validation`, `@integration`, etc.

4. **Writing Feature Files**:
   - Feature file structure with Background and Scenarios
   - Using `{actor}` parameter in step definitions
   - Tags for organization
   - Example feature file templates
   - Best practices for scenario independence

5. **Screenplay Pattern Architecture**:
   - **Actors**: Represent users/testers (e.g., `QA Tester`, `Developer`)
   - **Abilities**: What actors can do (e.g., `ParseSchemas`, `GenerateData`)
   - **Tasks**: High-level business actions (e.g., `ValidateSchema`, `GenerateRecords`)
   - **Questions**: Query system state (e.g., `ValidationResult`, `ErrorMessages`)
   - **Interactions**: Low-level actions (if needed for this project)

6. **Creating Screenplay Components**:
   - **How to create an Ability**: Template and example
   - **How to create a Task**: Template and example with `performAs()`
   - **How to create a Question**: Template and example with `answeredBy()`
   - **Composing Tasks**: Building complex Tasks from simpler ones
   - **Actor memory**: Using `Note.that()` and `actor.recall()`

7. **Writing Step Definitions with Screenplay**:
   - Using `{actor}` parameter in Given/When/Then
   - `actor.attemptsTo(Task)` for actions
   - `actor.asks(Question)` for queries
   - `Ensure.that()` for assertions with SerenityJS
   - Sharing state through Abilities vs Actor memory
   - TypeScript types for type-safe step definitions

8. **Common Screenplay Patterns**:
   - Testing Result<T, E> types with Questions
   - Testing diagnostics with specialized Questions
   - Testing async generators (AsyncIterable) with Tasks
   - Testing file I/O operations
   - Error scenario testing

9. **Best Practices**:
   - Keep Tasks focused and composable
   - Questions should be reusable across scenarios
   - Use Abilities for system interaction, not business logic
   - One feature per module/component
   - Scenarios should be independent
   - Use descriptive names that explain business value
   - Tag scenarios appropriately

10. **SerenityJS Configuration**:
    - Setting up Cast for Actor creation
    - Configuring reporters (Console, SerenityBDD)
    - Integration with Bun and runCucumber()

11. **Examples**:
    - Complete Ability example
    - Complete Task example
    - Complete Question example
    - Complete step definition example
    - End-to-end scenario example
7. **Common Patterns**:
   - Testing Result<T, E> types
   - Testing diagnostics with locations
   - Testing async generators (AsyncIterable)
   - Testing file I/O operations
   - Testing error scenarios

### Testing Strategy for This Story

Since this is the story that creates the testing infrastructure, you can test the Screenplay components themselves using traditional Bun unit tests:

**File: `packages/core/features/support/abilities/ParseSchemas.test.ts`**
```typescript
import { describe, test, expect } from 'bun:test';
import { Actor } from '@serenity-js/core';
import { ParseSchemas } from './ParseSchemas';

describe('ParseSchemas Ability', () => {
  test('can be granted to an Actor', () => {
    const actor = Actor.named('Test').whoCan(ParseSchemas.usingCoreLibrary());
    const ability = ParseSchemas.as(actor);
    expect(ability).toBeDefined();
  });

  test('stores schema source after parsing', async () => {
    const actor = Actor.named('Test').whoCan(ParseSchemas.usingCoreLibrary());
    const ability = ParseSchemas.as(actor);
    
    await ability.parseSchema('schema User { }');
    
    expect(ability.getSchemaSource()).toBe('schema User { }');
  });
});
```

**Integration Test**: The example.feature must run successfully via `runCucumber()`:
```bash
# Run Cucumber tests through Bun test runner
bun test cucumber.runner.ts

# Should show passing scenarios with Screenplay pattern
# Output should indicate Actor actions and Question answers
```

### Critical Implementation Notes

**1-Indexed Line Numbers**: The diagnostic system uses 1-indexed line and column numbers. Screenplay Questions should handle this correctly:

```gherkin
Then QA Tester should see an error at line 3, column 10
```

```typescript
// Question for line number
export class ErrorLineNumber implements Question<number | undefined> {
  async answeredBy(actor: Actor): Promise<number | undefined> {
    const errors = await DiagnosticErrors.answeredBy(actor);
    return errors[0]?.location?.line;  // Already 1-indexed from diagnostic system
  }
}

// Step definition
Then('{actor} should see an error at line {int}, column {int}',
  async (actor: Actor, line: number, column: number) => {
    await actor.attemptsTo(
      Ensure.that(ErrorLineNumber.value(), equals(line)),
      Ensure.that(ErrorColumnNumber.value(), equals(column))
    );
  }
);
```

**Result Type Pattern**: Screenplay Questions handle Result types elegantly:

```typescript
// Question that works with Result type
export class ValidationResult implements Question<Result<ValidatedProgram, Diagnostic[]>> {
  async answeredBy(actor: Actor): Promise<Result<ValidatedProgram, Diagnostic[]>> {
    return ParseSchemas.as(actor).getLastResult();
  }
}

// Step definition with type-safe Result handling
Then('{actor} should see validation succeeded', async (actor: Actor) => {
  const result = await actor.asks(ValidationResult.value());
  
  await actor.attemptsTo(
    Ensure.that(result, property('ok', equals(true)))
  );
  
  if (result.ok) {
    // TypeScript narrows type, can safely access result.value
    const validatedProgram = result.value;
  }
});
```

**Async Iteration**: Screenplay Tasks handle AsyncIterable gracefully:

```typescript
export class GenerateRecords implements Task {
  async performAs(actor: Actor): Promise<void> {
    const generateAbility = GenerateData.as(actor);
    const schemaSource = await actor.recall('schemaSource');
    
    const records = [];
    for await (const record of generateData(schemaSource, this.options)) {
      records.push(record);
    }
    
    generateAbility.storeRecords(records);
  }
}
```

### Success Criteria

This story is complete when:

1. ✅ Cucumber is installed with SerenityJS Screenplay pattern packages
2. ✅ `runCucumber()` function is integrated with Bun test runner
3. ✅ Example feature file exists with Screenplay-based step definitions
4. ✅ Example Abilities, Tasks, and Questions are implemented
5. ✅ All scenarios in example.feature pass
6. ✅ Documentation comprehensively covers Screenplay pattern
7. ✅ Both unit tests (.test.ts) and Cucumber tests run with `bun test`
8. ✅ SerenityJS reporters provide clear, readable test output
9. ✅ CI pipeline can run all tests successfully
10. ✅ Future stories can easily add new Screenplay components

### Future Story Integration with Screenplay

After this story, **all subsequent stories** should include both:

1. **Unit tests** (`*.test.ts`): Test individual functions and edge cases
2. **Cucumber tests with Screenplay** (`features/*.feature`): Test end-to-end behavior

Example for Story 2.1 (Scanner):

**Unit test** (`scanner.test.ts`): Test token generation edge cases
```typescript
import { describe, test, expect } from 'bun:test';
import { scan } from './scanner';

test('handles unterminated string', () => {
  const result = scan('"hello');
  expect(result.ok).toBe(false);
  expect(result.errors[0].code).toBe('scanner.unterminatedString');
});
```

**Cucumber test with Screenplay** (`features/scanner.feature`):
```gherkin
Feature: DSL Scanner
  As a QA tester
  I want the scanner to detect lexical errors
  So that I get helpful error messages

  Scenario: Scanner detects unterminated string
    Given QA Tester has DSL source code with an unterminated string:
      """
      schema User {
        name: "John
      }
      """
    When QA Tester scans the source code
    Then QA Tester should see a scanner error
    And the error code should be "scanner.unterminatedString"
    And the error should suggest adding a closing quote
```

**Screenplay components** (`features/support/`):

```typescript
// Ability: ScanSourceCode
export class ScanSourceCode implements Ability {
  private lastResult?: Result<Token[], Diagnostic[]>;
  
  async scanSource(source: string): Promise<void> {
    this.lastResult = scan(source);
  }
  
  getLastResult(): Result<Token[], Diagnostic[]> | undefined {
    return this.lastResult;
  }
}

// Task: ScanDSLSource
export class ScanDSLSource implements Task {
  static withSource(source: string): ScanDSLSource {
    return new ScanDSLSource(source);
  }
  
  async performAs(actor: Actor): Promise<void> {
    await ScanSourceCode.as(actor).scanSource(this.source);
  }
}

// Question: ScanResult
export class ScanResult implements Question<Result<Token[], Diagnostic[]>> {
  async answeredBy(actor: Actor): Promise<Result<Token[], Diagnostic[]>> {
    return ScanSourceCode.as(actor).getLastResult();
  }
}

// Step definition
When('{actor} scans the source code', async (actor: Actor) => {
  const source = await actor.recall('sourceCode');
  await actor.attemptsTo(
    ScanDSLSource.withSource(source)
  );
});

Then('{actor} should see a scanner error', async (actor: Actor) => {
  const result = await actor.asks(ScanResult.value());
  await actor.attemptsTo(
    Ensure.that(result, property('ok', equals(false)))
  );
});
```

### Reference Materials

**Cucumber Documentation**: 
- Cucumber.js: https://github.com/cucumber/cucumber-js
- runCucumber API: https://github.com/cucumber/cucumber-js/blob/main/docs/cli.md

**SerenityJS Documentation**:
- Screenplay Pattern: https://serenity-js.org/handbook/design/screenplay-pattern/
- Cucumber Integration: https://serenity-js.org/api/cucumber/
- Core Concepts: https://serenity-js.org/handbook/
- Actors and Abilities: https://serenity-js.org/handbook/design/abilities/
- Tasks: https://serenity-js.org/handbook/design/tasks/
- Questions: https://serenity-js.org/handbook/design/questions/

**Bun Test Documentation**: 
- Bun Test Runner: https://bun.sh/docs/cli/test
- Bun TypeScript Support: https://bun.sh/docs/runtime/typescript

**Gherkin Syntax Reference**: 
- Gherkin Language: https://cucumber.io/docs/gherkin/reference/

### Screenplay Pattern Architecture Summary

The Screenplay pattern implemented with SerenityJS provides these key advantages:

**Component Separation:**
- **Feature Files**: Business-readable test specifications (What to test)
- **Step Definitions**: Thin translation layer using Actor language
- **Tasks**: High-level business actions (How to achieve goals)
- **Questions**: Query system state (What is the result?)
- **Abilities**: System interaction capabilities (What can actors do?)

**Benefits for This Project:**

1. **Maintainability**: Changes to implementation (e.g., how schemas are parsed) only require updating Tasks/Questions, not step definitions
2. **Reusability**: Tasks like `ValidateSchema` can be used across multiple features
3. **Readability**: Step definitions read naturally: `actor.attemptsTo(ValidateSchema.withSource(...))`
4. **Testability**: Screenplay components (Abilities, Tasks, Questions) can be unit tested independently
5. **Composability**: Complex Tasks can be built from simpler Tasks
6. **Type Safety**: Full TypeScript support throughout the pattern
7. **Traceability**: Feature files map directly to acceptance criteria in epics

### Project Context Reference

See [project-context.md](../project-context.md) for:
- Testing rules and conventions
- Bun test runner requirements
- Co-located test patterns

See [architecture.md](../architecture.md) for:
- Multi-pass compilation pipeline
- Testing strategy overview
- Result type pattern

See [epics.md](../epics.md) for:
- All story acceptance criteria in Given/When/Then format
- Examples of behavior-driven requirements

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Debug Log References

_To be filled by Dev agent_

### Completion Notes List

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
