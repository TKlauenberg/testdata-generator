import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateData, validateSchema } from '@testdata-ai/core';
import {
  CliConfigError,
  findWorkspaceConfigPath,
  getSettingSources,
  loadEffectiveConfig,
  loadGlobalConfig,
} from './configLoader';
import { BUILT_IN_CLI_CONFIG, GLOBAL_CONFIG_FILE_NAME, resolveGlobalConfigPath } from './defaults';

const tempDirectories = new Set<string>();

async function createHomeDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-config-'));
  tempDirectories.add(directory);
  return directory;
}

async function writeGlobalConfig(homeDirectory: string, config: unknown): Promise<void> {
  await fs.writeFile(
    path.join(homeDirectory, GLOBAL_CONFIG_FILE_NAME),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
}

async function createWorkspaceDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-workspace-'));
  tempDirectories.add(directory);
  return directory;
}

async function writeWorkspaceConfig(
  workspaceDirectory: string,
  config: string | Record<string, unknown>,
): Promise<string> {
  const configPath = path.join(workspaceDirectory, GLOBAL_CONFIG_FILE_NAME);
  const content = typeof config === 'string'
    ? config
    : `${JSON.stringify(config, null, 2)}\n`;
  await fs.writeFile(configPath, content, 'utf-8');
  return configPath;
}

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

describe('CLI global config defaults', () => {
  test('resolves the user-level config path under the home directory', () => {
    expect(resolveGlobalConfigPath('/tmp/test-home')).toBe('/tmp/test-home/.tdconfig.json');
  });
});

describe('findWorkspaceConfigPath', () => {
  test('returns the nearest workspace config when multiple parent levels contain one', async () => {
    const workspaceDirectory = await createWorkspaceDirectory();
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa', 'suite');

    await fs.mkdir(path.join(workspaceDirectory, 'apps'), { recursive: true });
    await fs.mkdir(nestedDirectory, { recursive: true });
    await writeWorkspaceConfig(workspaceDirectory, { context: { saveDirectory: 'root-contexts' } });
    await writeWorkspaceConfig(path.join(workspaceDirectory, 'apps'), { context: { saveDirectory: 'apps-contexts' } });

    const discoveredPath = await findWorkspaceConfigPath({ currentDirectory: nestedDirectory });

    expect(discoveredPath).toBe(path.join(workspaceDirectory, 'apps', GLOBAL_CONFIG_FILE_NAME));
  });

  test('returns undefined when no workspace config exists in the directory chain', async () => {
    const workspaceDirectory = await createWorkspaceDirectory();
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa', 'suite');
    await fs.mkdir(nestedDirectory, { recursive: true });

    const discoveredPath = await findWorkspaceConfigPath({ currentDirectory: nestedDirectory });

    expect(discoveredPath).toBeUndefined();
  });
});

