# BDD Testing with Screenplay Pattern

This directory contains Cucumber/BDD tests using the Screenplay pattern with SerenityJS.

## Table of Contents

1. [Overview](#overview)
2. [Framework Stack](#framework-stack)
3. [Running Tests](#running-tests)
4. [Directory Structure](#directory-structure)
5. [Screenplay Pattern Architecture](#screenplay-pattern-architecture)
6. [Writing Feature Files](#writing-feature-files)
7. [Creating Screenplay Components](#creating-screenplay-components)
8. [Writing Step Definitions](#writing-step-definitions)
9. [Common Patterns](#common-patterns)
10. [Best Practices](#best-practices)

## Overview

This project uses a **dual testing approach**:

- **Unit Tests** (`*.test.ts`): Fast, focused tests for individual functions and edge cases
- **BDD Tests** (`.feature` files): Behavior-driven tests using Cucumber with SerenityJS Screenplay pattern

### Why BDD/Gherkin with Screenplay?

1. **Alignment with Acceptance Criteria**: All stories have acceptance criteria written in Given/When/Then format
2. **QA-Friendly Documentation**: Tests written in natural language serve as both tests and usage documentation
3. **Behavior-Driven Development**: Tests focus on behavior from the user's perspective
4. **Living Documentation**: Feature files document what the system does and how it should behave
5. **Screenplay Pattern Benefits**: Maintainable, reusable testing architecture with clear separation of concerns

## Framework Stack

- **Cucumber** (`@cucumber/cucumber`) - Standard Gherkin feature files with `runCucumber()` integration
- **SerenityJS** - Screenplay pattern implementation (Actors, Abilities, Tasks, Questions)
  - `@serenity-js/core` - Core Screenplay pattern
  - `@serenity-js/cucumber` - Cucumber integration
  - `@serenity-js/assertions` - Fluent assertions (Ensure, equals, etc.)
  - `@serenity-js/serenity-bdd` - Test reporting
- **Bun Test Runner** - Native test runner for integration

## Running Tests

```bash
# Run all tests (unit + BDD)
bun test

# Run only Cucumber/BDD tests
bun test tests/cucumber.runner.ts

# Run specific feature
bun test tests/cucumber.runner.ts -- features/example.feature

# Run tests with specific tags
bun test tests/cucumber.runner.ts -- --tags "@happy-path"
```

## Directory Structure

```
features/
├── example.feature                     # Example feature file
├── step_definitions/
│   └── example.steps.ts               # Step definitions using Screenplay
└── support/
    ├── hooks.ts                        # Cucumber hooks and SerenityJS config
    ├── abilities/                      # Screenplay Abilities
    │   ├── .gitkeep
    │   └── PerformCalculations.ts      # Example Ability
    ├── tasks/                          # Screenplay Tasks
    │   ├── .gitkeep
    │   └── CalculationTasks.ts         # Example Tasks
    ├── questions/                      # Screenplay Questions
    │   ├── .gitkeep
    │   └── CalculationQuestions.ts     # Example Questions
    └── screenplay/
        └── Actors.ts                   # Actor configuration (Cast)
```

## Screenplay Pattern Architecture

The Screenplay pattern separates **what** you're testing from **how** you test it.

### Core Components

#### Actors

**Actors** represent users or testers interacting with the system.

```typescript
// Actors are created automatically in step definitions
Given('QA Tester has a valid schema', (actorName: string) => {
  const actor = actorCalled(actorName); // Creates or retrieves actor
  // ...
});
```

#### Abilities

**Abilities** represent what an Actor can do. They encapsulate system interaction logic.

```typescript
// Example: PerformCalculations Ability
export class PerformCalculations extends Ability {
  static using(): PerformCalculations {
    return new PerformCalculations();
  }

  add(): void {
    // Implementation
  }

  getResult(): number {
    return this._result;
  }
}

// Grant abilities to Actors (in Actors.ts)
prepare(actor: Actor): Actor {
  return actor.whoCan(
    PerformCalculations.using(),
  );
}
```

**Real examples** (for future stories):

- `ParseSchemas.usingCoreLibrary()` - Parse DSL schemas
- `GenerateData.usingCoreLibrary()` - Generate test data
- `ValidateSchemas.usingCoreLibrary()` - Validate schema correctness

#### Tasks

**Tasks** represent high-level business actions. They use Abilities to perform work.

```typescript
// Example: SetNumbers Task
export const SetNumbers = {
  to: (first: number, second: number) =>
    Interaction.where(`#actor sets numbers to ${first} and ${second}`, (actor: UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      calculations.setNumbers(first, second);
    }),
};

// Usage in step definition
When(
  '{word} sets numbers to {int} and {int}',
  async (actorName: string, first: number, second: number) => {
    await actorCalled(actorName).attemptsTo(SetNumbers.to(first, second));
  },
);
```

**Real examples** (for future stories):

- `ValidateSchema.withSource(source)` - Validate a schema
- `GenerateRecords.fromSchema(schema).withCount(100)` - Generate 100 records
- `SaveContext.toFile(filename)` - Save context to file

#### Questions

**Questions** allow Actors to query system state and retrieve information.

```typescript
// Example: CalculationResult Question
export const CalculationResult = {
  value: () =>
    Question.about<number>('the calculation result', (actor: AnswersQuestions & UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      return calculations.getResult();
    }),
};

// Usage in step definition with Ensure
Then('{word} should see the result is {int}', async (actorName: string, expected: number) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(CalculationResult.value(), equals(expected)));
});
```

**Real examples** (for future stories):

- `ValidationResult.value()` → `Result<ValidatedProgram, Diagnostic[]>`
- `GeneratedRecords.count()` → `number`
- `ErrorMessage.text()` → `string`
- `ErrorLocation.line()` → `number`

### Information Flow

```
Feature File (Gherkin)
    ↓
Step Definitions (thin translation layer)
    ↓
Actor.attemptsTo(Task) ← High-level business action
    ↓
Task uses Ability ← System interaction
    ↓
Ability interacts with system ← Implementation
```

```
Feature File (Gherkin)
    ↓
Step Definitions (assertions)
    ↓
Actor.attemptsTo(Ensure.that(Question, matcher))
    ↓
Question uses Ability ← Query system
    ↓
Ability retrieves information ← State access
```

## Writing Feature Files

Feature files are written in Gherkin syntax and stored in the `features/` directory.

### Basic Structure

```gherkin
Feature: Feature name
  As a [role]
  I want [feature]
  So that [benefit]

  Background:
    Given [common setup for all scenarios]

  @tag1 @tag2
  Scenario: Scenario name
    Given [initial context]
    When [action occurs]
    Then [outcome is observed]
    And [additional outcome]
```

### Example

```gherkin
Feature: DSL Schema Validation
  As a QA tester
  I want to validate DSL schemas
  So that I can ensure they are correct before generating data

  Background:
    Given the testdata-ai core library is initialized

  @validation @happy-path
  Scenario: Valid schema passes validation
    Given QA Tester has a valid DSL schema:
      """
      schema User {
        id: uuid;
        name: string;
      }
      """
    When QA Tester validates the schema
    Then QA Tester should see validation succeeded
    And the validated schema should contain a "User" schema

  @validation @error-handling
  Scenario: Invalid schema reports clear errors
    Given QA Tester has an invalid DSL schema:
      """
      schema User {
        id uuid
      }
      """
    When QA Tester validates the schema
    Then QA Tester should see validation failed
    And the error message should mention "expected ':' after field name"
```

### Tags

Tags help organize and filter scenarios:

- `@validation` - Validation-related scenarios
- `@generation` - Data generation scenarios
- `@error-handling` - Error cases
- `@happy-path` - Success cases
- `@example` - Example/demo scenarios

## Creating Screenplay Components

### Creating an Ability

**File:** `features/support/abilities/ParseSchemas.ts`

```typescript
import { Ability, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import {
  validateSchema,
  type Result,
  type ValidatedProgram,
  type Diagnostic,
} from '../../../src/index';

export class ParseSchemas extends Ability {
  private _lastResult?: Result<ValidatedProgram, Diagnostic[]>;
  private _schemaSource?: string;

  static usingCoreLibrary(): ParseSchemas {
    return new ParseSchemas();
  }

  async parseSchema(source: string, filename: string = 'test.td'): Promise<void> {
    this._schemaSource = source;
    this._lastResult = validateSchema(source, filename);
  }

  getLastResult(): Result<ValidatedProgram, Diagnostic[]> | undefined {
    return this._lastResult;
  }

  getSchemaSource(): string | undefined {
    return this._schemaSource;
  }
}
```

**Grant the Ability in `Actors.ts`:**

```typescript
prepare(actor: Actor): Actor {
  return actor.whoCan(
    ParseSchemas.usingCoreLibrary(),
    PerformCalculations.using(),
  );
}
```

### Creating a Task

**File:** `features/support/tasks/ValidationTasks.ts`

```typescript
import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ParseSchemas } from '../abilities/ParseSchemas';

export const ValidateSchema = {
  withSource: (source: string) =>
    Interaction.where(`#actor validates a DSL schema`, async (actor: UsesAbilities) => {
      const parseAbility = ParseSchemas.as(actor);
      await parseAbility.parseSchema(source);
    }),
};
```

### Creating a Question

**File:** `features/support/questions/ValidationQuestions.ts`

```typescript
import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { ParseSchemas } from '../abilities/ParseSchemas';
import type { Result, ValidatedProgram, Diagnostic } from '../../../src/index';

export const ValidationResult = {
  value: () =>
    Question.about<Result<ValidatedProgram, Diagnostic[]> | undefined>(
      'the validation result',
      (actor: AnswersQuestions & UsesAbilities) => {
        const parseAbility = ParseSchemas.as(actor);
        return parseAbility.getLastResult();
      },
    ),
};

export const ValidationSucceeded = {
  check: () =>
    Question.about<boolean>('validation succeeded', (actor: AnswersQuestions & UsesAbilities) => {
      const parseAbility = ParseSchemas.as(actor);
      const result = parseAbility.getLastResult();
      return result?.ok === true;
    }),
};
```

## Writing Step Definitions

Step definitions are the glue between Gherkin and Screenplay components.

### Basic Pattern

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { ValidateSchema } from '../support/tasks/ValidationTasks';
import { ValidationResult } from '../support/questions/ValidationQuestions';

// Given - Set up context
Given('{word} has a valid DSL schema:', async (actorName: string, schemaSource: string) => {
  // Store schema for later use
  await actorCalled(actorName).attemptsTo(Note.that('schemaSource', schemaSource));
});

// When - Perform action
When('{word} validates the schema', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const schemaSource = await actor.recall('schemaSource');

  await actor.attemptsTo(ValidateSchema.withSource(schemaSource));
});

// Then - Assert outcome
Then('{word} should see validation succeeded', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(ValidationResult.value(), property('ok', equals(true))),
  );
});
```

### Actor Naming

Use `{word}` in step patterns to capture actor names:

```gherkin
Given QA Tester has a valid schema
When QA Tester validates the schema
Then QA Tester should see validation succeeded
```

```typescript
Given('{word} has a valid schema', async (actorName: string) => {
  const actor = actorCalled(actorName); // Creates 'QA Tester' actor
  // ...
});
```

### Storing and Recalling Information

Use `Note` to store information for later use:

```typescript
import { Note } from '@serenity-js/core';

// Store
await actor.attemptsTo(Note.that('schemaSource', 'schema User { ... }'));

// Recall
const schemaSource = await actor.recall('schemaSource');
```

## Common Patterns

### Testing AsyncIterable (Async Generators)

The generator will produce data using `async function*` (AsyncIterable). Here's how to test this pattern:

**Task for async iteration:**

```typescript
export class GenerateRecordsViaStreaming implements Task {
  static withCount(count: number): GenerateRecordsViaStreaming {
    return new GenerateRecordsViaStreaming(count);
  }

  constructor(private count: number) {}

  async performAs(actor: Actor): Promise<void> {
    const generateAbility = GenerateData.as(actor);
    const schemaSource = await actor.recall('schemaSource');

    // Collect all records from async generator
    const records = [];
    for await (const record of generateData(schemaSource, { count: this.count })) {
      records.push(record);
    }

    generateAbility.storeRecords(records);
  }

  toString(): string {
    return `#actor generates ${this.count} records via streaming`;
  }
}
```

### Testing Result<T, E> Types

The project uses `Result<T, E>` for all operations that can fail. See [result-pattern.feature](result-pattern.feature) and [result-pattern.steps.ts](step_definitions/result-pattern.steps.ts) for a complete working example.

**Ability returning Result:**

```typescript
export class ParseSchemas extends Ability {
  private _lastResult?: Result<ValidatedProgram, Diagnostic[]>;

  async parseSchema(source: string): Promise<void> {
    this._lastResult = validateSchema(source, 'test.td');
  }

  getLastResult(): Result<ValidatedProgram, Diagnostic[]> | undefined {
    return this._lastResult;
  }
}
```

**Question for Result value:**

```typescript
export const ValidationResult = {
  succeeded: () =>
    Question.about<boolean>('validation succeeded', (actor: AnswersQuestions & UsesAbilities) => {
      const result = ParseSchemas.as(actor).getLastResult();
      return result?.ok === true;
    }),
};
```

**Type-safe access with discriminator:**

```typescript
Then('{string} can process the result', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const result = await ValidationResult.value().answeredBy(actor);

  if (result?.ok) {
    // TypeScript knows result.value is ValidatedProgram here
    const program = result.value;
  } else if (result) {
    // TypeScript knows result.errors is Diagnostic[] here
    const errors = result.errors;
  }
});
```

### Testing Diagnostic Errors

When operations fail, they return `Diagnostic[]` with location information:

```typescript
export const DiagnosticErrors = {
  firstMessage: () =>
    Question.about<string>('the first error message', (actor: AnswersQuestions & UsesAbilities) => {
      const result = ParseSchemas.as(actor).getLastResult();
      if (result && !result.ok && result.errors.length > 0) {
        return result.errors[0].message;
      }
      return '';
    }),

  lineNumber: () =>
    Question.about<number | undefined>(
      'the error line number',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = ParseSchemas.as(actor).getLastResult();
        if (result && !result.ok && result.errors.length > 0) {
          return result.errors[0].location?.line;
        }
        return undefined;
      },
    ),
};
```

### Testing Result<T, E> Types

```typescript
// Question for Result type
export const ValidationResult = {
  value: () =>
    Question.about<Result<ValidatedProgram, Diagnostic[]>>(
      'the validation result',
      (actor: AnswersQuestions & UsesAbilities) => {
        return ParseSchemas.as(actor).getLastResult();
      },
    ),
};

// Assert success
await actor.attemptsTo(Ensure.that(ValidationResult.value(), property('ok', equals(true))));

// Assert failure
await actor.attemptsTo(Ensure.that(ValidationResult.value(), property('ok', equals(false))));

// Access value when ok
Then('{word} should see a valid schema', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const result = await ValidationResult.value().answeredBy(actor);

  await actor.attemptsTo(Ensure.that(result, property('ok', equals(true))));

  if (result.ok) {
    // TypeScript narrows type, can safely access result.value
    const program = result.value;
    // ...
  }
});
```

### Testing Diagnostics

```typescript
// Questions for diagnostic information
export const DiagnosticErrors = {
  list: () =>
    Question.about<Diagnostic[]>('diagnostic errors', (actor: AnswersQuestions & UsesAbilities) => {
      const result = ParseSchemas.as(actor).getLastResult();
      return result && !result.ok ? result.errors : [];
    }),
};

