import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Question } from '@serenity-js/core';
import { Ensure, equals, isTrue, includes, isGreaterThan } from '@serenity-js/assertions';
import { ScanSourceCode } from '../support/abilities/ScanSourceCode';
import { SetSourceCode, PerformScan } from '../support/tasks/ScannerTasks';
import { ScanResult, TokenList } from '../support/questions/ScannerQuestions';

/**
 * Step definitions for Scanner feature tests.
 *
 * These demonstrate Screenplay pattern integration with the scanner module.
 * Actors gain the ScanSourceCode ability and perform scanning tasks.
 */

// Given steps - Setting up test data

Given('{actor} has DSL source code {string}', async (actorName: string, source: string) => {
  await actorCalled(actorName).whoCan(ScanSourceCode.using()).attemptsTo(SetSourceCode.to(source));
});

// Step definition for multiline DSL source code using docstrings
// Used by parser.feature scenarios with """ delimited source
Given('{actor} has DSL source code:', async (actorName: string, docString: string) => {
  await actorCalled(actorName).whoCan(ScanSourceCode.using()).attemptsTo(SetSourceCode.to(docString));
});

Given('{actor} has DSL source code with an unterminated string', async (actorName: string) => {
  await actorCalled(actorName)
    .whoCan(ScanSourceCode.using())
    .attemptsTo(SetSourceCode.to('"unterminated'));
});

Given('{actor} has multiline DSL source code', async (actorName: string) => {
  const source = 'line1\nline2\nline3';
  await actorCalled(actorName).whoCan(ScanSourceCode.using()).attemptsTo(SetSourceCode.to(source));
});

// When steps - Performing actions

When('{actor} scans the source code', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(PerformScan.ofSourceCode());
});

// Then steps - Assertions

Then('{actor} should see the scan succeeded', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(ScanResult.succeeded(), isTrue()));
});

Then('{actor} should see the scan failed', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(Ensure.that(ScanResult.failed(), isTrue()));
});

Then('the tokens should contain a keyword token with value {string}', async (keyword: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(TokenList.containsKeyword(keyword), isTrue()),
  );
});

Then(
  'the tokens should contain an identifier token with value {string}',
  async (identifier: string) => {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(TokenList.containsIdentifier(identifier), isTrue()),
    );
  },
);

Then('the tokens should contain {int} identifier tokens', async (count: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(TokenList.countOfKind('identifier'), equals(count)),
  );
});

Then('the first token should be a string with value {string}', async (value: string) => {
  const token = await actorCalled('QA Tester').answer(ScanResult.firstToken());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('first token kind', () => token.kind),
      equals('string'),
    ),
  );

  // Type narrowing: we know it's a string token
  if (token.kind === 'string') {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('first token value', () => token.value),
        equals(value),
      ),
    );
  }
});

Then('the tokens should contain {int} number tokens', async (count: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(TokenList.countOfKind('number'), equals(count)),
  );
});

Then('the tokens should contain operator tokens', async () => {
  await actorCalled('QA Tester').attemptsTo(Ensure.that(TokenList.containsOperators(), isTrue()));
});

Then('the error code should be {string}', async (errorCode: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(ScanResult.firstErrorCode(), equals(errorCode)),
  );
});

// Scanner-specific error message step (disambiguated from parser.steps.ts)
Then('the scan error message should contain {string}', async (text: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(ScanResult.firstErrorMessage(), includes(text)),
  );
});

Then(
  'the first token location should have line {int} and column {int}',
  async (line: number, column: number) => {
    const token = await actorCalled('QA Tester').answer(ScanResult.firstToken());
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about('token line', () => token.location.line),
        equals(line),
      ),
      Ensure.that(
        Question.about('token column', () => token.location.column),
        equals(column),
      ),
    );
  },
);

Then('the first token location should have length {int}', async (length: number) => {
  const token = await actorCalled('QA Tester').answer(ScanResult.firstToken());
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('token length', () => token.location.length),
      equals(length),
    ),
  );
});

Then('the tokens should have correct line numbers', async () => {
  const tokens = await actorCalled('QA Tester').answer(ScanResult.tokens());

  // Filter out EOF token and check that we have tokens on different lines
  const nonEofTokens = tokens.filter((t) => t.kind !== 'eof');

  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(
      Question.about('non-EOF token count', () => nonEofTokens.length),
      isGreaterThan(1),
    ),
  );

  // Verify line numbers are sequential (1, 2, 3)
  for (let i = 0; i < nonEofTokens.length && i < 3; i++) {
    await actorCalled('QA Tester').attemptsTo(
      Ensure.that(
        Question.about(`token ${i} line number`, () => nonEofTokens[i].location.line),
        equals(i + 1),
      ),
    );
  }
});
