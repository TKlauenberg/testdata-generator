import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DefaultSpec, LiteralValue } from '@testdata-ai/core';
import { cloneBuiltInCliConfig, GLOBAL_CONFIG_FILE_NAME, resolveGlobalConfigPath } from './defaults';
import type {
  CliConfigLayer,
  CliConfigDefaults,
  CliConfigSection,
  CliGlobalConfig,
  CliOutputFormat,
  LoadedEffectiveCliConfig,
  LoadedCliGlobalConfig,
  LoadedCliWorkspaceConfig,
  RawCliGlobalConfig,
} from './types';

const SUPPORTED_OUTPUT_FORMATS: readonly CliOutputFormat[] = ['json'];
const CONFIG_SECTIONS: readonly CliConfigSection[] = ['defaults', 'context', 'generatorDefaults'];

export class CliConfigError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'CliConfigError';
    this.exitCode = exitCode;
  }
}

export async function loadGlobalConfig(
  options: { readonly homeDirectory?: string } = {},
): Promise<LoadedCliGlobalConfig> {
  let configPath: string;
  try {
    configPath = resolveGlobalConfigPath(options.homeDirectory);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(`Error resolving global config path: ${message}`, 3);
  }

  let rawContent: string;
  try {
    rawContent = await fs.readFile(configPath, 'utf-8');
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return {
        path: configPath,
        source: 'built-in',
        config: cloneBuiltInCliConfig(),
        providedSections: [],
      };
    }

    if (isNodeError(error) && error.code === 'EACCES') {
      throw new CliConfigError(`Permission denied reading global config '${configPath}'`, 3);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(`Error reading global config '${configPath}': ${message}`, 3);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent) as RawCliGlobalConfig;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(
      `Invalid global config '${configPath}': file must contain valid JSON (${message})`,
      1,
    );
  }

  return {
    path: configPath,
    source: 'global',
    ...normalizeCliConfig(parsed, configPath, 'global'),
  };
}

