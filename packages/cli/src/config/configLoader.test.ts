import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { CliConfigError, loadGlobalConfig } from './configLoader';
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