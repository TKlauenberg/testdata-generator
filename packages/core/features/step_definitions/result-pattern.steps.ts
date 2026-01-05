import { Given, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, includes, isTrue } from '@serenity-js/assertions';
import { PerformOperation } from '../support/tasks/ResultTasks.ts';
import { OperationResult } from '../support/questions/ResultQuestions.ts';
import { Diagnostic } from '../../src/common/diagnostic.ts';

/**
 * Step definitions demonstrating Result<T, E> pattern integration with Screenplay.
 *
 * These show the patterns that future stories will use for testing
 * scanner/parser/analyzer operations that return Result types.
 *
 * Note: Uses custom {actor} parameter type from support/parameterTypes.ts
 */

Given(
  '{actor} performs an operation that succeeds with value {string}',
  async (actorName: string, value: string) => {
    await actorCalled(actorName).attemptsTo(
      PerformOperation.thatSucceeds(value),
    );
  },
);

Given(
  '{actor} performs an operation that fails with error {string} at line {int}',
  async (actorName: string, errorCode: string, line: number) => {
    const diagnostic: Diagnostic = {
      code: errorCode,
      message: `Example ${errorCode}: unterminated string literal`,
      severity: 'error',
      location: {
        file: 'test.td',
        line,
        column: 1,
        length: 10,
      },
      suggestion: 'Add a closing quote',
    };

    await actorCalled(actorName).attemptsTo(
      PerformOperation.thatFails([diagnostic]),
    );
  },
);

Then(
  '{actor} should see the operation succeeded',
  async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.that(OperationResult.succeeded(), isTrue()),
    );
  },
);

Then('{actor} should see the operation failed', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.that(OperationResult.failed(), isTrue()),
  );
});

Then('the success value should be {string}', async (expected: string) => {
  // Use the current actor context
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(
    Ensure.that(OperationResult.successValue(), equals(expected)),
  );
});

Then(
  'the first error message should contain {string}',
  async (text: string) => {
    const actor = actorCalled('QA Tester');
    await actor.attemptsTo(
      Ensure.that(OperationResult.firstErrorMessage(), includes(text)),
    );
  },
);

Then('the error should be at line {int}', async (expectedLine: number) => {
  const actor = actorCalled('QA Tester');
  const errors = await OperationResult.errors().answeredBy(actor);

  await actor.attemptsTo(
    Ensure.that(errors.length > 0, isTrue()),
    Ensure.that(errors[0].location?.line, equals(expectedLine)),
  );
});

Then(
  '{actor} can safely access the success value',
  async (actorName: string) => {
    // This demonstrates type-safe access pattern
    const actor = actorCalled(actorName);
    const result = await OperationResult.value().answeredBy(actor);

    // TypeScript type narrowing with Result discriminator
    if (result && result.ok) {
      // TypeScript knows result.value is string here
      const value: string = result.value;
      await actor.attemptsTo(Ensure.that(value, equals('valid data')));
    }
  },
);