export async function findWorkspaceConfigPath(
  options: { readonly currentDirectory?: string } = {},
): Promise<string | undefined> {
  let currentDirectory: string;
  try {
    currentDirectory = path.resolve(options.currentDirectory ?? process.cwd());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(`Error resolving workspace config search path: ${message}`, 3);
  }

  let searchDirectory = currentDirectory;
  while (true) {
    const configPath = path.join(searchDirectory, GLOBAL_CONFIG_FILE_NAME);

    try {
      const stats = await fs.stat(configPath);
      if (stats.isFile()) {
        return configPath;
      }
    } catch (error: unknown) {
      if (!isNodeError(error) || (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) {
        if (isNodeError(error) && error.code === 'EACCES') {
          throw new CliConfigError(`Permission denied discovering workspace config '${configPath}'`, 3);
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new CliConfigError(`Error discovering workspace config '${configPath}': ${message}`, 3);
      }
    }

    const parentDirectory = path.dirname(searchDirectory);
    if (parentDirectory === searchDirectory) {
      return undefined;
    }

    searchDirectory = parentDirectory;
  }
}

export async function loadWorkspaceConfig(
  options: { readonly currentDirectory?: string } = {},
): Promise<LoadedCliWorkspaceConfig | undefined> {
  const configPath = await findWorkspaceConfigPath(options);
  if (configPath === undefined) {
    return undefined;
  }

  return loadNamedConfig(configPath, 'workspace');
}

export async function loadEffectiveConfig(
  options: { readonly homeDirectory?: string; readonly currentDirectory?: string } = {},
): Promise<LoadedEffectiveCliConfig> {
  const builtIn = createBuiltInLayer();
  const global = await loadGlobalConfig({ homeDirectory: options.homeDirectory });
  const workspace = await loadWorkspaceConfig({ currentDirectory: options.currentDirectory });

  return {
    config: composeEffectiveConfig(global, workspace),
    layers: {
      builtIn,
      global,
      workspace,
    },
  };
}

export function validateOutputFormat(format: string, source: string): CliOutputFormat {
  if (!SUPPORTED_OUTPUT_FORMATS.includes(format as CliOutputFormat)) {
    throw new CliConfigError(
      `Invalid ${source}: expected one of ${SUPPORTED_OUTPUT_FORMATS.join(', ')}, received '${format}'`,
      1,
    );
  }

  return format as CliOutputFormat;
}

function normalizeCliConfig(
  rawConfig: unknown,
  configPath: string,
  configLabel: 'global' | 'workspace',
): Pick<CliConfigLayer, 'config' | 'providedSections'> {
  if (!isRecord(rawConfig)) {
    throw new CliConfigError(
      `Invalid ${configLabel} config '${configPath}': expected a JSON object at the top level`,
      1,
    );
  }

  const builtInConfig = cloneBuiltInCliConfig();
  const providedSections: CliConfigSection[] = [];

  const defaults: CliConfigDefaults = rawConfig.defaults === undefined
    ? builtInConfig.defaults
    : (() => {
      providedSections.push('defaults');
      const rawDefaults = readNestedRecord(rawConfig.defaults, `${configPath} defaults`);
      return {
        count: readPositiveInteger(rawDefaults.count, 'defaults.count', builtInConfig.defaults.count),
        format: readOutputFormat(rawDefaults.format, 'defaults.format', builtInConfig.defaults.format),
      };
    })();

  const context = rawConfig.context === undefined
    ? builtInConfig.context
    : (() => {
      providedSections.push('context');
      const rawContext = readNestedRecord(rawConfig.context, `${configPath} context`);
      return {
        saveDirectory: readNonEmptyString(
          rawContext.saveDirectory,
          'context.saveDirectory',
          builtInConfig.context.saveDirectory,
        ),
      };
    })();

  const generatorDefaults = rawConfig.generatorDefaults === undefined
    ? builtInConfig.generatorDefaults
    : (() => {
      providedSections.push('generatorDefaults');
      return readGeneratorDefaults(rawConfig.generatorDefaults, 'generatorDefaults');
    })();

  return {
    config: {
      defaults,
      context,
      generatorDefaults,
    },
    providedSections,
  };
}

async function loadNamedConfig(
  configPath: string,
  configLabel: 'global',
): Promise<CliConfigLayer<'global'>>;
async function loadNamedConfig(
  configPath: string,
  configLabel: 'workspace',
): Promise<LoadedCliWorkspaceConfig>;
async function loadNamedConfig(
  configPath: string,
  configLabel: 'global' | 'workspace',
): Promise<LoadedCliGlobalConfig | LoadedCliWorkspaceConfig> {
  let rawContent: string;
  try {
    rawContent = await fs.readFile(configPath, 'utf-8');
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'EACCES') {
      throw new CliConfigError(`Permission denied reading ${configLabel} config '${configPath}'`, 3);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(`Error reading ${configLabel} config '${configPath}': ${message}`, 3);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent) as RawCliGlobalConfig;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliConfigError(
      `Invalid ${configLabel} config '${configPath}': file must contain valid JSON (${message})`,
      1,
    );
  }

  return {
    path: configPath,
    source: configLabel,
    ...normalizeCliConfig(parsed, configPath, configLabel),
  };
}

function composeEffectiveConfig(
  globalConfig: LoadedCliGlobalConfig,
  workspaceConfig?: LoadedCliWorkspaceConfig,
): CliGlobalConfig {
  let effective = cloneBuiltInCliConfig();
  effective = applyLayer(effective, globalConfig);

  if (workspaceConfig !== undefined) {
    effective = applyLayer(effective, workspaceConfig);
  }

  return effective;
}

function applyLayer(baseConfig: CliGlobalConfig, layer: Pick<CliConfigLayer, 'config' | 'providedSections'>): CliGlobalConfig {
  let nextConfig = baseConfig;

  if (layer.providedSections.includes('defaults')) {
    nextConfig = {
      ...nextConfig,
      defaults: {
        ...layer.config.defaults,
      },
    };
  }

  if (layer.providedSections.includes('context')) {
    nextConfig = {
      ...nextConfig,
      context: {
        ...layer.config.context,
      },
    };
  }

  if (layer.providedSections.includes('generatorDefaults')) {
    nextConfig = {
      ...nextConfig,
      generatorDefaults: [...layer.config.generatorDefaults],
    };
  }

  return nextConfig;
}

function createBuiltInLayer(): CliConfigLayer<'built-in'> {
  return {
    path: '<built-in>',
    source: 'built-in',
    config: cloneBuiltInCliConfig(),
    providedSections: CONFIG_SECTIONS,
  };
}

function readNestedRecord(value: unknown, propertyName: string): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new CliConfigError(`Invalid ${propertyName}: expected an object`, 1);
  }

  return value;
}

