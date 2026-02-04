/**
 * Step definitions for Primitive Field Generators feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import {
  GenerateIntegers,
  GenerateFloats,
  GenerateBooleans,
  GenerateStrings,
  GenerateStringsWithCharset,
  TryGenerateIntegerWithInvalidRange,
  TryGenerateStringWithNegativeLength,
  TryGenerateStringWithEmptyCharset,
} from '../support/tasks/GeneratorTasks';
import {
  GeneratedSequence,
  ErrorMessage,
} from '../support/questions/GeneratorQuestions';

// Background
Given('the actor {word}', (actorName: string) => {
  actorCalled(actorName).whoCan(UseGenerators.withDefaultCapabilities());
});

// Integer generation
When(
  '{word} generates {int} random integers between {int} and {int} with seed {int}',
  async (actorName: string, count: number, min: number, max: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateIntegers.between(min, max, count, seed, 'sequence1'),
    );
  },
);

When(
  '{word} generates {int} random integers between {int} and {int} with seed {int} again',
  async (actorName: string, count: number, min: number, max: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateIntegers.between(min, max, count, seed, 'sequence2'),
    );
  },
);

Then('both integer sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('sequence1', 'sequence2'),
      equals(true),
    ),
  );
});

Then(
  'all integer values should be between {int} and {int} inclusive',
  async (min: number, max: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allIntegersInRange('sequence1', min, max),
        isTrue(),
      ),
    );
  },
);

Then('all integer values should be integers', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allAreIntegers('sequence1'), isTrue()),
  );
});

// Float generation
When(
  '{word} generates {int} random floats between {float} and {float} with seed {int}',
  async (actorName: string, count: number, min: number, max: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFloats.between(min, max, count, seed, 'floatSeq1'),
    );
  },
);

When(
  '{word} generates {int} random floats between {float} and {float} with seed {int} again',
  async (actorName: string, count: number, min: number, max: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFloats.between(min, max, count, seed, 'floatSeq2'),
    );
  },
);

Then('both float sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('floatSeq1', 'floatSeq2'),
      equals(true),
    ),
  );
});

Then(
  'all float values should be between {float} and {float}',
  async (min: number, max: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allFloatsInRange('floatSeq1', min, max),
        isTrue(),
      ),
    );
  },
);

Then('all float values should be floats', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allAreNumbers('floatSeq1'), isTrue()),
  );
});

// Boolean generation
When(
  '{word} generates {int} random booleans with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateBooleans.count(count, seed, 'boolSeq1'),
    );
  },
);

When(
  '{word} generates {int} random booleans with seed {int} again',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateBooleans.count(count, seed, 'boolSeq2'),
    );
  },
);

Then('both boolean sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('boolSeq1', 'boolSeq2'),
      equals(true),
    ),
  );
});

Then('the boolean sequence should contain both true and false values', async () => {
  const sequence = await actorCalled('Tester').answer(
    GeneratedSequence.values('boolSeq1'),
  );
  const hasTrue = sequence.some((v: boolean) => v === true);
  const hasFalse = sequence.some((v: boolean) => v === false);

  if (!hasTrue || !hasFalse) {
    throw new Error('Sequence does not contain both true and false values');
  }
});

Then('the boolean distribution should be approximately balanced', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.hasBalancedBooleans('boolSeq1'), isTrue()),
  );
});

// String generation
When(
  '{word} generates {int} random strings of length {int} with seed {int}',
  async (actorName: string, count: number, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateStrings.ofLength(length, count, seed, 'stringSeq1'),
    );
  },
);

When(
  '{word} generates {int} random strings of length {int} with seed {int} again',
  async (actorName: string, count: number, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateStrings.ofLength(length, count, seed, 'stringSeq2'),
    );
  },
);

Then('both string sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('stringSeq1', 'stringSeq2'),
      equals(true),
    ),
  );
});

Then('all strings should have length {int}', async (expectedLength: number) => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.allStringsHaveLength('stringSeq1', expectedLength),
      isTrue(),
    ),
  );
});

Then('all strings should contain only alphanumeric characters', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.allStringsMatchCharset('stringSeq1', 'alphanumeric'),
      isTrue(),
    ),
  );
});

// Custom charset
Given('{word} wants to generate strings with only letters', (actorName: string) => {
  // This is a Given step for context, no action needed
});

When(
  '{word} generates {int} random strings of length {int} using alphabetic charset with seed {int}',
  async (actorName: string, count: number, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateStringsWithCharset.ofLength(
        length,
        'alpha',
        count,
        seed,
        'alphaSeq',
      ),
    );
  },
);

Then('all strings should contain only alphabetic characters', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.allStringsMatchCharset('alphaSeq', 'alpha'),
      isTrue(),
    ),
  );
});

Then('no strings should contain numeric characters', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.noStringsMatchCharset('alphaSeq', 'numeric'),
      isTrue(),
    ),
  );
});

// Parameter validation
When(
  '{word} tries to generate an integer with min {int} greater than max {int}',
  async (actorName: string, min: number, max: number) => {
    await actorCalled(actorName).attemptsTo(
      TryGenerateIntegerWithInvalidRange.withMinMax(min, max),
    );
  },
);

When(
  '{word} tries to generate a string with negative length {int}',
  async (actorName: string, length: number) => {
    await actorCalled(actorName).attemptsTo(
      TryGenerateStringWithNegativeLength.ofLength(length),
    );
  },
);

When('{word} tries to generate a string with empty charset', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(TryGenerateStringWithEmptyCharset.attempt());
});

Then(
  'an error should be thrown with message {string}',
  async (expectedMessage: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const errorMsg: string = await actorCalled('Tester').answer(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ErrorMessage.last(),
    );
    if (!errorMsg?.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}" but got "${errorMsg}"`,
      );
    }
  },
);
