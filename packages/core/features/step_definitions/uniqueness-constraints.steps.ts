import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseUniquenessTracker } from '../support/abilities/UseUniquenessTracker';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';
import {
  ClearUniquenessTracker,
  PrepareUniquenessTracker,
  TrackCompositeValue,
  TrackFieldValue,
} from '../support/tasks/UniquenessTrackerTasks';
import {
  AttemptGenerateRecordsUsingPublicAPI,
  GenerateRecordsUsingPublicAPI,
  StoreDSLSource,
} from '../support/tasks/GenerateDataPublicAPITasks';
import { FirstTrackingResult, SecondTrackingResult } from '../support/questions/UniquenessTrackerQuestions';
import {
  ErrorMessageContains,
  ErrorWasThrown,
  GeneratedRecords,
} from '../support/questions/GenerateDataPublicAPIQuestions';

function actorNameOrDefault(name: string): string {
  return name || 'Dev';
}

Given('{word} has a fresh uniqueness tracker', (name: string) => {
  const actor = actorCalled(actorNameOrDefault(name));
  actor.whoCan(UseUniquenessTracker.withDefaultCapabilities());
  return actor.attemptsTo(PrepareUniquenessTracker.fresh());
});

When('{word} tracks value {string} for field {string}', (name: string, value: string, field: string) => {
  return actorCalled(actorNameOrDefault(name)).attemptsTo(TrackFieldValue.asFirst(field, value));
});

When('{word} tracks value {string} for field {string} again', (name: string, value: string, field: string) => {
  return actorCalled(actorNameOrDefault(name)).attemptsTo(TrackFieldValue.asSecond(field, value));
});

When(
  '{word} tracks composite fields {string} with values {string}',
  (name: string, fieldsCsv: string, valuesCsv: string) => {
    return actorCalled(actorNameOrDefault(name)).attemptsTo(
      TrackCompositeValue.asFirst(fieldsCsv, valuesCsv),
    );
  },
);

When(
  '{word} tracks composite fields {string} with values {string} again',
  (name: string, fieldsCsv: string, valuesCsv: string) => {
    return actorCalled(actorNameOrDefault(name)).attemptsTo(
      TrackCompositeValue.asSecond(fieldsCsv, valuesCsv),
    );
  },
);

When('{word} clears the uniqueness tracker', (name: string) => {
  return actorCalled(actorNameOrDefault(name)).attemptsTo(ClearUniquenessTracker.now());
});

Then('the first tracking result should be true', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(FirstTrackingResult.value(), equals(true)),
  );
});

Then('the second tracking result should be false', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(SecondTrackingResult.value(), equals(false)),
  );
});

Then('the second tracking result should be true', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(SecondTrackingResult.value(), equals(true)),
  );
});

Given('{word} has uniqueness-enforced DSL source code:', async (name: string, docString: string) => {
  const actor = actorCalled(actorNameOrDefault(name));
  actor.whoCan(UseGenerateDataAPI.withDefaultCapabilities());
  await actor.attemptsTo(StoreDSLSource.withContent(docString));
});

When('{word} generates {int} records for uniqueness constraints', async (name: string, count: number) => {
  await actorCalled(actorNameOrDefault(name)).attemptsTo(GenerateRecordsUsingPublicAPI.withCount(count));
});

When(
  '{word} attempts to generate {int} records for uniqueness constraints',
  async (name: string, count: number) => {
    await actorCalled(actorNameOrDefault(name)).attemptsTo(
      AttemptGenerateRecordsUsingPublicAPI.withCount(count),
    );
  },
);

Then('all generated values for field {string} should be unique', async (fieldName: string) => {
  const actorName = 'Dev';
  const records = await actorCalled(actorName).answer(GeneratedRecords());
  const serializedValues = records.map((record) => JSON.stringify(record[fieldName]));
  await actorCalled(actorName).attemptsTo(
    Ensure.that(new Set(serializedValues).size, equals(serializedValues.length)),
  );
});

Then('uniqueness generation should fail', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(Ensure.that(ErrorWasThrown(), isTrue()));
});

Then('uniqueness failure should mention field {string}', async (fieldName: string) => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(Ensure.that(ErrorMessageContains(fieldName), isTrue()));
});

Then('uniqueness failure should suggest increasing value variety', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(ErrorMessageContains('increase generator variety'), isTrue()),
  );
});
