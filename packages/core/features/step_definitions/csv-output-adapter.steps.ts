import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, not } from '@serenity-js/assertions';
import { expect } from 'bun:test';
import { WriteRecordsToCsv, StorePreparedCsvRecords, LoadGeneratedCsvOutput } from '../support/tasks/CsvAdapterTasks';
import {
  GeneratedCsvOutput,
  LoadedGeneratedCsvFieldValue,
  LoadedGeneratedCsvMetadataFormat,
  LoadedGeneratedCsvPatternHash,
  LoadedGeneratedCsvRecordCount,
  LoadedGeneratedCsvSourcePattern,
} from '../support/questions/CsvAdapterQuestions';

Given('{actor} has CSV-ready generated records:', async (actorName: string, table: DataTable) => {
  await actorCalled(actorName).attemptsTo(StorePreparedCsvRecords.fromTable(table.hashes()));
});

When('{actor} writes the records to CSV file {string}', async (actorName: string, filename: string) => {
  await actorCalled(actorName).attemptsTo(WriteRecordsToCsv.file(filename));
});

When('{actor} writes the prepared records to CSV file {string}', async (actorName: string, filename: string) => {
  await actorCalled(actorName).attemptsTo(WriteRecordsToCsv.file(filename));
});

When('{actor} loads the generated CSV output', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(LoadGeneratedCsvOutput.now());
});

Then('the loaded CSV output should contain {int} records', async (count: number) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(LoadedGeneratedCsvRecordCount(), equals(count)),
  );
});

Then('the loaded CSV output metadata format should be {string}', async (format: string) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(LoadedGeneratedCsvMetadataFormat(), equals(format)),
  );
});

Then('loaded CSV output record {int} should include fields {string}, {string}, and {string}', async (index: number, fieldA: string, fieldB: string, fieldC: string) => {
  const actor = actorCalled('QATester');
  expect(await actor.answer(LoadedGeneratedCsvFieldValue(index, fieldA))).toBeDefined();
  expect(await actor.answer(LoadedGeneratedCsvFieldValue(index, fieldB))).toBeDefined();
  expect(await actor.answer(LoadedGeneratedCsvFieldValue(index, fieldC))).toBeDefined();
});

Then('loaded CSV output record {int} field {string} should equal string {string}', async (index: number, field: string, value: string) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(LoadedGeneratedCsvFieldValue(index, field), equals(value.replace(/\\n/g, '\n'))),
  );
});

Then('loaded CSV output record {int} field {string} should be numeric', async (index: number, field: string) => {
  const value = await actorCalled('QATester').answer(LoadedGeneratedCsvFieldValue(index, field));
  expect(typeof value).toBe('number');
});

Then('loaded CSV output record {int} field {string} should be a non-empty string', async (index: number, field: string) => {
  const value = await actorCalled('QATester').answer(LoadedGeneratedCsvFieldValue(index, field));
  expect(typeof value).toBe('string');
  expect((value as string).length).toBeGreaterThan(0);
});

Then('loaded CSV output record {int} field {string} should be boolean', async (index: number, field: string) => {
  const value = await actorCalled('QATester').answer(LoadedGeneratedCsvFieldValue(index, field));
  expect(typeof value).toBe('boolean');
});

Then('the generated CSV should contain {string}', async (fragment: string) => {
  const csv = await actorCalled('QATester').answer(GeneratedCsvOutput());
  expect(csv).toContain(fragment);
});

Then('the loaded CSV output source pattern should be {string}', async (sourcePattern: string) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(LoadedGeneratedCsvSourcePattern(), equals(sourcePattern)),
  );
});

Then('the loaded CSV output should include a pattern hash', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(LoadedGeneratedCsvPatternHash(), not(equals(''))),
  );
});