describe('loadGlobalConfig', () => {
  test('returns built-in defaults when no global config file exists', async () => {
    const homeDirectory = await createHomeDirectory();

    const loaded = await loadGlobalConfig({ homeDirectory });

    expect(loaded.source).toBe('built-in');
    expect(loaded.path).toBe(path.join(homeDirectory, GLOBAL_CONFIG_FILE_NAME));
    expect(loaded.config).toEqual(BUILT_IN_CLI_CONFIG);
  });

  test('loads and normalizes supported config fields', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 25,
        format: 'csv',
      },
      context: {
        saveDirectory: 'shared-contexts',
      },
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
            parameters: [
              {
                name: 'array',
                value: ['alpha', 'beta'],
              },
            ],
          },
        },
      ],
      generators: [
        {
          name: 'sharedEmail',
          template: '{{localPart}}@example.com',
          generators: {
            localPart: {
              name: 'firstName',
            },
          },
        },
      ],
    });

    const loaded = await loadGlobalConfig({ homeDirectory });

    expect(loaded.source).toBe('global');
    expect(loaded.config).toEqual({
      defaults: {
        count: 25,
        format: 'csv',
      },
      context: {
        saveDirectory: 'shared-contexts',
      },
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
            parameters: [
              {
                name: 'array',
                value: ['alpha', 'beta'],
              },
            ],
          },
        },
      ],
      generators: [
        {
          name: 'sharedEmail',
          definition: {
            type: 'template',
            template: '{{localPart}}@example.com',
            generators: {
              localPart: {
                name: 'firstName',
              },
            },
          },
        },
      ],
    });
  });

  test('accepts sql as a supported defaults.format value', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 10,
        format: 'sql',
      },
    });

    const loaded = await loadGlobalConfig({ homeDirectory });

    expect(loaded.config.defaults.format).toBe('sql');
  });

  test('fails clearly when the global config contains invalid JSON', async () => {
    const homeDirectory = await createHomeDirectory();
    await fs.writeFile(path.join(homeDirectory, GLOBAL_CONFIG_FILE_NAME), '{"defaults":', 'utf-8');

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected invalid JSON to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toMatchObject({
        name: 'CliConfigError',
        exitCode: 1,
      } satisfies Partial<CliConfigError>);
    }
  });

  test('rejects unsupported defaults.format values', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 5,
        format: 'xml',
      },
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected unsupported config values to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        "Invalid defaults.format: expected one of json, csv, sql, received 'xml'",
      );
    }
  });

  test('rejects invalid generator-default mappings', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
            parameters: [
              {
                name: 'array',
                value: [null],
              },
            ],
          },
        },
      ],
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected invalid generator-default mappings to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        'Invalid generatorDefaults[0].generator.parameters[0].value: expected a JSON literal value',
      );
    }
  });

  test('rejects duplicate shared generator names', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      generators: [
        {
          name: 'sharedEmail',
          template: '{{localPart}}@example.com',
          generators: {
            localPart: { name: 'firstName' },
          },
        },
        {
          name: 'sharedEmail',
          compose: [
            { literal: 'duplicate' },
          ],
        },
      ],
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected duplicate shared generators to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        "Invalid generators: duplicate workspace generator name 'sharedEmail'",
      );
    }
  });

  test('rejects shared generator names that collide with built-in generators', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      generators: [
        {
          name: 'pick',
          template: '{{value}}',
          generators: {
            value: { name: 'firstName' },
          },
        },
      ],
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected built-in generator name collisions to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        "Invalid generators: workspace generator 'pick' collides with built-in generator name",
      );
    }
  });

  test('rejects cyclic shared generator definitions', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      generators: [
        {
          name: 'alpha',
          compose: [
            { generator: { name: '@workspace.generators.beta' } },
          ],
        },
        {
          name: 'beta',
          compose: [
            { generator: { name: '@workspace.generators.alpha' } },
          ],
        },
      ],
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected cyclic shared generators to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        "Invalid generators: circular workspace generator definition detected at 'alpha'",
      );
    }
  });
});