export const FirstErrorMessage = {
  text: () =>
    Question.about<string>(
      'first error message',
      async (actor: AnswersQuestions & UsesAbilities) => {
        const errors = await DiagnosticErrors.list().answeredBy(actor);
        return errors[0]?.message || '';
      },
    ),
};

// Usage
Then(
  'the error message should mention {string}',
  async (actorName: string, expectedText: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.that(FirstErrorMessage.text(), contains(expectedText)),
    );
  },
);
```

### Testing Async Generators

```typescript
// Task that consumes AsyncIterable
export const GenerateRecords = {
  fromSource: (source: string, count: number) =>
    Interaction.where(`#actor generates ${count} records`, async (actor: UsesAbilities) => {
      const generateAbility = GenerateData.as(actor);
      const records = [];

      for await (const record of generateData(source)) {
        records.push(record);
        if (records.length >= count) break;
      }

      generateAbility.storeRecords(records);
    }),
};
```

## Best Practices

### Feature Files

1. **One feature per module/component** - Keep features focused
2. **Scenarios should be independent** - Each scenario should run standalone
3. **Use descriptive names** - Explain business value, not implementation
4. **Tag appropriately** - Use tags for organization and filtering
5. **Use Background for common setup** - Avoid repetition
6. **Keep scenarios focused** - Test one behavior per scenario

### Screenplay Components

1. **Abilities encapsulate system interaction** - Not business logic
2. **Tasks are high-level and composable** - Build complex from simple
3. **Questions are reusable** - Share across scenarios
4. **Use meaningful names** - Explain intent, not implementation
5. **Keep Tasks focused** - Single responsibility

### SerenityJS Configuration

#### Setting Up Actors and Reporters

The Cast and reporters are configured in [support/hooks.ts](support/hooks.ts):

```typescript
import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, Duration } from '@serenity-js/core';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';
import { ConsoleReporter } from '@serenity-js/console-reporter';
import { TestCast } from './screenplay/Actors';

