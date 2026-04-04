import { Given, Then, When } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createWorkspaceGeneratorReference, validateSchema } from '../../src';
import type {
  Diagnostic,
  GeneratorSpec,
  LiteralValue,
  WorkspaceGeneratorCompositionPart,
  WorkspaceGeneratorSpec,
} from '../../src';

interface ReferenceValidationState {
  currentFile?: string;
  source?: string;
  workspaceRoot?: string;
  availableContextCollections: string[];
  diagnostics: Diagnostic[];
}

const state: ReferenceValidationState = {
  availableContextCollections: [],
  diagnostics: [],
};

function resolveFixturePath(relativePath: string): string {
  return path.join(import.meta.dir, '../fixtures', relativePath);
}

function normalizeFixtureGeneratorSpec(value: unknown): GeneratorSpec {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);

  const generator = value as { name?: unknown; parameters?: unknown };
  if (typeof generator.name !== 'string') {
    throw new Error('Fixture generator definition must include a string name');
  }

  if (generator.name.startsWith('@workspace.generators.')) {
    return createWorkspaceGeneratorReference(generator.name.replace('@workspace.generators.', ''));
  }

  return {
    name: generator.name,
    parameters: Array.isArray(generator.parameters)
      ? generator.parameters.map((parameter) => {
        assert.equal(typeof parameter, 'object');
        assert.notEqual(parameter, null);
        const typedParameter = parameter as { name?: unknown; value?: unknown };
        if (typeof typedParameter.name !== 'string') {
          throw new Error('Fixture generator parameter must include a string name');
        }

        return {
          name: typedParameter.name,
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

Given('reference validation fixture workspace root {string}', (fixturePath: string) => {
  state.workspaceRoot = resolveFixturePath(fixturePath);
  state.diagnostics = [];
  state.availableContextCollections = [];
});

Given('reference validation fixture {string} is loaded as the current schema file', async (fixturePath: string) => {
  if (fixturePath.startsWith('reference-validation/')) {
    state.workspaceRoot = undefined;
  }

  const absolutePath = state.workspaceRoot !== undefined && !fixturePath.startsWith('reference-validation/')
    ? path.join(state.workspaceRoot, fixturePath)
    : resolveFixturePath(fixturePath);
  state.currentFile = absolutePath;
  state.source = await fs.readFile(absolutePath, 'utf-8');
  state.diagnostics = [];
  state.availableContextCollections = [];
});

Given('available context collections are:', (table: { raw: () => string[][] }) => {
  state.availableContextCollections = table.raw().flat().filter((value) => value.length > 0);
});

When('the reference validation fixture is validated', async () => {
  assert.ok(state.currentFile !== undefined, 'A fixture file must be loaded before validation');
  assert.ok(state.source !== undefined, 'Fixture source must be loaded before validation');

  const workspaceGenerators = state.workspaceRoot !== undefined
    && await hasWorkspaceGeneratorConfig(state.workspaceRoot)
      ? await loadFixtureWorkspaceGenerators(state.workspaceRoot)
      : undefined;

  const result = validateSchema(state.source, state.currentFile, {
    currentFile: state.currentFile,
    workspaceRoot: state.workspaceRoot,
    availableContextCollections: state.availableContextCollections,
    workspaceGenerators,
  });

  state.diagnostics = result.ok ? [] : result.errors;
});

async function hasWorkspaceGeneratorConfig(workspaceRoot: string): Promise<boolean> {
  try {
    await fs.access(path.join(workspaceRoot, '.tdconfig.json'));
    return true;
  } catch {
    return false;
  }
}

Then('reference validation should fail with diagnostic code {string}', (diagnosticCode: string) => {
  assert.ok(
    state.diagnostics.some((diagnostic) => diagnostic.code === diagnosticCode),
    `Expected diagnostics to contain code '${diagnosticCode}', received: ${state.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}`,
  );
});

Then('the reference validation suggestion should contain {string}', (substring: string) => {
  assert.ok(
    state.diagnostics.some((diagnostic) => diagnostic.suggestion?.includes(substring) === true),
    `Expected at least one diagnostic suggestion to contain '${substring}', received: ${state.diagnostics.map((diagnostic) => diagnostic.suggestion ?? '<none>').join('; ')}`,
  );
});