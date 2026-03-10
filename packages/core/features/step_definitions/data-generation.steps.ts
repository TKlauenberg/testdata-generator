/**
 * Step definitions for Record Generation from Validated Schema feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import {
  CreateSchema,
  CreateSchemaWithField,
  CreateRNG,
  GenerateRecord,
  GenerateMultipleRecords,
  TryGenerateRecord,
  CreateProgramWithSchema,
  GenerateRecordsStreaming,
  GenerateRecordsStreamingWithSeed,
  StartStreamingGeneration,
  StopStreamingAfter,
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
import {
  WriteRecordsToJson,
  ConfigureGeneration,
} from '../support/tasks/JsonAdapterTasks';
import {
  JsonFileExists,
  JsonIsParsable,
  JsonMetadata,
  JsonlLinesValid,
  JsonDataMatchesGenerated,
} from '../support/questions/JsonAdapterQuestions';
import { expect } from 'bun:test';

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

// ==================== Streaming Generation Steps ====================

// Program creation with schemas
Given(
  '{word} has a validated program with schema {string}',
  async (actorName: string, schemaName: string) => {
    await actorCalled(actorName).attemptsTo(
      CreateProgramWithSchema.named(schemaName),
    );
  },
);

Given(
  '{word} has a validated program with {int} schemas',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(
      CreateProgramWithSchema.withMultipleSchemas(count),
    );
  },
);

Given(
  'the {string} schema has fields:',
  async (schemaName: string, dataTable: { rawTable: string[][] }) => {
    await actorCalled('QA Tester').attemptsTo(
      CreateProgramWithSchema.named(schemaName).withFieldsFromTable(dataTable.rawTable),
    );
  },
);

Given(
  'schema {string} has fields:',
  async (schemaName: string, dataTable: { rawTable: string[][] }) => {
    await actorCalled('QA Tester').attemptsTo(
      CreateProgramWithSchema.named(schemaName).withFieldsFromTable(dataTable.rawTable),
    );
  },
);

// Streaming generation
When(
  '{word} generates {int} records using streaming',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsStreaming.withCount(count),
    );
  },
);

When(
  '{word} generates {int} records with seed {int} using streaming',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsStreamingWithSeed.withCount(count).andSeed(seed),
    );
  },
);

When(
  '{word} generates another {int} records with the same seed {int} using streaming',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsStreamingWithSeed.withCount(count).andSeed(seed).asSecondSequence(),
    );
  },
);

When(
  '{word} starts generating {int} records using streaming',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(
      StartStreamingGeneration.withCount(count),
    );
  },
);

When(
  '{word} stops after {int} records',
  async (actorName: string, limit: number) => {
    await actorCalled(actorName).attemptsTo(
      StopStreamingAfter.recordCount(limit),
    );
  },
);

// Streaming assertions
Then(
  'exactly {int} records should be yielded',
  async (count: number) => {
    const RecordCount = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordCount.fromStream(), equals(count)),
    );
  },
);

Then(
  '{int} records should be yielded total',
  async (count: number) => {
    const RecordCount = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordCount.fromStream(), equals(count)),
    );
  },
);

Then(
  '{int} records should have field {string}',
  async (count: number, fieldName: string) => {
    const RecordsWithField = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordsWithField);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordsWithField.named(fieldName), equals(count)),
    );
  },
);

Then(
  '{int} records should have fields {string} and {string}',
  async (count: number, field1: string, field2: string) => {
    const RecordsWithFields = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordsWithFields);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordsWithFields.named([field1, field2]), equals(count)),
    );
  },
);

Then(
  'each record should have field {string}',
  async (fieldName: string) => {
    const AllRecordsHaveField = await import('../support/questions/RecordGenerationQuestions').then(m => m.AllRecordsHaveField);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(AllRecordsHaveField.named(fieldName), isTrue()),
    );
  },
);

Then(
  'generation should complete successfully',
  async () => {
    const StreamingSuccessful = await import('../support/questions/RecordGenerationQuestions').then(m => m.StreamingSuccessful);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(StreamingSuccessful.check(), isTrue()),
    );
  },
);

Then(
  'the process should not run out of memory',
  async () => {
    const MemoryUsageAcceptable = await import('../support/questions/RecordGenerationQuestions').then(m => m.MemoryUsageAcceptable);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(MemoryUsageAcceptable.check(), isTrue()),
    );
  },
);

Then(
  'both record sequences should be identical',
  async () => {
    const StreamSequencesIdentical = await import('../support/questions/RecordGenerationQuestions').then(m => m.StreamSequencesIdentical);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(StreamSequencesIdentical.check(), isTrue()),
    );
  },
);

Then(
  'only {int} records should have been generated',
  async (count: number) => {
    const RecordCount = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordCount.fromStream(), equals(count)),
    );
  },
);

Then(
  'no records should be yielded',
  async () => {
    const RecordCount = await import('../support/questions/RecordGenerationQuestions').then(m => m.RecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(RecordCount.fromStream(), equals(0)),
    );
  },
);

// ==================== JSON Adapter Steps ====================

// JSON adapter configuration
Given(
  '{word} has a validated schema for {word} records',
  async (actorName: string, recordType: string) => {
    await actorCalled(actorName).attemptsTo(
      CreateSchema.forRecordType(recordType),
    );
  },
);

Given(
  '{word} wants to generate {int} records',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(
      ConfigureGeneration.withRecordCount(count),
    );
  },
);

Given(
  '{word} specifies source pattern {string}',
  async (actorName: string, pattern: string) => {
    await actorCalled(actorName).attemptsTo(
      ConfigureGeneration.withSourcePattern(pattern),
    );
  },
);

Given(
  '{word} specifies record count {int}',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(
      ConfigureGeneration.withRecordCount(count),
    );
  },
);

Given(
  '{word} specifies seed {int}',
  async (actorName: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      ConfigureGeneration.withSeed(seed),
    );
  },
);

// JSON generation actions
When(
  '{word} generates data to JSON file {string} in array format',
  async (actorName: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToJson.arrayFile(filename),
    );
  },
);

When(
  '{word} generates data to JSON file {string} in JSONL format',
  async (actorName: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToJson.jsonlFile(filename),
    );
  },
);

// JSON file assertions
Then(
  '{word} should see JSON file {string} created',
  async (actorName: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.that(JsonFileExists.named(filename), isTrue()),
    );
  },
);

Then(
  'the JSON file should contain metadata',
  async () => {
    const JsonMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata).toBeDefined();
    expect(metadata.timestamp).toBeDefined();
    expect(metadata.version).toBeDefined();
  },
);

Then(
  'the JSON file should contain {int} user records',
  async (count: number) => {
    const JsonRecordCount = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonRecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonRecordCount.from('current'), equals(count)),
    );
  },
);

Then(
  'the JSON should be parsable by standard JSON parser',
  async () => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'the JSONL file should have metadata as first line',
  async () => {
    const JsonlHasMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonlHasMetadata.check(), isTrue()),
    );
  },
);

Then(
  'the JSONL file should contain {int} product records as separate lines',
  async (count: number) => {
    const JsonlRecordCount = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonlRecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonlRecordCount.from('current'), equals(count)),
    );
  },
);

Then(
  'each line should be valid JSON',
  async () => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonlLinesValid.check(), isTrue()),
    );
  },
);

Then(
  'the JSON metadata should include timestamp',
  async () => {
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata.timestamp).toBeDefined();
    expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  },
);

Then(
  'the JSON metadata should include sourcePattern {string}',
  async (pattern: string) => {
    const JsonMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata.sourcePattern).toBe(pattern);
  },
);

Then(
  'the JSON metadata should include count {int}',
  async (count: number) => {
    const JsonMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata.count).toBe(count);
  },
);

Then(
  'the JSON metadata should include seed {int}',
  async (seed: number) => {
    const JsonMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata.seed).toBe(seed);
  },
);

Then(
  'the JSON metadata should include version',
  async () => {
    const JsonMetadata = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonMetadata);
    const metadata = await actorCalled('QA Tester').answer(JsonMetadata.from('current'));
    expect(metadata.version).toBeDefined();
    expect(typeof metadata.version).toBe('string');
  },
);

Then(
  'the JSON file should contain {int} records',
  async (count: number) => {
    const JsonRecordCount = await import('../support/questions/JsonAdapterQuestions').then(m => m.JsonRecordCount);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonRecordCount.from('current'), equals(count)),
    );
  },
);

Then(
  'the process should complete without memory errors',
  async () => {
    const MemoryUsageAcceptable = await import('../support/questions/RecordGenerationQuestions').then(m => m.MemoryUsageAcceptable);
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(MemoryUsageAcceptable.check(), isTrue()),
    );
  },
);

Then(
  'the JSON file should be valid JSON',
  async () => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'parsing the JSON file should succeed',
  async () => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'the parsed data should match the generated records',
  async () => {

    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(JsonDataMatchesGenerated.check(), isTrue()),
    );
  },
);
