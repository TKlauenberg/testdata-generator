import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { UseUniquenessTracker } from '../support/abilities/UseUniquenessTracker';
import {
  ClearUniquenessTracker,
  PrepareUniquenessTracker,
  TrackCompositeValue,
  TrackFieldValue,
} from '../support/tasks/UniquenessTrackerTasks';
import { FirstTrackingResult, SecondTrackingResult } from '../support/questions/UniquenessTrackerQuestions';

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
