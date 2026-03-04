import { Given, Then } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import * as path from 'node:path';
import { loadJsonContext } from '../../src/context';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';

function resolveFixturePath(fileName: string): string {
  return path.join(import.meta.dir, '../fixtures/context', fileName);
}

Given(
  '{word} has context collection {string} loaded from JSON fixture {string}',
  async (actorName: string, collectionName: string, fileName: string) => {
    const fixturePath = resolveFixturePath(fileName);
    const context = await loadJsonContext(fixturePath);
    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    api.storeContextCollection(collectionName, context.records);
  },
);

Then(
  'each generated record should have field {string} in set {string}',
  async (fieldName: string, allowedValuesCsv: string) => {
    const activeActor = actorInTheSpotlight();
    const api = UseGenerateDataAPI.as(activeActor);
    const records = api.getRecords();
    const allowedValues = allowedValuesCsv
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    for (const record of records) {
      await activeActor.attemptsTo(
        Ensure.that(allowedValues.includes(String(record[fieldName])), equals(true)),
      );
    }
  },
);
