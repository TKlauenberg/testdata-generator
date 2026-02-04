/**
 * Step definitions for PRNG determinism feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UsePRNG } from '../support/abilities/UsePRNG';
import { GenerateRandomSequence } from '../support/tasks/PRNGTasks';
import { PRNGSequence } from '../support/questions/PRNGQuestions';

// Create RNG instances
Given('Developer creates RNG with seed {int}', (seed: number) => {
  const prng = UsePRNG.as(actorCalled('Developer'));
  prng.createRNG(seed, 'default');
});

Given('Developer creates another RNG with seed {int}', (seed: number) => {
  const prng = UsePRNG.as(actorCalled('Developer'));
  prng.createRNG(seed, 'B');
});

// Generate sequences
Given('Developer generates {int} random floats from RNG A', async (count: number) => {
  await actorCalled('Developer').attemptsTo(GenerateRandomSequence.ofFloats(count, 'default', 'A'));
});

Given('Developer generates {int} random floats from RNG B', async (count: number) => {
  await actorCalled('Developer').attemptsTo(GenerateRandomSequence.ofFloats(count, 'B', 'B'));
});

When('Developer generates {int} random floats', async (count: number) => {
  await actorCalled('Developer').attemptsTo(GenerateRandomSequence.ofFloats(count, 'default', 'default'));
});

When(
  'Developer generates {int} random integers between {int} and {int}',
  async (count: number, min: number, max: number) => {
    await actorCalled('Developer').attemptsTo(GenerateRandomSequence.ofIntegers(count, min, max, 'default', 'default'));
  },
);

// Assertions
Then('the sequences from RNG A and RNG B should be identical', async () => {
  await actorCalled('Developer').attemptsTo(Ensure.that(PRNGSequence.areIdentical('A', 'B'), equals(true)));
});

Then('the sequences from RNG A and RNG B should be different', async () => {
  await actorCalled('Developer').attemptsTo(Ensure.that(PRNGSequence.areDifferent('A', 'B'), equals(true)));
});

Then(
  'the average should be approximately {float} with {int}% tolerance',
  async (target: number, tolerance: number) => {
    const avg = await actorCalled('Developer').answer(PRNGSequence.average('default'));
    const delta = Math.abs(avg - target);
    const maxDelta = target * (tolerance / 100);

    // Verify delta is less than maxDelta (within tolerance)
    if (delta >= maxDelta) {
      throw new Error(`Average ${avg} is not within ${tolerance}% of ${target}`);
    }
  },
);

Then('all values should be in the range [0, 1)', async () => {
  await actorCalled('Developer').attemptsTo(Ensure.that(PRNGSequence.allValuesInRange('default', 0, 1, false), isTrue()));
});

Then('all values in sequence {word} should be in the range [0, 1)', async (sequenceName: string) => {
  await actorCalled('Developer').attemptsTo(Ensure.that(PRNGSequence.allValuesInRange(sequenceName, 0, 1, false), isTrue()));
});

Then('all generated integers should be between {int} and {int} inclusive', async (min: number, max: number) => {
  await actorCalled('Developer').attemptsTo(Ensure.that(PRNGSequence.allValuesInRange('default', min, max, true), isTrue()));
});

Then('each value from {int} to {int} should appear at least once', async (min: number, max: number) => {
  await actorCalled('Developer').attemptsTo(
    Ensure.that(PRNGSequence.containsAllValuesInRange('default', min, max), isTrue()),
  );
});
