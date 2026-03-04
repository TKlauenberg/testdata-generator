import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import * as path from 'node:path';
import {
  AttemptLoadJsonContextFixture,
  LoadJsonContextFixture,
} from '../support/tasks/JsonContextLoaderTasks';
import {
  JsonContextLoadingErrorMessageContains,
  JsonContextLoadingFailed,
  LoadedContextFieldValue,
  LoadedContextMetadataFormat,
  LoadedContextRecordCount,
} from '../support/questions/JsonContextLoaderQuestions';

const fixturePathByActor: Record<string, string> = {};

function resolveFixturePath(fileName: string): string {
  return path.join(import.meta.dir, '../fixtures/context', fileName);
}

Given('{actor} has JSON context fixture {string}', (actorName: string, fileName: string) => {
  fixturePathByActor[actorName] = resolveFixturePath(fileName);
});

When('{actor} loads the JSON context fixture', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const fixturePath = fixturePathByActor[actorName];
  await actor.attemptsTo(LoadJsonContextFixture.fromPath(String(fixturePath)));
});

When('{actor} attempts to load the JSON context fixture', async (actorName: string) => {
  const actor = actorCalled(actorName);
  const fixturePath = fixturePathByActor[actorName];
  await actor.attemptsTo(AttemptLoadJsonContextFixture.fromPath(String(fixturePath)));
});

Then('the loaded context should contain {int} records', async (count: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(LoadedContextRecordCount(), equals(count)),
  );
});

Then('the loaded context metadata format should be {string}', async (format: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(LoadedContextMetadataFormat(), equals(format)),
  );
});

Then(
  'loaded record {int} should have field {string} with value {string}',
  async (index: number, field: string, value: string) => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(LoadedContextFieldValue(index, field), equals(value)),
    );
  },
);

Then('JSON context loading should fail', async () => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(JsonContextLoadingFailed(), isTrue()),
  );
});

Then('the JSON context loading error should mention {string}', async (text: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(JsonContextLoadingErrorMessageContains(text), isTrue()),
  );
});