describe('loadEffectiveConfig', () => {
  test('falls back to built-in defaults when neither global nor workspace config exists', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const loaded = await loadEffectiveConfig({
      homeDirectory,
      currentDirectory: workspaceDirectory,
    });

    expect(loaded.layers.global.source).toBe('built-in');
    expect(loaded.layers.workspace).toBeUndefined();
    expect(loaded.config).toEqual(BUILT_IN_CLI_CONFIG);
  });

  test('does not treat the user-level global config file as a workspace config', async () => {
    const homeDirectory = await createHomeDirectory();
    const nestedDirectory = path.join(homeDirectory, 'project', 'nested');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 7,
        format: 'json',
      },
    });

    const loaded = await loadEffectiveConfig({
      homeDirectory,
      currentDirectory: nestedDirectory,
    });

    expect(loaded.layers.global).toMatchObject({
      source: 'global',
      path: path.join(homeDirectory, GLOBAL_CONFIG_FILE_NAME),
    });
    expect(loaded.layers.workspace).toBeUndefined();
    expect(loaded.config.defaults).toEqual({
      count: 7,
      format: 'json',
    });
  });

  test('loads discovered workspace generators from fixture config for validation and generation', async () => {
    const homeDirectory = await createHomeDirectory();
    const fixtureProjectDirectory = path.resolve(
      import.meta.dir,
      '../../../core/features/fixtures/workspace-generators/project',
    );
    const schemaPath = path.join(fixtureProjectDirectory, 'apps', 'user.td');
    const source = await fs.readFile(schemaPath, 'utf-8');

    const loaded = await loadEffectiveConfig({
      homeDirectory,
      currentDirectory: path.dirname(schemaPath),
    });

    expect(loaded.layers.workspace?.path).toBe(
      path.join(fixtureProjectDirectory, GLOBAL_CONFIG_FILE_NAME),
    );

    const workspaceRoot = loaded.layers.workspace !== undefined
      ? path.dirname(loaded.layers.workspace.path)
      : undefined;

    const validationResult = validateSchema(source, schemaPath, {
      workspaceGenerators: loaded.config.generators,
      currentFile: schemaPath,
      workspaceRoot,
    });

    expect(validationResult.ok).toBe(true);

    const records = await Array.fromAsync(generateData(source, {
      count: 1,
      workspaceGenerators: loaded.config.generators,
      currentFile: schemaPath,
      workspaceRoot,
    }));

    expect(records).toHaveLength(1);
    expect(records[0]?.email).toBe('qa.team@example.com');
  });

  test('composes workspace over global over built-in defaults', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();
    const nestedDirectory = path.join(workspaceDirectory, 'nested', 'team');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 3,
        format: 'json',
      },
      context: {
        saveDirectory: 'global-contexts',
      },
    });
    await writeWorkspaceConfig(workspaceDirectory, {
      context: {
        saveDirectory: 'workspace-contexts',
      },
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
          },
        },
      ],
    });

    const loaded = await loadEffectiveConfig({
      homeDirectory,
      currentDirectory: nestedDirectory,
    });

    expect(loaded.layers.global.source).toBe('global');
    expect(loaded.layers.workspace).toMatchObject({
      source: 'workspace',
      path: path.join(workspaceDirectory, GLOBAL_CONFIG_FILE_NAME),
      providedSections: ['context', 'generatorDefaults'],
    });
    expect(loaded.config).toEqual({
      defaults: {
        count: 3,
        format: 'json',
      },
      context: {
        saveDirectory: 'workspace-contexts',
      },
      generatorDefaults: [
        {
          fieldType: 'string',
          generator: {
            name: 'pick',
          },
        },
      ],
      generators: [],
    });
  });

  test('keeps section overrides shallow when a higher-precedence config provides a section', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 7,
        format: 'json',
      },
    });
    await writeWorkspaceConfig(workspaceDirectory, {
      defaults: {},
    });

    const loaded = await loadEffectiveConfig({
      homeDirectory,
      currentDirectory: workspaceDirectory,
    });

    expect(loaded.config.defaults).toEqual(BUILT_IN_CLI_CONFIG.defaults);
  });

  test('fails clearly when a discovered workspace config contains invalid JSON', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();
    await writeWorkspaceConfig(workspaceDirectory, '{"defaults":');

    try {
      await loadEffectiveConfig({
        homeDirectory,
        currentDirectory: workspaceDirectory,
      });
      throw new Error('Expected invalid workspace JSON to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      if (!(error instanceof Error)) {
        throw error;
      }

      expect(error.message).toContain(
        `Invalid workspace config '${path.join(workspaceDirectory, GLOBAL_CONFIG_FILE_NAME)}': file must contain valid JSON`,
      );
    }
  });

  test('fails clearly when a discovered workspace config file cannot be read', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();
    const workspaceConfigPath = await writeWorkspaceConfig(workspaceDirectory, {
      context: {
        saveDirectory: 'workspace-contexts',
      },
    });

    await fs.chmod(workspaceConfigPath, 0o000);

    try {
      await loadEffectiveConfig({
        homeDirectory,
        currentDirectory: workspaceDirectory,
      });
      throw new Error('Expected an unreadable workspace config to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty(
        'message',
        `Permission denied reading workspace config '${workspaceConfigPath}'`,
      );
    } finally {
      await fs.chmod(workspaceConfigPath, 0o600);
    }
  });
});

describe('getSettingSources', () => {
  test('returns built-in for all sections when neither global nor workspace config exists', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });
    const sources = getSettingSources(effective);

    expect(sources.defaults).toBe('built-in');
    expect(sources.context).toBe('built-in');
    expect(sources.generatorDefaults).toBe('built-in');
    expect(sources.generators).toBe('built-in');
  });

  test('returns global for sections provided by global config only', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      defaults: { count: 5, format: 'json' },
      context: { saveDirectory: 'global-ctx' },
      generatorDefaults: [{ fieldType: 'string', generator: { name: 'pick' } }],
      generators: [
        {
          name: 'sharedEmail',
          template: '{{localPart}}@example.com',
          generators: { localPart: { name: 'firstName' } },
        },
      ],
    });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });
    const sources = getSettingSources(effective);

    expect(sources.defaults).toBe('global');
    expect(sources.context).toBe('global');
    expect(sources.generatorDefaults).toBe('global');
    expect(sources.generators).toBe('global');
  });

  test('returns workspace for sections provided by workspace config, built-in for rest', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeWorkspaceConfig(workspaceDirectory, { context: { saveDirectory: 'ws-ctx' } });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });
    const sources = getSettingSources(effective);

    expect(sources.defaults).toBe('built-in');
    expect(sources.context).toBe('workspace');
    expect(sources.generatorDefaults).toBe('built-in');
    expect(sources.generators).toBe('built-in');
  });

  test('workspace wins over global when both provide the same section', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      defaults: { count: 3, format: 'json' },
      context: { saveDirectory: 'global-ctx' },
    });
    await writeWorkspaceConfig(workspaceDirectory, {
      defaults: { count: 99, format: 'json' },
      generatorDefaults: [{ fieldType: 'string', generator: { name: 'pick' } }],
      generators: [
        {
          name: 'workspaceEmail',
          template: '{{localPart}}@workspace.example',
          generators: { localPart: { name: 'firstName' } },
        },
      ],
    });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });
    const sources = getSettingSources(effective);

    expect(sources.defaults).toBe('workspace');
    expect(sources.context).toBe('global');
    expect(sources.generatorDefaults).toBe('workspace');
    expect(sources.generators).toBe('workspace');
  });

  test('marks sections as built-in when global layer source is built-in (no file found)', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    // No config files written — global source will be 'built-in'
    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.layers.global.source).toBe('built-in');
    const sources = getSettingSources(effective);

    expect(sources.defaults).toBe('built-in');
    expect(sources.context).toBe('built-in');
    expect(sources.generatorDefaults).toBe('built-in');
    expect(sources.generators).toBe('built-in');
  });
});

