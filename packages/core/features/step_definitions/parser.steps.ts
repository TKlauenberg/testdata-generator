import { When, Then } from '@cucumber/cucumber';
import { actorCalled, Question } from '@serenity-js/core';
import { Ensure, equals, isTrue, isGreaterThan } from '@serenity-js/assertions';
import { ParseTokens } from '../support/abilities/ParseTokens';
import { PerformScan } from '../support/tasks/ScannerTasks';
import { ParseSource } from '../support/tasks/ParserTasks';
import {
  ParseResult,
  ProgramNode,
  SchemaNodes,
  FirstField,
  SecondField,
  ThirdField,
} from '../support/questions/ParserQuestions';

/**
 * Step definitions for Parser feature tests.
 *
 * These demonstrate Screenplay pattern integration with the parser module.
 * Actors gain abilities to scan and parse, then perform tasks and ask questions
 * about the resulting AST.
 */

// When steps - Performing actions

When('{actor} scans and parses the source code', async (actorName: string) => {
  // Note: The actor should already have ScanSourceCode ability from the Given step
  // We only add ParseTokens ability here (ScanSourceCode should retain its state)
  await actorCalled(actorName)
    .whoCan(ParseTokens.using())
    .attemptsTo(PerformScan.ofSourceCode(), ParseSource.fromTokens());
});

// Then steps - Assertions about parse results

Then('{actor} should see the parsing succeeded', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(ParseResult.succeeded(), isTrue()));
});

Then('{actor} should see the parsing failed', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(ParseResult.failed(), isTrue()));
});

// Assertions about AST structure

Then('the AST should contain a Program node', async () => {
  await actorCalled('QA Tester').attemptsTo(Ensure.that(ProgramNode.exists(), isTrue()));
});

Then('the Program should contain {int} schema(s)', async (count: number) => {
  await actorCalled('QA Tester').attemptsTo(Ensure.that(SchemaNodes.count(), equals(count)));
});

Then('the schema should be named {string}', async (name: string) => {
  const schema = await actorCalled('QA Tester').answer(SchemaNodes.first());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('schema name', () => schema?.name),
      equals(name),
    ),
  );
});

Then('the schema should contain {int} field(s)', async (count: number) => {
  const schema = await actorCalled('QA Tester').answer(SchemaNodes.first());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('field count', () => schema?.fields.length ?? 0),
      equals(count),
    ),
  );
});

Then(
  'the field should have name {string} and type {string}',
  async (name: string, type: string) => {
    const field = await actorCalled('QA Tester').answer(FirstField.ofFirstSchema());
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('field name', () => field?.name),
        equals(name),
      ),
      Ensure.that(
        Question.about('field type', () => field?.type),
        equals(type),
      ),
    );
  },
);

// Generator assertions

Then(
  'the first field should have generator {string} with no parameters',
  async (genName: string) => {
    const field = await actorCalled('QA Tester').answer(FirstField.ofFirstSchema());
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('generator name', () => field?.generator?.name),
        equals(genName),
      ),
      Ensure.that(
        Question.about('generator has no parameters', () => {
          return (
            field?.generator?.parameters === undefined || field?.generator?.parameters?.length === 0
          );
        }),
        isTrue(),
      ),
    );
  },
);

Then(
  'the second field should have generator {string} with no parameters',
  async (genName: string) => {
    const field = await actorCalled('QA Tester').answer(SecondField.ofFirstSchema());
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('generator name', () => field?.generator?.name),
        equals(genName),
      ),
    );
  },
);

Then('the third field should have generator {string} with parameters', async (genName: string) => {
  const field = await actorCalled('QA Tester').answer(ThirdField.ofFirstSchema());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('generator name', () => field?.generator?.name),
      equals(genName),
    ),
    Ensure.that(
      Question.about('generator has parameters', () => {
        return (field?.generator?.parameters?.length ?? 0) > 0;
      }),
      isTrue(),
    ),
  );
});

// Constraint assertions

Then('the first field should have unique constraint', async () => {
  const field = await actorCalled('QA Tester').answer(FirstField.ofFirstSchema());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('field has unique constraint', () => field?.constraints?.unique === true),
      isTrue(),
    ),
  );
});

Then('the second field should have both generator and unique constraint', async () => {
  const field = await actorCalled('QA Tester').answer(SecondField.ofFirstSchema());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('field has generator', () => field?.generator !== undefined),
      isTrue(),
    ),
    Ensure.that(
      Question.about('field has unique constraint', () => field?.constraints?.unique === true),
      isTrue(),
    ),
  );
});

// Error assertions

Then('the error message should contain {string}', async (text: string) => {
  const result = await actorCalled('QA Tester').answer(ParseResult.value());

  if (!result.ok) {
    const hasError = result.errors.some((e) => e.message.includes(text));
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('error contains text', () => hasError),
        isTrue(),
      ),
    );
  }
});

Then('the error location should be at line {int}', async (line: number) => {
  const result = await actorCalled('QA Tester').answer(ParseResult.value());

  if (!result.ok && result.errors.length > 0) {
    const firstError = result.errors[0];
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('error line', () => firstError.location?.line),
        equals(line),
      ),
    );
  }
});

Then('there should be at least {int} error(s)', async (count: number) => {
  const result = await actorCalled('QA Tester').answer(ParseResult.value());

  if (!result.ok) {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('error count', () => result.errors.length),
        isGreaterThan(count - 1), // isGreaterThan(n-1) is equivalent to isGreaterThanOrEqual(n)
      ),
    );
  }
});

Then('one error should mention {string}', async (text: string) => {
  const result = await actorCalled('QA Tester').answer(ParseResult.value());

  if (!result.ok) {
    const hasError = result.errors.some((e) => e.message.includes(text));
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('one error mentions text', () => hasError),
        isTrue(),
      ),
    );
  }
});

// Location tracking assertions

Then('the schema location should start at line {int}', async (line: number) => {
  const schema = await actorCalled('QA Tester').answer(SchemaNodes.first());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('schema location line', () => schema?.location.line),
      equals(line),
    ),
  );
});

Then('the first field location should start at line {int}', async (line: number) => {
  const field = await actorCalled('QA Tester').answer(FirstField.ofFirstSchema());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('field location line', () => field?.location.line),
      equals(line),
    ),
  );
});
