/**
 * Step definitions for Generate Data from DSL Source (Public API) feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isGreaterThan, not, isTrue } from '@serenity-js/assertions';
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
  RecordCountWithFields,
  FieldHasType,
  RecordsAreIdentical,
  RecordsAreDifferent,
  ErrorWasThrown,
  ErrorHasProperty,
  ErrorMessageContains,
  GenerationDuration,
  PeakHeapUsed,
  NoGenerationStarted,
} from '../support/questions/GenerateDataPublicAPIQuestions';

// Note: Background "Given the actor {word}" is defined in primitive-generators.steps.ts
// and shared across all feature files

function qaTester(): ReturnType<typeof actorCalled> {
  return actorCalled('QATester');
}

// DSL Source setup
Given(
  '{word} has public API DSL source code:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has invalid public API DSL source code:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has public API DSL source code with syntax error:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has public API DSL source code with semantic error:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has public API DSL source code with multiple schemas:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given('{word} has empty public API DSL source code', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(''));
});

// Generate actions
When(
  '{word} generates {int} public API records using generateData',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} generates {int} public API records with seed {int} using generateData',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed),
    );
  },
);

When(
  '{word} generates another {int} public API records with the same seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed).storeAsSecondSequence(),
    );
  },
);

When(
  '{word} generates another {int} public API records with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed).storeAsSecondSequence(),
    );
  },
);

When(
  '{word} generates {int} public API records per schema using generateData',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} generates public API records using generateData',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(1));
  },
);

When(
  '{word} attempts to generate {int} public API records using generateData',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(AttemptGenerateRecordsUsingPublicAPI.withCount(count));
  },
);

When(
  '{word} attempts to generate public API records using generateData',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(AttemptGenerateRecordsUsingPublicAPI.withCount(1));
  },
);

When('{word} generates {int} public API records with seed {int}', async (actorName: string, count: number, seed: number) => {
  await actorCalled(actorName).attemptsTo(
    GenerateRecordsUsingPublicAPIWithSeed.withCount(count).andSeed(seed),
  );
});

// Assertions
Then('exactly {int} public API records should be generated', async (count: number) => {
  await qaTester().attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('each public API record should have field {string}', async (fieldName: string) => {
  await qaTester().attemptsTo(Ensure.that(RecordsHaveField(fieldName), isTrue()));
});

Then(
  'public API field {string} should be of type {word}',
  async (fieldName: string, expectedType: string) => {
    await qaTester().attemptsTo(Ensure.that(FieldHasType(fieldName), equals(expectedType)));
  },
);

Then('both public API record sequences should be identical', async () => {
  await qaTester().attemptsTo(Ensure.that(RecordsAreIdentical(), isTrue()));
});

Then('the two public API record sequences should be different', async () => {
  await qaTester().attemptsTo(Ensure.that(RecordsAreDifferent(), isTrue()));
});

Then('a public API ValidationError should be thrown', async () => {
  await qaTester().attemptsTo(Ensure.that(ErrorWasThrown(), isTrue()));
});

Then('the public API error should include diagnostic information', async () => {
  await qaTester().attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
});

Then('the public API error message should mention {string}', async (text: string) => {
  await qaTester().attemptsTo(Ensure.that(ErrorMessageContains(text), isTrue()));
});

Then(
  'the public API error should include diagnostic information about syntax',
  async () => {
    await qaTester().attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
  },
);

Then(
  'the public API error should include diagnostic information about semantic errors',
  async () => {
    await qaTester().attemptsTo(Ensure.that(ErrorHasProperty('diagnostics'), isTrue()));
  },
);

Then('all {int} public API records should be generated successfully', async (count: number) => {
  await qaTester().attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('public API generation should complete in under {int} seconds', async (seconds: number) => {
  const duration = await qaTester().answer(GenerationDuration());
  await qaTester().attemptsTo(Ensure.that(duration, not(isGreaterThan(seconds * 1000))));
});

Then('public API memory usage should remain reasonable', async () => {
  await qaTester().attemptsTo(
    Ensure.that(PeakHeapUsed(), not(isGreaterThan(500 * 1024 * 1024))),
  );
});

Then('the public API process should not run out of memory', async () => {
  await qaTester().attemptsTo(Ensure.that(ErrorWasThrown(), not(isTrue())));
});

Then('exactly {int} public API records should be generated total', async (count: number) => {
  await qaTester().attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(count)));
});

Then('{int} public API records should have field {string}', async (count: number, fieldName: string) => {
  await qaTester().attemptsTo(Ensure.that(RecordCountWithFields(fieldName), equals(count)));
});

Then(
  '{int} public API records should have fields {string} and {string}',
  async (count: number, field1: string, field2: string) => {
    await qaTester().attemptsTo(Ensure.that(RecordCountWithFields(field1, field2), equals(count)));
  },
);

Then('no public API records should be generated', async () => {
  await qaTester().attemptsTo(Ensure.that(GeneratedRecordsCount(), equals(0)));
});

Then('a public API ValidationError should be thrown immediately', async () => {
  await qaTester().attemptsTo(Ensure.that(ErrorWasThrown(), isTrue()));
});

Then('no public API generation should have started', async () => {
  await qaTester().attemptsTo(Ensure.that(NoGenerationStarted(), isTrue()));
});

Then('each public API record should have exactly {int} fields', async (count: number) => {
  const records = await qaTester().answer(GeneratedRecords());
  for (const record of records) {
    await qaTester().attemptsTo(Ensure.that(Object.keys(record).length, equals(count)));
  }
});

Then(
  'each public API record should have field {string} of type {word}',
  async (fieldName: string, expectedType: string) => {
    const records = await qaTester().answer(GeneratedRecords());
    for (const record of records) {
      await qaTester().attemptsTo(Ensure.that(typeof record[fieldName], equals(expectedType)));
    }
  },
);
