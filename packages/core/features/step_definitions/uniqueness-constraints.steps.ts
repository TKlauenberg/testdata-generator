import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { UniquenessTracker } from '../../src/generator/uniqueness';

const trackers = new Map<string, UniquenessTracker>();
const firstResults = new Map<string, boolean>();
const secondResults = new Map<string, boolean>();

function actorNameOrDefault(name: string): string {
  return name || 'Dev';
}

Given('{word} has a fresh uniqueness tracker', (name: string) => {
  trackers.set(actorNameOrDefault(name), new UniquenessTracker());
  firstResults.delete(actorNameOrDefault(name));
  secondResults.delete(actorNameOrDefault(name));
});

When('{word} tracks value {string} for field {string}', (name: string, value: string, field: string) => {
  const actorName = actorNameOrDefault(name);
  const tracker = trackers.get(actorName);
  if (!tracker) {
    throw new Error(`No tracker found for actor ${actorName}`);
  }

  firstResults.set(actorName, tracker.track(field, value));
});

When('{word} tracks value {string} for field {string} again', (name: string, value: string, field: string) => {
  const actorName = actorNameOrDefault(name);
  const tracker = trackers.get(actorName);
  if (!tracker) {
    throw new Error(`No tracker found for actor ${actorName}`);
  }

  secondResults.set(actorName, tracker.track(field, value));
});

When(
  '{word} tracks composite fields {string} with values {string}',
  (name: string, fieldsCsv: string, valuesCsv: string) => {
    const actorName = actorNameOrDefault(name);
    const tracker = trackers.get(actorName);
    if (!tracker) {
      throw new Error(`No tracker found for actor ${actorName}`);
    }

    const fields = fieldsCsv.split(',').map((entry) => entry.trim());
    const values = valuesCsv.split(',').map((entry) => entry.trim());
    firstResults.set(actorName, tracker.trackComposite(fields, values));
  },
);

When(
  '{word} tracks composite fields {string} with values {string} again',
  (name: string, fieldsCsv: string, valuesCsv: string) => {
    const actorName = actorNameOrDefault(name);
    const tracker = trackers.get(actorName);
    if (!tracker) {
      throw new Error(`No tracker found for actor ${actorName}`);
    }

    const fields = fieldsCsv.split(',').map((entry) => entry.trim());
    const values = valuesCsv.split(',').map((entry) => entry.trim());
    secondResults.set(actorName, tracker.trackComposite(fields, values));
  },
);

When('{word} clears the uniqueness tracker', (name: string) => {
  const actorName = actorNameOrDefault(name);
  const tracker = trackers.get(actorName);
  if (!tracker) {
    throw new Error(`No tracker found for actor ${actorName}`);
  }

  tracker.clear();
});

Then('the first tracking result should be true', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(firstResults.get(actorName), equals(true)),
  );
});

Then('the second tracking result should be false', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(secondResults.get(actorName), equals(false)),
  );
});

Then('the second tracking result should be true', async () => {
  const actorName = 'Dev';
  await actorCalled(actorName).attemptsTo(
    Ensure.that(secondResults.get(actorName), equals(true)),
  );
});
