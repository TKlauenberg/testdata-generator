/**
 * Step definitions for Record Generation from Validated Schema feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseRecordGeneration } from '../support/abilities/UseRecordGeneration';
import {
  CreateSchema,
  CreateSchemaWithField,
  CreateRNG,
  GenerateRecord,
  GenerateMultipleRecords,
  TryGenerateRecord,
} from '../support/tasks/RecordGenerationTasks';
import {
  RecordHasField,
  FieldValueInRange,
  RecordsAreIdentical,
  AllFieldsPresent,
  FieldHasType,
  RecordIsEmpty,
  AllValuesInRange,
  AllHaveLength,
  ErrorWasThrown,
} from '../support/questions/RecordGenerationQuestions';

// Note: Background "Given the actor {word}" is defined in primitive-generators.steps.ts
// and shared across all feature files

// Schema creation - table version
Given(
  '{word} has a validated schema with fields:',
  async (actorName: string, dataTable: { rawTable: string[][] }) => {
    await actorCalled(actorName).attemptsTo(CreateSchema.fromTable(dataTable.rawTable));
  },
);

// Schema creation - single field version
Given(
  '{word} has a validated schema with field {string} of type {string} with min {int} and max {int}',
  async (actorName: string, fieldName: string, type: string, min: number, max: number) => {
    await actorCalled(actorName).attemptsTo(
      CreateSchemaWithField.named(fieldName).ofType(type).withMin(min).withMax(max),
    );
  },
);

// Schema creation - single field with length
Given(
  '{word} has a validated schema with field {string} of type {string} with length {int}',
  async (actorName: string, fieldName: string, type: string, length: number) => {
    await actorCalled(actorName).attemptsTo(
      CreateSchemaWithField.named(fieldName).ofType(type).withLength(length),
    );
  },
);

// Schema creation - single field no params
Given(
  '{word} has a validated schema with field {string} of type {string}',
  async (actorName: string, fieldName: string, type: string) => {
    await actorCalled(actorName).attemptsTo(
      CreateSchemaWithField.named(fieldName).ofType(type).build(),
    );
  },
);

// Empty schema
Given(
  '{word} has a validated schema with no fields',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(CreateSchema.empty());
  },
);

// RNG creation
Given(
  '{word} has a seeded RNG with seed {int}',
  async (actorName: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(CreateRNG.withSeed(seed));
  },
);

When(
  '{word} creates a new RNG with the same seed {int}',
  async (actorName: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(CreateRNG.withSeed(seed, 'rng2'));
  },
);

// Record generation
When(
  '{word} generates a record from the schema',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(GenerateRecord.fromCurrentSchema());
  },
);

When(
  '{word} generates another record from the same schema',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(GenerateRecord.fromCurrentSchema('record2', 'rng2'));
  },
);

When(
  '{word} generates {int} records from the schema',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(GenerateMultipleRecords.count(count));
  },
);

When(
  '{word} attempts to generate a record from the schema',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(TryGenerateRecord.fromCurrentSchema());
  },
);

// Field presence assertions
Then(
  'the record should have field {string} of type {word}',
  async (fieldName: string, type: string) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(RecordHasField.named(fieldName), isTrue()),
      Ensure.that(FieldHasType.named(fieldName).ofType(type), isTrue()),
    );
  },
);

Then(
  'field {string} should be of type {word}',
  async (fieldName: string, type: string) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(FieldHasType.named(fieldName).ofType(type), isTrue()),
    );
  },
);

// Range assertions
Then(
  'the {string} value should be between {int} and {int} inclusive',
  async (fieldName: string, min: number, max: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(FieldValueInRange.named(fieldName).between(min, max), isTrue()),
    );
  },
);

Then(
  'the {string} value should be between {float} and {float}',
  async (fieldName: string, min: number, max: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(FieldValueInRange.named(fieldName).between(min, max), isTrue()),
    );
  },
);

Then(
  'all {string} values should be between {int} and {int} inclusive',
  async (fieldName: string, min: number, max: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(AllValuesInRange.forField(fieldName).between(min, max), isTrue()),
    );
  },
);

Then(
  'at least one {string} value should be {int}',
  async (fieldName: string, value: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(AllValuesInRange.forField(fieldName).includesValue(value), isTrue()),
    );
  },
);

// String length assertions
Then(
  'all {string} values should have length {int}',
  async (fieldName: string, length: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(AllHaveLength.forField(fieldName).ofLength(length), isTrue()),
    );
  },
);

Then(
  'the {string} value should have length {int}',
  async (fieldName: string, length: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(AllHaveLength.forField(fieldName).ofLength(length), isTrue()),
    );
  },
);

// Record comparison
Then('both records should be identical', async () => {
  await actorCalled('Developer').attemptsTo(
    Ensure.that(RecordsAreIdentical.named('record1', 'record2'), equals(true)),
  );
});

// All fields present
Then('all fields should be present in the record', async () => {
  await actorCalled('Developer').attemptsTo(
    Ensure.that(AllFieldsPresent.inCurrentRecord(), isTrue()),
  );
});

// Empty record
Then(
  'the record should be an empty object with {int} fields',
  async (count: number) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(RecordIsEmpty.check(), equals(count === 0)),
    );
  },
);

// Error assertions
Then('a clear error should be thrown', async () => {
  await actorCalled('Developer').attemptsTo(
    Ensure.that(ErrorWasThrown.check(), isTrue()),
  );
});

Then(
  'the error message should mention {string}',
  async (text: string) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(ErrorWasThrown.withMessageContaining(text), isTrue()),
    );
  },
);

Then(
  'the error message should mention field name {string}',
  async (fieldName: string) => {
    await actorCalled('Developer').attemptsTo(
      Ensure.that(ErrorWasThrown.withMessageContaining(fieldName), isTrue()),
    );
  },
);
