import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import {
  SetNumbers,
  AddNumbers,
  SubtractNumbers,
  MultiplyResult,
} from '../support/tasks/CalculationTasks';
import {
  CalculationResult,
  ScreenplayKnowledge,
} from '../support/questions/CalculationQuestions';

/**
 * Step definitions for the example.feature file.
 *
 * These demonstrate the Screenplay pattern:
 * - Use actor names directly (captured with {actor})
 * - Given/When use actor.attemptsTo(Task) for actions
 * - Then use Ensure.that(Question, matcher) for assertions
 *
 * Note: {actor} is a custom parameter type defined in support/parameterTypes.ts
 * that matches actor names like "QA Tester", "Developer", etc. without quotes.
 */

// Background step
Given('the testdata-ai core library is initialized', function () {
  // This is a setup step - in real tests would initialize the library
  // For this example, nothing needs to be done
});

// Scenario: Simple calculation demonstration
Given(
  '{actor} has two numbers: {int} and {int}',
  async (actorName: string, first: number, second: number) => {
    await actorCalled(actorName).attemptsTo(SetNumbers.to(first, second));
  },
);

When('{actor} adds the numbers together', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(AddNumbers.together());
});

When('{actor} subtracts the second from the first', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(SubtractNumbers.secondFromFirst());
});

When('{actor} multiplies the result by {int}', async (actorName: string, multiplier: number) => {
  await actorCalled(actorName).attemptsTo(MultiplyResult.by(multiplier));
});

Then('{actor} should see the result is {int}', async (actorName: string, expected: number) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(CalculationResult.value(), equals(expected)));
});

// Scenario: Demonstrating Screenplay pattern structure
Given('{actor} wants to understand Screenplay pattern', (actorName: string) => {
  // This is a documentation step - actor is ready to learn
  actorCalled(actorName);
});

Then('{actor} should know that Actors represent users', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(
      ScreenplayKnowledge.aboutActors(),
      equals('Actors represent users or systems interacting with the application'),
    ),
  );
});

Then('{actor} should know that Abilities define what Actors can do', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(
      ScreenplayKnowledge.aboutAbilities(),
      equals('Abilities define what an Actor can do (e.g., parse schemas, generate data)'),
    ),
  );
});

Then('{actor} should know that Tasks represent high-level actions', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(
      ScreenplayKnowledge.aboutTasks(),
      equals('Tasks represent high-level business actions composed of Interactions'),
    ),
  );
});

Then('{actor} should know that Questions query system state', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(
      ScreenplayKnowledge.aboutQuestions(),
      equals('Questions allow Actors to query system state and retrieve information'),
    ),
  );
});
