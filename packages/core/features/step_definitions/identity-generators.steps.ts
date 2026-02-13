/**
 * Step definitions for Identity Field Generators feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import { uuid, nanoid } from '../../src/generator/generators';
import {
  GenerateUUIDs,
  GenerateSequentialIDs,
  CreateSequentialGenerator,
  GenerateFromSequentialGenerator,
  GenerateNanoIDs,
  TryCreateSequentialWithInvalidStart,
  TryGenerateNanoIDWithInvalidLength,
} from '../support/tasks/GeneratorTasks';
import {
  GeneratedSequence,
  ErrorMessage,
} from '../support/questions/GeneratorQuestions';

// UUID Generation
When(
  '{word} generates {int} UUIDs with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateUUIDs.count(count, seed, 'uuidSeq1'),
    );
  },
);

When(
  '{word} generates {int} UUIDs with seed {int} again',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateUUIDs.count(count, seed, 'uuidSeq2'),
    );
  },
);

Then('both UUID sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('uuidSeq1', 'uuidSeq2'),
      equals(true),
    ),
  );
});

Then('all UUIDs should match RFC4122 v4 format', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allMatchUUIDFormat('uuidSeq1'), isTrue()),
  );
});

Then('all UUIDs should have correct length of {int} characters', async (length: number) => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allHaveLength('uuidSeq1', length), isTrue()),
  );
});

Then('the two UUID sequences should be different', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areDifferent('uuidSeq1', 'uuidSeq2'),
      equals(true),
    ),
  );
});

// Sequential ID Generation
When(
  '{word} generates {int} sequential IDs starting from {int}',
  async (actorName: string, count: number, startValue: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateSequentialIDs.count(count, startValue, 'seqIDs'),
    );
  },
);

Then(
  'the sequential IDs should be {int}, {int}, {int}, {int}, {int} in order',
  async (v1: number, v2: number, v3: number, v4: number, v5: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.matchesExpectedValues('seqIDs', [v1, v2, v3, v4, v5]),
        equals(true),
      ),
    );
  },
);

Then(
  'the sequential IDs should be {int}, {int}, {int} in order',
  async (v1: number, v2: number, v3: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.matchesExpectedValues('seqIDs', [v1, v2, v3]),
        equals(true),
      ),
    );
  },
);

// Independent Sequential Generators
When(
  '{word} creates sequential generator {word} starting from {int}',
  async (actorName: string, generatorName: string, startValue: number) => {
    await actorCalled(actorName).attemptsTo(
      CreateSequentialGenerator.withStart(generatorName, startValue),
    );
  },
);

When(
  '{word} generates {int} ID from generator {word}',
  async (actorName: string, count: number, generatorName: string) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFromSequentialGenerator.count(generatorName, count, generatorName),
    );
  },
);

When(
  '{word} generates {int} ID from generator {word} again',
  async (actorName: string, count: number, generatorName: string) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFromSequentialGenerator.count(generatorName, count, generatorName),
    );
  },
);

Then(
  'generator {word} should have produced {int}, {int}',
  async (generatorName: string, v1: number, v2: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.matchesExpectedValues(generatorName, [v1, v2]),
        equals(true),
      ),
    );
  },
);

Then(
  'generator {word} should have produced {int}',
  async (generatorName: string, v1: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(
        GeneratedSequence.matchesExpectedValues(generatorName, [v1]),
        equals(true),
      ),
    );
  },
);

// NanoID Generation
When(
  '{word} generates {int} NanoIDs of length {int} with seed {int}',
  async (actorName: string, count: number, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateNanoIDs.ofLength(length, count, seed, 'nanoSeq1'),
    );
  },
);

When(
  '{word} generates {int} NanoIDs of length {int} with seed {int} again',
  async (actorName: string, count: number, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateNanoIDs.ofLength(length, count, seed, 'nanoSeq2'),
    );
  },
);

Then('both NanoID sequences should be identical', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('nanoSeq1', 'nanoSeq2'),
      equals(true),
    ),
  );
});

Then('all NanoIDs should have length {int}', async (length: number) => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allHaveLength('nanoSeq1', length), isTrue()),
  );
});

Then('all NanoIDs should use only URL-safe characters', async () => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allMatchURLSafeCharacters('nanoSeq1'), isTrue()),
  );
});

// Validation
When(
  '{word} tries to create sequential generator with non-integer start {float}',
  async (actorName: string, startValue: number) => {
    await actorCalled(actorName).attemptsTo(
      TryCreateSequentialWithInvalidStart.withStart(startValue),
    );
  },
);

When(
  '{word} tries to generate NanoID with length {int} and seed {int}',
  async (actorName: string, length: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      TryGenerateNanoIDWithInvalidLength.withLength(length, seed),
    );
  },
);

Then('an error should be thrown with message {string}', async (expectedMessage: string) => {
  const errorMessage = await actorCalled('Tester').answer(ErrorMessage.last());

  if (!errorMessage.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to contain "${expectedMessage}", but got "${errorMessage}"`,
    );
  }
});

// Integration scenarios (simplified - full DSL integration would be in separate stories)
Given(
  '{word} has a schema with UUID field {string}',
  (actorName: string, fieldName: string) => {
    // Simplified - store field info for validation
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('fieldInfo', [{ name: fieldName, type: 'uuid' }]);
  },
);

Given(
  '{word} has a schema with NanoID field {string} of length {int}',
  (actorName: string, fieldName: string, length: number) => {
    // Simplified - store field info for validation
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('fieldInfo', [{ name: fieldName, type: 'nanoid', length }]);
  },
);

When(
  '{word} generates {int} records with seed {int}',
  (actorName: string, count: number, seed: number) => {
    // Simplified - generate UUIDs or NanoIDs based on field type
    const generators = UseGenerators.as(actorCalled(actorName));
    const fieldInfo = generators.getSequence('fieldInfo')[0] as {
      name: string;
      type: string;
      length?: number;
    };

    const rng = generators.createRNG(seed);

    if (fieldInfo.type === 'uuid') {
      const values: string[] = [];
      for (let i = 0; i < count; i++) {
        values.push(uuid(rng));
      }
      generators.storeSequence('records', values);
    } else if (fieldInfo.type === 'nanoid') {
      const values: string[] = [];
      for (let i = 0; i < count; i++) {
        values.push(nanoid(rng, fieldInfo.length ?? 21));
      }
      generators.storeSequence('records', values);
    }
  },
);

Then(
  'all records should have unique UUID values in {string} field',
  async (_fieldName: string) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(GeneratedSequence.allValuesAreUnique('records'), equals(true)),
    );
  },
);

Then(
  'all {string} values should match RFC4122 v4 format',
  async (_fieldName: string) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(GeneratedSequence.allMatchUUIDFormat('records'), isTrue()),
    );
  },
);

Then(
  'all records should have {string} values of length {int}',
  async (fieldName: string, length: number) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(GeneratedSequence.allHaveLength('records', length), isTrue()),
    );
  },
);

Then('all {string} values should be unique', async (_fieldName: string) => {
  await actorCalled('Tester').attemptsTo(
    Ensure.that(GeneratedSequence.allValuesAreUnique('records'), equals(true)),
  );
});

Then(
  'all {string} values should use only URL-safe characters',
  async (_fieldName: string) => {
    await actorCalled('Tester').attemptsTo(
      Ensure.that(GeneratedSequence.allMatchURLSafeCharacters('records'), isTrue()),
    );
  },
);
