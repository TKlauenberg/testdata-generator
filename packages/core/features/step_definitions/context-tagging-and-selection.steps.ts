import { Given } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import * as path from 'node:path';
import { loadContext } from '../../src/context';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';

function resolveFixturePath(fileName: string): string {
  return path.join(import.meta.dir, '../fixtures/context', fileName);
}

Given(
  '{word} has context collection {string} loaded from fixture {string} with tags {string}',
  async (actorName: string, collectionName: string, fileName: string, tagsCsv: string) => {
    const context = await loadContext(
      resolveFixturePath(fileName),
      tagsCsv.split(',').map((tag) => tag.trim()),
    );

    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    api.storeTaggedContextCollection(collectionName, context);
  },
);

Given(
  '{word} has context collection {string} loaded from fixture {string}',
  async (actorName: string, collectionName: string, fileName: string) => {
    const context = await loadContext(resolveFixturePath(fileName));

    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    api.storeTaggedContextCollection(collectionName, context);
  },
);