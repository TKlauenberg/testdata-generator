import type { DefaultSpec, WorkspaceGeneratorSpec } from '@testdata-ai/core';

export type CliConfigSource = 'built-in' | 'global' | 'workspace';
export type CliConfigSection = 'defaults' | 'context' | 'generatorDefaults' | 'generators';

export type CliOutputFormat = 'json' | 'csv' | 'sql';

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
  readonly generators: readonly WorkspaceGeneratorSpec[];
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
  readonly generators?: unknown;
}

export interface CliConfigLayer<TSource extends CliConfigSource = CliConfigSource> {
  readonly path: string;
  readonly source: TSource;
  readonly config: CliGlobalConfig;
  readonly providedSections: readonly CliConfigSection[];
}

export type LoadedCliGlobalConfig = CliConfigLayer<'built-in' | 'global'>;

export type LoadedCliWorkspaceConfig = CliConfigLayer<'workspace'>;

export interface LoadedEffectiveCliConfig {
  readonly config: CliGlobalConfig;
  readonly layers: {
    readonly builtIn: CliConfigLayer<'built-in'>;
    readonly global: LoadedCliGlobalConfig;
    readonly workspace?: LoadedCliWorkspaceConfig;
  };
}

export interface EffectiveSettingSources {
  readonly defaults: CliConfigSource;
  readonly context: CliConfigSource;
  readonly generatorDefaults: CliConfigSource;
  readonly generators: CliConfigSource;
}