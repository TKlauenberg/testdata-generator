import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import * as path from 'node:path';
import {
  AttemptLoadCsvContextFixture,
  LoadCsvContextFixture,
} from '../support/tasks/CsvContextLoaderTasks';
import {
  CsvContextLoadingErrorMessageContains,
  CsvContextLoadingFailed,
  LoadedCsvContextFieldValue,
  LoadedCsvContextMetadataFormat,
  LoadedCsvContextRecordCount,
} from '../support/questions/CsvContextLoaderQuestions';

const fixturePathByActor: Record<string, string> = {};

function resolveFixturePath(fileName: string): string {
  return path.join(import.meta.dir, '../fixtures/context', fileName);
}

Given('{actor} has CSV context fixture {string}', (actorName: string, fileName: string) => {
  fixturePathByActor[actorName] = resolveFixturePath(fileName);
});

When('{actor} loads the CSV context fixture', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const fixturePath = fixturePathByActor[actorName];
  await actor.attemptsTo(LoadCsvContextFixture.fromPath(String(fixturePath)));
});

When('{actor} attempts to load the CSV context fixture', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const fixturePath = fixturePathByActor[actorName];
  await actor.attemptsTo(AttemptLoadCsvContextFixture.fromPath(String(fixturePath)));
});

Then('the loaded CSV context should contain {int} records', async (count: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(LoadedCsvContextRecordCount(), equals(count)),
  );
});

Then('the loaded CSV context metadata format should be {string}', async (format: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(LoadedCsvContextMetadataFormat(), equals(format)),
  );
});

Then(
  'loaded CSV record {int} should have field {string} with value {string}',
  async (index: number, field: string, value: string) => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(LoadedCsvContextFieldValue(index, field), equals(value)),
    );
  },
);

Then('loaded CSV record {int} should have field {string} with number value {int}', async (index: number, field: string, value: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(LoadedCsvContextFieldValue(index, field), equals(value)),
  );
});

Then('CSV context loading should fail', async () => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(CsvContextLoadingFailed(), isTrue()),
  );
});

Then('the CSV context loading error should mention {string}', async (text: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(CsvContextLoadingErrorMessageContains(text), isTrue()),
  );
});