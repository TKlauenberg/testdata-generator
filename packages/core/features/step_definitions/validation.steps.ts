import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, includes, isTrue, isGreaterThan, startsWith } from '@serenity-js/assertions';
import { ValidateSchema } from '../support/tasks/ValidationTasks';
import { ValidationResult } from '../support/questions/ValidationQuestions';
import type { DefaultSpec } from '../../src/parser';

/**
 * Step definitions for end-to-end validation feature
 */

Given('the validation API is available', async () => {
  // No setup needed - API is always available
});

Given('I have a schema file with the content:', async (docString: string) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(ValidateSchema.withSource(docString));
});

function parseDefaultSpecs(dataTable: { hashes: () => Array<Record<string, string>> }): DefaultSpec[] {
  return dataTable.hashes().map((row) => {
    const parameters = Object.entries(row)
      .filter(([key, value]) => key !== 'fieldType' && key !== 'generator' && value.trim().length > 0)
      .map(([key, value]) => ({
        name: key,
        value: key === 'array' ? value.split('|').map((item) => item.trim()) : Number.isNaN(Number(value)) ? value : Number(value),
      }));

    return {
      fieldType: row.fieldType,
      generator: {
        name: row.generator,
        parameters: parameters.length > 0 ? parameters : undefined,
      },
    };
  });
}

Given('I validate using configured generator defaults:', async (dataTable: { hashes: () => Array<Record<string, string>> }) => {
  const defaults = parseDefaultSpecs(dataTable);
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(ValidateSchema.withDefaultGenerators(defaults));
});

Given('global generator defaults are configured:', async (dataTable: { hashes: () => Array<Record<string, string>> }) => {
  const defaults = parseDefaultSpecs(dataTable);
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(ValidateSchema.withGlobalDefaultGenerators(defaults));
});

Given('workspace generator defaults are configured:', async (dataTable: { hashes: () => Array<Record<string, string>> }) => {
  const defaults = parseDefaultSpecs(dataTable);
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(ValidateSchema.withWorkspaceDefaultGenerators(defaults));
});

Given(
  'I have a schema file with {int} schemas and {int} fields each',
  async (schemaCount: number, fieldsPerSchema: number) => {
    const schemas: string[] = [];
    for (let i = 0; i < schemaCount; i++) {
      const fields: string[] = [];
      for (let j = 0; j < fieldsPerSchema; j++) {
        const types = ['uuid', 'string', 'number', 'boolean', 'date', 'timestamp'];
        const type = types[j % types.length];
        fields.push(`  field${j}: ${type}`);
      }
      schemas.push(`schema Schema${i} {\n${fields.join('\n')}\n}`);
    }
    const actor = actorCalled('QA Tester');
    await actor.attemptsTo(ValidateSchema.withSource(schemas.join('\n\n')));
  },
);

When('I validate the schema', async () => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(ValidateSchema.execute());
});

Then('the validation should succeed', async () => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.succeeded(), isTrue()));
});

Then('the validation should fail', async () => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.failed(), isTrue()));
});

Then('the result should contain {int} schema(s)', async (count: number) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.schemaCount(), equals(count)));
});

Then('the result should contain {int} field(s)', async (count: number) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.fieldCount(), equals(count)));
});

Then('I should see an error message containing {string}', async (text: string) => {
  const actor = actorCalled('QA Tester');
  const message = await ValidationResult.firstErrorMessage().answeredBy(actor);
  await actor.attemptsTo(
    Ensure.that(message.toLowerCase(), includes(text.toLowerCase())),
  );
});

Then('the error code should start with {string}', async (prefix: string) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.firstErrorCode(), startsWith(prefix)));
});

Then('the error code should match {string}', async (code: string) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.firstErrorCode(), equals(code)));
});

Then('the error should have location information', async () => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.hasErrorLocation(), isTrue()));
});

Then('I should see {int} error(s)', async (count: number) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.errorCount(), equals(count)));
});

Then('the errors should be sorted by line number', async () => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(Ensure.that(ValidationResult.errorsAreSorted(), isTrue()));
});

Then(
  'the validation should complete in under {int} milliseconds',
  async (maxMs: number) => {
    const actor = actorCalled('QA Tester');
    await actor.attemptsTo(
      Ensure.that(ValidationResult.validationDuration(), isGreaterThan(0)),
    );
    const duration = await ValidationResult.validationDuration().answeredBy(actor);
    if (duration >= maxMs) {
      throw new Error(`Expected validation under ${maxMs}ms, took ${duration.toFixed(2)}ms`);
    }
  },
);

Then('field {string} in schema {string} should resolve generator {string}', async (fieldName: string, schemaName: string, generatorName: string) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(
    Ensure.that(ValidationResult.resolvedGenerator(schemaName, fieldName), equals(generatorName)),
  );
});

Then('field {string} in schema {string} should be marked unique', async (fieldName: string, schemaName: string) => {
  const actor = actorCalled('QA Tester');
  await actor.attemptsTo(
    Ensure.that(ValidationResult.fieldIsUnique(schemaName, fieldName), isTrue()),
  );
});
