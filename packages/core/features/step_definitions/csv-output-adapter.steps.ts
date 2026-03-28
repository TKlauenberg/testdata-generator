import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { expect } from 'bun:test';
import { WriteRecordsToCsv, StorePreparedCsvRecords, LoadGeneratedCsvOutput } from '../support/tasks/CsvAdapterTasks';
import { LoadedGeneratedCsvFieldValue, LoadedGeneratedCsvMetadataFormat, LoadedGeneratedCsvRecordCount } from '../support/questions/CsvAdapterQuestions';

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