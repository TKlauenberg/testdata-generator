import { After, Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import * as path from 'node:path';
import { loadContext, saveAsContext, type ContextData } from '../../src/context';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';

interface GeneratedContextRoundtripState {
  directoryPath?: string;
  savedContextPath?: string;
  loadedContext?: ContextData;
}

const stateByActor: Record<string, GeneratedContextRoundtripState> = {};

function getState(actorName: string): GeneratedContextRoundtripState {
  return stateByActor[actorName] ??= {};
}

function parseTags(tagsCsv: string): readonly string[] {
  return tagsCsv
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

When(
  '{word} saves the generated records as context {string} with tags {string} and source pattern {string}',
  async (actorName: string, contextName: string, tagsCsv: string, sourcePattern: string) => {
    const actor = actorCalled(actorName);
    const api = UseGenerateDataAPI.as(actor);
    const state = getState(actorName);
    const directoryPath = path.join(
      import.meta.dir,
      '../../__test-output__/generated-context-roundtrip',
      randomUUID(),
    );

    await saveAsContext(api.getRecords(), contextName, parseTags(tagsCsv), {
      directory: directoryPath,
      sourcePattern,
    });

    state.directoryPath = directoryPath;
    state.savedContextPath = path.join(directoryPath, `${contextName}.json`);
  },
);

When(
  '{word} loads the saved context as collection {string}',
  async (actorName: string, collectionName: string) => {
    const state = getState(actorName);
    if (!state.savedContextPath) {
      throw new Error(`No saved context path recorded for actor '${actorName}'`);
    }

    const context = await loadContext(state.savedContextPath);
    state.loadedContext = context;

    const api = UseGenerateDataAPI.as(actorCalled(actorName));
    api.storeTaggedContextCollection(collectionName, context);
  },
);

Then('the saved context metadata should include tags {string}', async (tagsCsv: string) => {
  const loadedContext = getState('QATester').loadedContext;
  if (!loadedContext) {
    throw new Error('Expected a saved context to be loaded before asserting metadata tags');
  }

  await actorCalled('QATester').attemptsTo(
    Ensure.that(loadedContext.metadata.tags, equals(parseTags(tagsCsv))),
  );
});

Then('exactly {int} records should be generated', async (count: number) => {
  const api = UseGenerateDataAPI.as(actorCalled('QATester'));

  await actorCalled('QATester').attemptsTo(
    Ensure.that(api.getRecords().length, equals(count)),
  );
});

Then('the saved context metadata should include source pattern {string}', async (sourcePattern: string) => {
  const loadedContext = getState('QATester').loadedContext;
  if (!loadedContext) {
    throw new Error('Expected a saved context to be loaded before asserting metadata source pattern');
  }

  await actorCalled('QATester').attemptsTo(
    Ensure.that(loadedContext.metadata.sourcePattern, equals(sourcePattern)),
  );
});

After(async () => {
  const states = Object.values(stateByActor);
  for (const state of states) {
    if (state.directoryPath) {
      await rm(state.directoryPath, { recursive: true, force: true });
    }
  }

  for (const actorName of Object.keys(stateByActor)) {
    delete stateByActor[actorName];
  }
});