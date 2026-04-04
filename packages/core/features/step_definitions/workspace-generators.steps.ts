import { Given, Then, When } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createWorkspaceGeneratorReference, generateData, validateSchema } from '../../src';
import type { GeneratorSpec, LiteralValue, WorkspaceGeneratorCompositionPart, WorkspaceGeneratorSpec } from '../../src';

interface WorkspaceGeneratorState {
  currentFile?: string;
  source?: string;
  workspaceRoot?: string;
  resolvedGenerator?: string;
  validationErrors: readonly string[];
  generatedRecords: readonly Record<string, unknown>[];
}

const state: WorkspaceGeneratorState = {
  validationErrors: [],
  generatedRecords: [],
};

function resolveFixturePath(relativePath: string): string {
  return path.join(import.meta.dir, '../fixtures/workspace-generators', relativePath);
}

function normalizeFixtureGeneratorSpec(value: unknown): GeneratorSpec {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);

  const generator = value as { name?: unknown; parameters?: unknown };
  if (typeof generator.name !== 'string') {
    throw new Error('Fixture generator definition must include a string name');
  }
  const generatorName: string = generator.name;

  if (generatorName.startsWith('@workspace.generators.')) {
    return createWorkspaceGeneratorReference(generatorName.replace('@workspace.generators.', ''));
  }

  return {
    name: generatorName,
    parameters: Array.isArray(generator.parameters)
      ? generator.parameters.map((parameter) => {
        assert.equal(typeof parameter, 'object');
        assert.notEqual(parameter, null);
        const typedParameter = parameter as { name?: unknown; value?: unknown };
        if (typeof typedParameter.name !== 'string') {
          throw new Error('Fixture generator parameter must include a string name');
        }
        const parameterName: string = typedParameter.name;
        return {
          name: parameterName,
          value: typedParameter.value as LiteralValue,
        };
      })
      : undefined,
  };
}

function normalizeFixtureCompositionPart(value: unknown): WorkspaceGeneratorCompositionPart {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);

  const part = value as { literal?: unknown; generator?: unknown };
  if (typeof part.literal === 'string') {
    return {
      type: 'literal',
      value: part.literal,
    };
  }

  return {
    type: 'generator',
    generator: normalizeFixtureGeneratorSpec(part.generator),
  };
}

async function loadFixtureWorkspaceGenerators(workspaceRoot: string): Promise<readonly WorkspaceGeneratorSpec[]> {
  const configPath = path.join(workspaceRoot, '.tdconfig.json');
  const rawConfig = JSON.parse(await fs.readFile(configPath, 'utf-8')) as {
    generators?: Array<{
      name: string;
      template?: string;
      generators?: Record<string, unknown>;
      compose?: unknown[];
    }>;
  };

  return (rawConfig.generators ?? []).map((generator) => {
    if (typeof generator.template === 'string') {
      const slots = Object.fromEntries(
        Object.entries(generator.generators ?? {}).map(([slotName, value]) => [
          slotName,
          normalizeFixtureGeneratorSpec(value),
        ]),
      );

      return {
        name: generator.name,
        definition: {
          type: 'template',
          template: generator.template,
          generators: slots,
        },
      } satisfies WorkspaceGeneratorSpec;
    }

    return {
      name: generator.name,
      definition: {
        type: 'composition',
        compose: (generator.compose ?? []).map(normalizeFixtureCompositionPart),
      },
    } satisfies WorkspaceGeneratorSpec;
  });
}

Given('workspace generator fixture workspace root {string}', (fixturePath: string) => {
  state.workspaceRoot = resolveFixturePath(fixturePath);
  state.validationErrors = [];
  state.generatedRecords = [];
  state.resolvedGenerator = undefined;
});

Given('workspace generator fixture schema {string} is loaded', async (fixturePath: string) => {
  const absolutePath = state.workspaceRoot !== undefined
    ? path.join(state.workspaceRoot, fixturePath)
    : resolveFixturePath(fixturePath);
  state.currentFile = absolutePath;
  state.source = await fs.readFile(absolutePath, 'utf-8');
  state.validationErrors = [];
  state.generatedRecords = [];
  state.resolvedGenerator = undefined;
});

When('the workspace generator fixture is validated', async () => {
  assert.ok(state.currentFile !== undefined, 'A fixture schema file must be loaded before validation');
  assert.ok(state.source !== undefined, 'Fixture schema source must be loaded before validation');
  assert.ok(state.workspaceRoot !== undefined, 'A fixture workspace root must be loaded before validation');

  const workspaceGenerators = await loadFixtureWorkspaceGenerators(state.workspaceRoot);

  const result = validateSchema(state.source, state.currentFile, {
    workspaceGenerators,
    currentFile: state.currentFile,
    workspaceRoot: state.workspaceRoot,
  });

  if (!result.ok) {
    state.validationErrors = result.errors.map((error) => error.message);
    state.resolvedGenerator = undefined;
    return;
  }

  state.validationErrors = [];
});

Then('workspace generator validation should succeed', () => {
  assert.equal(state.validationErrors.length, 0, `Expected validation to succeed, but got: ${state.validationErrors.join('; ')}`);
});

Then('schema {string} field {string} should resolve generator {string}', async (schemaName: string, fieldName: string, expectedGenerator: string) => {
  assert.ok(state.currentFile !== undefined, 'A fixture schema file must be loaded before checking resolved generators');
  assert.ok(state.source !== undefined, 'Fixture schema source must be loaded before checking resolved generators');
  assert.ok(state.workspaceRoot !== undefined, 'A fixture workspace root must be loaded before checking resolved generators');

  const workspaceGenerators = await loadFixtureWorkspaceGenerators(state.workspaceRoot);
  const result = validateSchema(state.source, state.currentFile, {
    workspaceGenerators,
    currentFile: state.currentFile,
    workspaceRoot: state.workspaceRoot,
  });

  assert.equal(result.ok, true, 'Validation must succeed before checking resolved generators');
  if (result.ok) {
    const resolvedGenerator = result.value.schemas.get(schemaName)?.fields.find((field) => field.node.name === fieldName)?.resolvedGenerator;
    assert.equal(resolvedGenerator, expectedGenerator);
  }
});

When('records are generated from the workspace generator fixture', async () => {
  assert.ok(state.currentFile !== undefined, 'A fixture schema file must be loaded before generation');
  assert.ok(state.source !== undefined, 'Fixture schema source must be loaded before generation');
  assert.ok(state.workspaceRoot !== undefined, 'A fixture workspace root must be loaded before generation');

  const workspaceGenerators = await loadFixtureWorkspaceGenerators(state.workspaceRoot);

  state.generatedRecords = await Array.fromAsync(generateData(state.source, {
    count: 1,
    workspaceGenerators,
    currentFile: state.currentFile,
    workspaceRoot: state.workspaceRoot,
  }));
});

Then('generated record field {string} should equal {string}', (fieldName: string, expectedValue: string) => {
  assert.equal(state.generatedRecords.length, 1, 'Expected exactly one generated record');
  assert.equal(state.generatedRecords[0]?.[fieldName], expectedValue);
});