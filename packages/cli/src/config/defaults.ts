import { homedir } from 'node:os';
import * as path from 'node:path';
import type { CliGlobalConfig } from './types';

export const GLOBAL_CONFIG_FILE_NAME = '.tdconfig.json';

export const BUILT_IN_CLI_CONFIG: CliGlobalConfig = {
  defaults: {
    count: 10,
    format: 'json',
  },
  context: {
    saveDirectory: './contexts',
  },
  history: {
    logDirectory: '.',
  },
  generatorDefaults: [],
  generators: [],
};

export function cloneBuiltInCliConfig(): CliGlobalConfig {
  return {
    defaults: {
      ...BUILT_IN_CLI_CONFIG.defaults,
    },
    context: {
      ...BUILT_IN_CLI_CONFIG.context,
    },
    history: {
      ...BUILT_IN_CLI_CONFIG.history,
    },
    generatorDefaults: [...BUILT_IN_CLI_CONFIG.generatorDefaults],
    generators: [...BUILT_IN_CLI_CONFIG.generators],
  };
}

export function resolveGlobalConfigPath(homeDirectory: string = homedir()): string {
  const normalizedHomeDirectory = homeDirectory.trim();

  if (normalizedHomeDirectory.length === 0) {
    throw new Error('Unable to resolve the user home directory for global config loading');
  }

  return path.join(normalizedHomeDirectory, GLOBAL_CONFIG_FILE_NAME);
}