describe('configuration section priority: defaults', () => {
  test('workspace defaults override global defaults', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, { defaults: { count: 3, format: 'json' } });
    await writeWorkspaceConfig(workspaceDirectory, { defaults: { count: 99, format: 'json' } });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.defaults.count).toBe(99);
    expect(getSettingSources(effective).defaults).toBe('workspace');
  });

  test('global defaults override built-in defaults when workspace has no defaults section', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, { defaults: { count: 42, format: 'json' } });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.defaults.count).toBe(42);
    expect(getSettingSources(effective).defaults).toBe('global');
  });

  test('built-in defaults apply when no config files exist', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.defaults.count).toBe(BUILT_IN_CLI_CONFIG.defaults.count);
    expect(effective.config.defaults.format).toBe(BUILT_IN_CLI_CONFIG.defaults.format);
    expect(getSettingSources(effective).defaults).toBe('built-in');
  });
});

describe('configuration section priority: context', () => {
  test('workspace context overrides global context', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, { context: { saveDirectory: 'global-ctx' } });
    await writeWorkspaceConfig(workspaceDirectory, { context: { saveDirectory: 'workspace-ctx' } });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.context.saveDirectory).toBe('workspace-ctx');
    expect(getSettingSources(effective).context).toBe('workspace');
  });

  test('global context overrides built-in context when workspace has no context section', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, { context: { saveDirectory: 'global-ctx' } });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.context.saveDirectory).toBe('global-ctx');
    expect(getSettingSources(effective).context).toBe('global');
  });

  test('built-in context applies when no config files exist', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.context.saveDirectory).toBe(BUILT_IN_CLI_CONFIG.context.saveDirectory);
    expect(getSettingSources(effective).context).toBe('built-in');
  });
});

describe('configuration section priority: generatorDefaults', () => {
  test('workspace generatorDefaults override global generatorDefaults', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      generatorDefaults: [{ fieldType: 'string', generator: { name: 'pick' } }],
    });
    await writeWorkspaceConfig(workspaceDirectory, {
      generatorDefaults: [{ fieldType: 'string', generator: { name: 'randomString' } }],
    });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.generatorDefaults).toHaveLength(1);
    expect(effective.config.generatorDefaults[0].generator.name).toBe('randomString');
    expect(getSettingSources(effective).generatorDefaults).toBe('workspace');
  });

  test('global generatorDefaults override built-in when workspace has no generatorDefaults section', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      generatorDefaults: [{ fieldType: 'string', generator: { name: 'pick' } }],
    });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.generatorDefaults).toHaveLength(1);
    expect(effective.config.generatorDefaults[0].generator.name).toBe('pick');
    expect(getSettingSources(effective).generatorDefaults).toBe('global');
  });

  test('built-in generatorDefaults (empty) apply when no config files exist', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.generatorDefaults).toHaveLength(0);
    expect(getSettingSources(effective).generatorDefaults).toBe('built-in');
  });
});

describe('configuration section priority: generators', () => {
  test('workspace generators override global generators', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    await writeGlobalConfig(homeDirectory, {
      generators: [
        {
          name: 'globalEmail',
          template: '{{localPart}}@global.example',
          generators: { localPart: { name: 'firstName' } },
        },
      ],
    });
    await writeWorkspaceConfig(workspaceDirectory, {
      generators: [
        {
          name: 'workspaceEmail',
          compose: [
            { literal: 'qa-' },
            { generator: { name: 'word' } },
          ],
        },
      ],
    });

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.generators).toHaveLength(1);
    expect(effective.config.generators[0]?.name).toBe('workspaceEmail');
    expect(getSettingSources(effective).generators).toBe('workspace');
  });

  test('built-in generators (empty) apply when no config files exist', async () => {
    const homeDirectory = await createHomeDirectory();
    const workspaceDirectory = await createWorkspaceDirectory();

    const effective = await loadEffectiveConfig({ homeDirectory, currentDirectory: workspaceDirectory });

    expect(effective.config.generators).toHaveLength(0);
    expect(getSettingSources(effective).generators).toBe('built-in');
  });
});