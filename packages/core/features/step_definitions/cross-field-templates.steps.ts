import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';
import { ValidationError } from '../../src/generateData';

Given('the actor {word}', (actorName: string) => {
  actorCalled(actorName).whoCan(UseGenerateDataAPI.withDefaultCapabilities());
});

Given('{word} has DSL source code:', (actorName: string, docString: string) => {
  const api = UseGenerateDataAPI.as(actorCalled(actorName));
  api.storeDSLSource(docString);
});

Given('{word} has DSL source code with semantic error:', (actorName: string, docString: string) => {
  const api = UseGenerateDataAPI.as(actorCalled(actorName));
  api.storeDSLSource(docString);
});

When('{word} generates {int} records using the public generateData API', async (actorName: string, count: number) => {
  const api = UseGenerateDataAPI.as(actorCalled(actorName));
  await api.generateRecords(count);
});

When(
  '{word} generates {int} records with seed {int} using the public generateData API',
  async (actorName: string, count: number, seed: number) => {
    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    await api.generateRecordsWithSeed(count, seed);
  },
);

When(
  '{word} generates another {int} records with the same seed {int}',
  async (actorName: string, count: number, seed: number) => {
    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    await api.generateRecordsWithSeed(count, seed, true);
  },
);

When('{word} attempts to generate records using the public generateData API', async (actorName: string) => {
  const api = UseGenerateDataAPI.as(actorCalled(actorName));
  await api.attemptGenerateRecords(1);
});

Then('a ValidationError should be thrown', async () => {
  const api = UseGenerateDataAPI.as(actorCalled('QATester'));
  const lastError = api.getLastError();
  await actorCalled('QATester').attemptsTo(
    Ensure.that(lastError instanceof ValidationError, equals(true)),
  );
});

Then('a generation error should be thrown', async () => {
  const api = UseGenerateDataAPI.as(actorCalled('QATester'));
  const lastError = api.getLastError();
  await actorCalled('QATester').attemptsTo(
    Ensure.that(Boolean(lastError), equals(true)),
  );
});

Then('the error message should mention {string}', async (text: string) => {
  const api = UseGenerateDataAPI.as(actorCalled('QATester'));
  const lastError = api.getLastError();

  await actorCalled('QATester').attemptsTo(
    Ensure.that(Boolean(lastError?.message.includes(text)), equals(true)),
  );
});

Then('both record sequences should be identical', async () => {
  const api = UseGenerateDataAPI.as(actorCalled('QATester'));
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      JSON.stringify(api.getRecords()) === JSON.stringify(api.getRecordsSecondSequence()),
      equals(true),
    ),
  );
});

Then(
  'each generated record should have field {string} equal to {string}',
  async (fieldName: string, expectedValue: string) => {
    const api = UseGenerateDataAPI.as(actorCalled('QATester'));
    const records = api.getRecords();

    await actorCalled('QATester').attemptsTo(Ensure.that(records.length > 0, isTrue()));

    for (const record of records) {
      await actorCalled('QATester').attemptsTo(
        Ensure.that(record[fieldName], equals(expectedValue)),
      );
    }
  },
);
