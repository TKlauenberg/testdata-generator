import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CliConfigError,
  findWorkspaceConfigPath,
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
        format: 'json',
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
    });

    const loaded = await loadGlobalConfig({ homeDirectory });

    expect(loaded.source).toBe('global');
    expect(loaded.config).toEqual({
      defaults: {
        count: 25,
        format: 'json',
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
    });
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

  test('rejects unsupported config values', async () => {
    const homeDirectory = await createHomeDirectory();
    await writeGlobalConfig(homeDirectory, {
      defaults: {
        count: 0,
        format: 'csv',
      },
    });

    try {
      await loadGlobalConfig({ homeDirectory });
      throw new Error('Expected unsupported config values to throw a CliConfigError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliConfigError);
      expect(error).toHaveProperty('message', 'Invalid defaults.count: expected a positive integer');
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