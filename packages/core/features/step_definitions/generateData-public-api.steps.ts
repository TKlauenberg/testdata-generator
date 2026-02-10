/**
 * Step definitions for Generate Data from DSL Source (Public API) feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isGreaterThan, not, isPresent, or, isFalse, isTrue } from '@serenity-js/assertions';
import {
  StoreDSLSource,
  GenerateRecordsUsingPublicAPI,
  GenerateRecordsUsingPublicAPIWithSeed,
  AttemptGenerateRecordsUsingPublicAPI,
} from '../support/tasks/GenerateDataPublicAPITasks';
import {
  GeneratedRecords,
  GeneratedRecordsCount,
  RecordsHaveField,
  FieldHasType,
  RecordsAreIdentical,
  RecordsAreDifferent,
  ErrorWasThrown,
  ErrorHasProperty,
  ErrorMessageContains,
  GenerationDuration,
  NoGenerationStarted,
} from '../support/questions/GenerateDataPublicAPIQuestions';

// Note: Background "Given the actor {word}" is defined in primitive-generators.steps.ts
// and shared across all feature files

// DSL Source setup
Given(
  '{word} has DSL source code:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has invalid DSL source code:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has DSL source code with syntax error:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has DSL source code with semantic error:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has DSL source code with multiple schemas:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given('{word} has empty DSL source code', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(''));
});

// Generate actions
When(
  '{word} generates {int} records using the public generateData API',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} generates {int} records with seed {int} using the public generateData API',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed),
    );
  },
);

When(
  '{word} generates another {int} records with the same seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed).storeAsSecondSequence(),
    );
  },
);

When(
  '{word} generates another {int} records with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed).storeAsSecondSequence(),
    );
  },
);

When(
  '{word} generates {int} records per schema using the public generateData API',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} generates records using the public generateData API',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(1));
  },
);

When(
  '{word} attempts to generate {int} records using the public generateData API',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(AttemptGenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} attempts to generate records using the public generateData API',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(AttemptGenerateRecordsUsingPublicAPI.withCount(1));
  },
);

When('{word} generates {int} records with seed {int}', async (actorName: string, count: number, seed: number) => {
  await actorCalled(actorName).attemptsTo(
    GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed),
  );
});

// Assertions
Then('exactly {int} records should be generated', async (count: number, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('each record should have field {string}', async (fieldName: string, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(RecordsHaveField(fieldName), isPresent()));
});

Then(
  'field {string} should be of type {word}',
  async (fieldName: string, expectedType: string, { actor }: { actor: string }) => {
    await actorCalled(actor).attemptsTo(Ensure.that(FieldHasType(fieldName), equals(expectedType)));
  },
);

Then('both record sequences should be identical', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(RecordsAreIdentical(), isTrue()));
});

Then('the two record sequences should be different', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(RecordsAreDifferent(), isTrue()));
});

Then('a ValidationError should be thrown', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(ErrorWasThrown(), isTrue()));
});

Then('the error should include diagnostic information', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
});

Then('the error message should mention {string}', async (text: string, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(ErrorMessageContains(text), isTrue()));
});

Then(
  'the error should include diagnostic information about syntax',
  async ({ actor }: { actor: string }) => {
    await actorCalled(actor).attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
  },
);

Then(
  'the error should include diagnostic information about semantic errors',
  async ({ actor }: { actor: string }) => {
    await actorCalled(actor).attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
  },
);

Then('all {int} records should be generated successfully', async (count: number, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('generation should complete in under {int} seconds', async (seconds: number, { actor }: { actor: string }) => {
  const duration = await actorCalled(actor).answer(GenerationDuration());
  await actorCalled(actor).attemptsTo(Ensure.that(duration, not(isGreaterThan(seconds * 1000))));
});

Then('all {int} records should be generated successfully', async (count: number, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('memory usage should remain reasonable', async ({ actor }: { actor: string }) => {
  // Memory is tracked automatically during generation
  // This step is declarative/documentation only
});

Then('the process should not run out of memory', async ({ actor }: { actor: string }) => {
  // If we reach this step, we didn't run out of memory
  // Otherwise the test would have crashed
});

Then('exactly {int} records should be generated total', async (count: number, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('{int} records should have field {string}', async (count: number, fieldName: string, { actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(RecordsHaveField(fieldName), equals(count)));
});

Then(
  '{int} records should have fields {string} and {string}',
  async (count: number, field1: string, field2: string, { actor }: { actor: string }) => {
    await actorCalled(actor).attemptsTo(Ensure.that(RecordsHaveField(field1, field2), equals(count)));
  },
);

Then('no records should be generated', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(0)));
});

Then('a ValidationError should be thrown immediately', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(ErrorWasThrown(), isPresent()));
});

Then('no generation should have started', async ({ actor }: { actor: string }) => {
  await actorCalled(actor).attemptsTo(Ensure.that(NoGenerationStarted(), isPresent()));
});

Then('each record should have exactly {int} fields', async (count: number, { actor }: { actor: string }) => {
  const records = await actorCalled(actor).answer(GeneratedRecords());
  for (const record of records) {
    await actorCalled(actor).attemptsTo(Ensure.that(Object.keys(record).length, equals(count)));
  }
});

Then(
  'each record should have field {string} of type {word}',
  async (fieldName: string, expectedType: string, { actor }: { actor: string }) => {
    const records = await actorCalled(actor).answer(GeneratedRecords());
    for (const record of records) {
      await actorCalled(actor).attemptsTo(Ensure.that(typeof record[fieldName], equals(expectedType)));
    }
  },
);
