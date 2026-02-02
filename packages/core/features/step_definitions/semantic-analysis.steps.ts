/**
 * Step definitions for Semantic Analysis feature tests
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { ScanSourceCode } from '../support/abilities/ScanSourceCode';
import { ParseTokens } from '../support/abilities/ParseTokens';
import { AnalyzeProgram } from '../support/abilities/AnalyzeProgram';
import { SetSourceCode, PerformScan } from '../support/tasks/ScannerTasks';
import { ParseSource } from '../support/tasks/ParserTasks';
import { AnalyzeParsedProgram } from '../support/tasks/AnalyzerTasks';
import { AnalysisResult } from '../support/questions/AnalyzerQuestions';

// Given steps

Given('QA Tester has a valid DSL schema:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has a DSL schema with unsupported type:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has a DSL schema with unrecognized generator:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has DSL schemas with circular dependency:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has a DSL schema with multiple errors:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has a DSL schema with undefined template reference:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

Given('QA Tester has a DSL schema with typo:', async (docString: string) => {
  await actorCalled('QA Tester')
    .whoCan(ScanSourceCode.using(), ParseTokens.using(), AnalyzeProgram.using())
    .attemptsTo(SetSourceCode.to(docString));
});

// When steps

When('QA Tester runs semantic analysis', async () => {
  await actorCalled('QA Tester').attemptsTo(
    PerformScan.ofSourceCode(),
    ParseSource.fromTokens(),
    AnalyzeParsedProgram.fromParseResult(),
  );
});

// Then steps

Then('QA Tester should see analysis succeeded', async () => {
  await actorCalled('QA Tester').attemptsTo(Ensure.that(AnalysisResult.succeeded(), isTrue()));
});

Then('QA Tester should see analysis failed', async () => {
  await actorCalled('QA Tester').attemptsTo(Ensure.that(AnalysisResult.failed(), isTrue()));
});

Then('the validated program should contain schema {string}', async (schemaName: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.hasSchema(schemaName), isTrue()),
  );
});

Then('the validated program should have {int} fields', async (fieldCount: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.totalFields(), equals(fieldCount)),
  );
});

Then('QA Tester should see error with code {string}', async (errorCode: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.hasErrorCode(errorCode), isTrue()),
  );
});

Then('the analysis error message should contain {string}', async (substring: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.errorMessageContains(substring), isTrue()),
  );
});

Then('the analysis error suggestion should contain {string}', async (substring: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.errorSuggestionContains(substring), isTrue()),
  );
});

Then('the analysis error message should match pattern {string}', async (pattern: string) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.errorMessageMatches(pattern), isTrue()),
  );
});

Then('QA Tester should see at least {int} errors', async (minErrors: number) => {
  await actorCalled('QA Tester').attemptsTo(
    Ensure.that(AnalysisResult.errorCountAtLeast(minErrors), isTrue()),
  );
});