function readPositiveInteger(value: unknown, propertyName: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new CliConfigError(`Invalid ${propertyName}: expected a positive integer`, 1);
  }

  return value;
}

function readOutputFormat(
  value: unknown,
  propertyName: string,
  fallback: CliOutputFormat,
): CliOutputFormat {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new CliConfigError(`Invalid ${propertyName}: expected a string`, 1);
  }

  return validateOutputFormat(value, propertyName);
}

function readNonEmptyString(value: unknown, propertyName: string, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CliConfigError(`Invalid ${propertyName}: expected a non-empty string`, 1);
  }

  return value;
}

function readGeneratorDefaults(value: unknown, propertyName: string): readonly DefaultSpec[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new CliConfigError(`Invalid ${propertyName}: expected an array`, 1);
  }

  return value.map((entry, index) => normalizeDefaultSpec(entry, `${propertyName}[${index}]`));
}

function normalizeDefaultSpec(value: unknown, propertyName: string): DefaultSpec {
  if (!isRecord(value)) {
    throw new CliConfigError(`Invalid ${propertyName}: expected an object`, 1);
  }

  const fieldType = readNonEmptyString(value.fieldType, `${propertyName}.fieldType`, '');
  const generator = normalizeGeneratorSpec(value.generator, `${propertyName}.generator`);

  if (fieldType.length === 0) {
    throw new CliConfigError(`Invalid ${propertyName}.fieldType: expected a non-empty string`, 1);
  }

  return {
    fieldType,
    generator,
  };
}

function normalizeGeneratorSpec(
  value: unknown,
  propertyName: string,
): DefaultSpec['generator'] {
  if (!isRecord(value)) {
    throw new CliConfigError(`Invalid ${propertyName}: expected an object`, 1);
  }

  const name = readNonEmptyString(value.name, `${propertyName}.name`, '');
  const parametersValue = value.parameters;

  if (name.length === 0) {
    throw new CliConfigError(`Invalid ${propertyName}.name: expected a non-empty string`, 1);
  }

  if (parametersValue === undefined) {
    return { name };
  }

  if (!Array.isArray(parametersValue)) {
    throw new CliConfigError(`Invalid ${propertyName}.parameters: expected an array`, 1);
  }

  return {
    name,
    parameters: parametersValue.map((parameter, index) => normalizeGeneratorParameter(parameter, `${propertyName}.parameters[${index}]`)),
  };
}

function normalizeGeneratorParameter(
  value: unknown,
  propertyName: string,
): NonNullable<DefaultSpec['generator']['parameters']>[number] {
  if (!isRecord(value)) {
    throw new CliConfigError(`Invalid ${propertyName}: expected an object`, 1);
  }

  const name = readNonEmptyString(value.name, `${propertyName}.name`, '');
  if (name.length === 0) {
    throw new CliConfigError(`Invalid ${propertyName}.name: expected a non-empty string`, 1);
  }

  if (!isLiteralValue(value.value)) {
    throw new CliConfigError(`Invalid ${propertyName}.value: expected a JSON literal value`, 1);
  }

  return {
    name,
    value: value.value,
  };
}

function isLiteralValue(value: unknown): value is LiteralValue {
  if (value === null) {
    return false;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isLiteralValue(entry));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => isLiteralValue(entry));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}