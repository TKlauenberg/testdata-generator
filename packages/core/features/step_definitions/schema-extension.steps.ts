import { Given, Then, When } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateData, validateSchema } from '../../src';
import type { Diagnostic } from '../../src';

interface SchemaExtensionState {
  currentFile?: string;
  source?: string;
  diagnostics: Diagnostic[];
  schemaNames: string[];
  generatedRecords: readonly Record<string, unknown>[];
}

const state: SchemaExtensionState = {
  diagnostics: [],
  schemaNames: [],
  generatedRecords: [],
};

function resolveFixturePath(relativePath: string): string {
  return path.join(import.meta.dir, '../fixtures/schema-extension', relativePath);
}

Given('schema extension fixture {string} is loaded as the current schema file', async (fixturePath: string) => {
  const absolutePath = resolveFixturePath(fixturePath);
  state.currentFile = absolutePath;
  state.source = await fs.readFile(absolutePath, 'utf-8');
  state.diagnostics = [];
  state.schemaNames = [];
  state.generatedRecords = [];
});

When('the schema extension fixture is validated', () => {
  assert.ok(state.currentFile !== undefined, 'A schema extension fixture must be loaded before validation');
  assert.ok(state.source !== undefined, 'A schema extension source must be loaded before validation');

  const result = validateSchema(state.source, state.currentFile, {
    currentFile: state.currentFile,
  });

  if (result.ok) {
    state.diagnostics = [];
    state.schemaNames = [...result.value.schemas.keys()];
    return;
  }

  state.diagnostics = result.errors;
  state.schemaNames = [];
});

Then('schema extension validation should succeed', () => {
  assert.equal(state.diagnostics.length, 0, `Expected schema extension validation to succeed, but got ${state.diagnostics.length} diagnostics`);
});

Then('validated schema extensions should include {string}', (schemaName: string) => {
  assert.ok(state.schemaNames.includes(schemaName), `Expected validated schemas to include '${schemaName}'`);
});

Then('schema extension validation should fail with diagnostic code {string}', (diagnosticCode: string) => {
  assert.ok(state.diagnostics.some((diagnostic) => diagnostic.code === diagnosticCode), `Expected diagnostics to contain code '${diagnosticCode}'`);
});

When('records are generated from the schema extension fixture', async () => {
  assert.ok(state.currentFile !== undefined, 'A schema extension fixture must be loaded before generation');
  assert.ok(state.source !== undefined, 'A schema extension source must be loaded before generation');

  state.generatedRecords = await Array.fromAsync(generateData(state.source, {
    count: 1,
    seed: 7,
    currentFile: state.currentFile,
  }));

  const validationResult = validateSchema(state.source, state.currentFile, {
    currentFile: state.currentFile,
  });

  assert.equal(validationResult.ok, true, 'Validation must succeed before asserting generated schema records');
  if (validationResult.ok) {
    state.schemaNames = [...validationResult.value.schemas.keys()];
  }
});

Then(
  'generated record for schema {string} field {string} should equal {string}',
  (schemaName: string, fieldName: string, expectedValue: string) => {
    const schemaIndex = state.schemaNames.indexOf(schemaName);
    assert.notEqual(schemaIndex, -1, `Expected schema '${schemaName}' to exist in validated schema order`);
    assert.ok(state.generatedRecords[schemaIndex] !== undefined, `Expected a generated record for schema '${schemaName}'`);
    assert.equal(state.generatedRecords[schemaIndex]?.[fieldName], expectedValue);
  },
);
