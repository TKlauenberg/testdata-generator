import { Given, Then, When } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { validateSchema } from '../../src';
import type { Diagnostic } from '../../src';

interface ImportResolutionState {
  currentFile?: string;
  source?: string;
  workspaceRoot?: string;
  diagnostics: Diagnostic[];
  schemaNames: string[];
}

const state: ImportResolutionState = {
  diagnostics: [],
  schemaNames: [],
};

function resolveFixturePath(relativePath: string): string {
  return path.join(import.meta.dir, '../fixtures/imports', relativePath);
}

Given('import fixture {string} is loaded as the current schema file', async (fixturePath: string) => {
  const absolutePath = resolveFixturePath(fixturePath);
  state.currentFile = absolutePath;
  state.source = await fs.readFile(absolutePath, 'utf-8');
  state.diagnostics = [];
  state.schemaNames = [];
});

Given('import fixture workspace root {string}', (fixturePath: string) => {
  state.workspaceRoot = resolveFixturePath(fixturePath);
});

When('the import fixture is validated', () => {
  assert.ok(state.currentFile !== undefined, 'A current schema fixture must be loaded before validation');
  assert.ok(state.source !== undefined, 'A schema source fixture must be loaded before validation');

  const result = validateSchema(state.source, state.currentFile, {
    currentFile: state.currentFile,
    workspaceRoot: state.workspaceRoot,
  });

  if (result.ok) {
    state.diagnostics = [];
    state.schemaNames = [...result.value.schemas.keys()];
    return;
  }

  state.diagnostics = result.errors;
  state.schemaNames = [];
});

Then('import validation should succeed', () => {
  assert.equal(state.diagnostics.length, 0, `Expected import validation to succeed, but got ${state.diagnostics.length} diagnostics`);
});

Then('validated schemas should include {string}', (schemaName: string) => {
  assert.ok(state.schemaNames.includes(schemaName), `Expected validated schemas to include '${schemaName}'`);
});

Then('import validation should fail with diagnostic code {string}', (diagnosticCode: string) => {
  assert.ok(state.diagnostics.some((diagnostic) => diagnostic.code === diagnosticCode), `Expected diagnostics to contain code '${diagnosticCode}'`);
});