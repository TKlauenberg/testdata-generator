import type { DefaultSpec } from '@testdata-ai/core';

export type CliOutputFormat = 'json';

export interface CliConfigDefaults {
  readonly count: number;
  readonly format: CliOutputFormat;
}

export interface CliContextDefaults {
  readonly saveDirectory: string;
}

export interface CliGlobalConfig {
  readonly defaults: CliConfigDefaults;
  readonly context: CliContextDefaults;
  readonly generatorDefaults: readonly DefaultSpec[];
}

export interface RawCliConfigDefaults {
  readonly count?: unknown;
  readonly format?: unknown;
}

export interface RawCliContextDefaults {
  readonly saveDirectory?: unknown;
}

export interface RawCliGlobalConfig {
  readonly defaults?: RawCliConfigDefaults;
  readonly context?: RawCliContextDefaults;
  readonly generatorDefaults?: unknown;
}

export interface LoadedCliGlobalConfig {
  readonly path: string;
  readonly source: 'built-in' | 'global';
  readonly config: CliGlobalConfig;
}