// Configure Cucumber timeout
setDefaultTimeout(Duration.ofSeconds(10).inMilliseconds());

Before({ tags: 'not @ignore' }, function () {
  configure({
    actors: new TestCast(), // Actor factory with Abilities
    crew: [
      ConsoleReporter.forDarkTerminals(), // Terminal output
      SerenityBDDReporter.fromJSON({
        // HTML reports
        specDirectory: './features',
      }),
    ],
  });
});
```

#### Available Reporters

- **ConsoleReporter**: Real-time terminal output during test execution
  - `.forDarkTerminals()` - For dark terminal themes
  - `.forLightTerminals()` - For light terminal themes
- **SerenityBDDReporter**: Generates HTML reports with screenshots and details
  - Outputs to `target/site/serenity/` by default
  - View with: `open target/site/serenity/index.html`

#### Configuring Timeouts

```typescript
import { Duration } from '@serenity-js/core';

// Set default timeout for all steps
setDefaultTimeout(Duration.ofSeconds(30).inMilliseconds());

// Or configure per-scenario
Before({ tags: '@slow' }, function () {
  this.setTimeout(Duration.ofMinutes(2).inMilliseconds());
});
```

#### Configuring Retries

In cucumber.runner.test.ts:

```typescript
const options: IRunOptions = {
  runtime: {
    retry: 1, // Retry failed scenarios once
    retryTagFilter: '@flaky', // Only retry scenarios tagged @flaky
    failFast: false, // Continue after first failure
  },
  // ...
};
```

#### Environment-Specific Configuration

```typescript
Before(function () {
  const env = process.env.TEST_ENV || 'local';

  configure({
    actors: new TestCast(),
    crew:
      env === 'ci'
        ? [SerenityBDDReporter.fromJSON({})] // CI: Only HTML reports
        : [ConsoleReporter.forDarkTerminals(), SerenityBDDReporter.fromJSON({})], // Local: Both
  });
});
```

### Step Definitions

1. **Use {string} for multi-word actor names** - Supports "QA Tester", "Developer", etc.
2. **Use {int} for numbers** - Automatic conversion from string
3. **Keep step definitions thin** - Delegate to Tasks and Questions
4. **Use Ensure.that() for assertions** - Provides clear error messages
5. **Handle async properly** - Use async/await consistently
6. **Questions should be pure** - No side effects

### Step Definitions

1. **Keep step definitions thin** - Delegate to Tasks/Questions
2. **Use descriptive parameter names** - Self-documenting
3. **Reuse step definitions** - Same wording across features
4. **Use SerenityJS assertions** - `Ensure.that()` with matchers
5. **Handle async properly** - Use async/await consistently

### Integration with Result Type

1. **Questions return Result types** - Preserve error information
2. **Check `.ok` before accessing `.value`** - Type-safe access
3. **Use Ensure with property matcher** - `Ensure.that(result, property('ok', equals(true)))`
4. **Create specialized Questions** - `ValidationSucceeded.check()` for common checks

## SerenityJS Assertions

SerenityJS provides fluent assertions via `Ensure`:

```typescript
import { Ensure, equals, contains, property, isGreaterThan } from '@serenity-js/assertions';

