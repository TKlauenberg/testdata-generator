import * as fs from 'node:fs/promises';
import type { DefaultSpec, LiteralValue } from '@testdata-ai/core';
import { cloneBuiltInCliConfig, resolveGlobalConfigPath } from './defaults';
import type {
  CliConfigDefaults,
  CliGlobalConfig,
  CliOutputFormat,
  LoadedCliGlobalConfig,
  RawCliGlobalConfig,
} from './types';

const SUPPORTED_OUTPUT_FORMATS: readonly CliOutputFormat[] = ['json'];

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
    config: normalizeGlobalConfig(parsed, configPath),
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

function normalizeGlobalConfig(rawConfig: unknown, configPath: string): CliGlobalConfig {
  if (!isRecord(rawConfig)) {
    throw new CliConfigError(
      `Invalid global config '${configPath}': expected a JSON object at the top level`,
      1,
    );
  }

  const rawDefaults = readNestedRecord(rawConfig.defaults, `${configPath} defaults`);
  const rawContext = readNestedRecord(rawConfig.context, `${configPath} context`);
  const builtInConfig = cloneBuiltInCliConfig();

  const defaults: CliConfigDefaults = {
    count: readPositiveInteger(rawDefaults.count, 'defaults.count', builtInConfig.defaults.count),
    format: readOutputFormat(rawDefaults.format, 'defaults.format', builtInConfig.defaults.format),
  };

  return {
    defaults,
    context: {
      saveDirectory: readNonEmptyString(
        rawContext.saveDirectory,
        'context.saveDirectory',
        builtInConfig.context.saveDirectory,
      ),
    },
    generatorDefaults: readGeneratorDefaults(rawConfig.generatorDefaults, 'generatorDefaults'),
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