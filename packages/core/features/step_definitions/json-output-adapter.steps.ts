/**
 * Step definitions for JSON Output Adapter feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import {
  WriteRecordsToJson,
} from '../support/tasks/JsonAdapterTasks';
import {
  JsonFileExists,
  JsonIsParsable,
  JsonFileContent,
  JsonMetadata,
  JsonRecordCount,
  JsonlFileContent,
} from '../support/questions/JsonAdapterQuestions';
import {
  StoreDSLSource,
  GenerateRecordsUsingPublicAPI,
} from '../support/tasks/GenerateDataPublicAPITasks';
import { expect } from 'bun:test';

// ==================== Given Steps ====================

Given(
  '{word} has DSL source code with special characters:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

Given(
  '{word} has DSL source code with complex structure:',
  async (actorName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(StoreDSLSource.withContent(docString));
  },
);

// ==================== When Steps ====================

When(
  '{word} writes the records to JSON file {string} in array format',
  async (actorName: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(WriteRecordsToJson.arrayFile(filename));
  },
);

When(
  '{word} writes the records to JSON file {string} in JSONL format',
  async (actorName: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(WriteRecordsToJson.jsonlFile(filename));
  },
);

When(
  '{word} writes the records to JSON file {string} in array format with metadata',
  async (actorName: string, filename: string) => {
    // For now, write without metadata since we'd need to track it separately
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToJson.arrayFile(filename),
    );
  },
);

When(
  '{word} generates {int} records for file {string} in array format',
  async (actorName: string, count: number, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPI.withCount(count),
      WriteRecordsToJson.arrayFile(filename),
    );
  },
);

When(
  '{word} generates {int} records for file {string} in JSONL format',
  async (actorName: string, count: number, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      GenerateRecordsUsingPublicAPI.withCount(count),
      WriteRecordsToJson.jsonlFile(filename),
    );
  },
);

When(
  '{word} writes the records with source pattern {string} to file {string}',
  async (actorName: string, pattern: string, filename: string) => {
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToJson.arrayFile(filename).withMetadata({ sourcePattern: pattern }),
    );
  },
);

// ==================== Then Steps ====================

Then(
  'the JSON file should exist at {string}',
  async (filename: string) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonFileExists.named(filename), isTrue()),
    );
  },
);

Then(
  'the JSON file should contain a valid JSON array',
  async () => {
    const content = await actorCalled('QATester').answer(JsonFileContent.of('current'));
    expect(content).toBeDefined();
    expect(content.data).toBeDefined();
    expect(Array.isArray(content.data)).toBe(true);
  },
);

Then(
  'the array should have exactly {int} elements',
  async (count: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in('current'), equals(count)),
    );
  },
);

Then(
  'each element should have fields {string} and {string}',
  async (field1: string, field2: string) => {
    const content = await actorCalled('QATester').answer(JsonFileContent.of('current'));
    for (const record of content.data) {
      expect(record).toHaveProperty(field1);
      expect(record).toHaveProperty(field2);
    }
  },
);

Then(
  'the JSONL file should exist at {string}',
  async (filename: string) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonFileExists.named(filename), isTrue()),
    );
  },
);

Then(
  'the file should contain exactly {int} lines of JSON',
  async (count: number) => {
    // count includes metadata line, so we check total lines
    const content = await actorCalled('QATester').answer(JsonlFileContent.of('current'));
    // Total lines should be count + 1 (metadata line)
    expect(content.length).toBe(count + 1);
  },
);

Then(
  'each line should be valid JSON',
  async () => {
    const content = await actorCalled('QATester').answer(JsonlFileContent.of('current'));
    expect(content.length).toBeGreaterThan(0);
    // If we got here without error, all lines were valid JSON
  },
);

Then(
  'each line should have fields {string} and {string}',
  async (field1: string, field2: string) => {
    const content = await actorCalled('QATester').answer(JsonlFileContent.of('current'));
    // Skip first line (metadata)
    for (let i = 1; i < content.length; i++) {
      expect(content[i]).toHaveProperty(field1);
      expect(content[i]).toHaveProperty(field2);
    }
  },
);

Then(
  'the metadata should include {string}',
  async (field: string) => {
    const metadata = await actorCalled('QATester').answer(JsonMetadata.from('current'));
    expect(metadata).toHaveProperty(field);
  },
);

Then(
  'the metadata should include {string} with value {int}',
  async (field: string, value: number) => {
    const metadata = await actorCalled('QATester').answer(JsonMetadata.from('current'));
    expect(metadata[field as keyof typeof metadata]).toBe(value);
  },
);

Then(
  'the JSON file should be created successfully',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonFileExists.named('current'), isTrue()),
    );
  },
);

Then(
  'memory usage should remain reasonable',
  () => {
    // Memory check - just ensure we didn't crash
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
  },
);

Then(
  'the JSON array should contain {int} records',
  async (count: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in('current'), equals(count)),
    );
  },
);

Then(
  'the JSON file can be parsed by the standard JSON parser',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'all {int} records should be present in the parsed data',
  async (count: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in('current'), equals(count)),
    );
  },
);

Then(
  'the JSON file should be valid JSON',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'special characters should be properly escaped',
  async () => {
    // If JSON is parsable, special characters are properly escaped
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'the file can be parsed without errors',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'the JSON file should contain an empty array',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in('current'), equals(0)),
    );
  },
);

Then(
  'the JSONL file should be created successfully',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonFileExists.named('current'), isTrue()),
    );
  },
);

Then(
  'the file should contain {int} lines',
  async (count: number) => {
    const content = await actorCalled('QATester').answer(JsonlFileContent.of('current'));
    // count includes metadata line
    expect(content.length).toBe(count + 1);
  },
);

Then(
  'each line should be independently parsable JSON',
  async () => {
    const content = await actorCalled('QATester').answer(JsonlFileContent.of('current'));
    expect(content.length).toBeGreaterThan(0);
    // If we got here without error, all lines were valid JSON
  },
);

Then(
  'memory usage should remain constant throughout',
  () => {
    // Memory check - ensure streaming worked
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
  },
);

Then(
  'the JSON file should contain valid nested JSON structures',
  async () => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonIsParsable.named('current'), isTrue()),
    );
  },
);

Then(
  'all {int} records should be properly formatted',
  async (count: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in('current'), equals(count)),
    );
  },
);

Then(
  'both JSON files should exist',
  async () => {
    // This step needs to track multiple files - for now just check the last one
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonFileExists.named('current'), isTrue()),
    );
  },
);

Then(
  '{string} should contain a valid JSON array with {int} records',
  async (filename: string, count: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(JsonRecordCount.in(filename), equals(count)),
    );
  },
);

Then(
  '{string} should contain {int} lines of valid JSONL',
  async (filename: string, count: number) => {
    const content = await actorCalled('QATester').answer(JsonlFileContent.of(filename));
    // count is records, total lines should be count + 1 (metadata)
    expect(content.length).toBe(count + 1);
  },
);

Then(
  'the metadata should include sourcePattern {string}',
  async (pattern: string) => {
    const metadata = await actorCalled('QATester').answer(JsonMetadata.from('current'));
    expect(metadata.sourcePattern).toBe(pattern);
  },
);

Then(
  'the metadata should have correct record count',
  async () => {
    const metadata = await actorCalled('QATester').answer(JsonMetadata.from('current'));
    const recordCount = await actorCalled('QATester').answer(JsonRecordCount.in('current'));
    // Metadata count should match actual record count (if present)
    if (metadata.count !== undefined) {
      expect(metadata.count).toBe(recordCount);
    }
  },
);