// Basic equality
await actor.attemptsTo(Ensure.that(CalculationResult.value(), equals(5)));

// Property check
await actor.attemptsTo(Ensure.that(ValidationResult.value(), property('ok', equals(true))));

// String contains
await actor.attemptsTo(Ensure.that(ErrorMessage.text(), contains('expected')));

// Number comparison
await actor.attemptsTo(Ensure.that(RecordCount.value(), isGreaterThan(0)));
```

## Examples

### Complete Example: Schema Validation

**Feature file:**

```gherkin
@validation
Scenario: Valid schema validation
  Given QA Tester has a DSL schema:
    """
    schema User {
      id: uuid;
      name: string;
    }
    """
  When QA Tester validates the schema
  Then QA Tester should see validation succeeded
  And the schema should contain a "User" type
```

**Step definitions:**

```typescript
Given('{word} has a DSL schema:', async (actorName: string, schemaSource: string) => {
  await actorCalled(actorName).attemptsTo(Note.that('schemaSource', schemaSource));
});

When('{word} validates the schema', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const source = await actor.recall('schemaSource');

  await actor.attemptsTo(ValidateSchema.withSource(source));
});

Then('{word} should see validation succeeded', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(ValidationResult.value(), property('ok', equals(true))),
  );
});

Then('the schema should contain a {string} type', async (actorName: string, typeName: string) => {
  const actor = actorCalled(actorName);
  const result = await ValidationResult.value().answeredBy(actor);

  await actor.attemptsTo(Ensure.that(result, property('ok', equals(true))));

  if (result.ok) {
    const hasType = result.value.schemas.some((s: any) => s.name === typeName);
    await actor.attemptsTo(Ensure.that(hasType, equals(true)));
  }
});
```

## Further Reading

- **Cucumber Documentation**: https://cucumber.io/docs/guides/
- **SerenityJS Documentation**: https://serenity-js.org/handbook/
- **Screenplay Pattern**: https://serenity-js.org/handbook/design/screenplay-pattern/
- **Bun Test Runner**: https://bun.sh/docs/cli/test
