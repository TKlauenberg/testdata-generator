import type { CliOutputFormat, EffectiveSettingSources, LoadedEffectiveCliConfig, LoadedCliGlobalConfig, LoadedCliWorkspaceConfig } from './types';
export declare class CliConfigError extends Error {
    readonly exitCode: number;
    constructor(message: string, exitCode: number);
}
export declare function getSettingSources(effective: LoadedEffectiveCliConfig): EffectiveSettingSources;
export declare function loadGlobalConfig(options?: {
    readonly homeDirectory?: string;
}): Promise<LoadedCliGlobalConfig>;
export declare function findWorkspaceConfigPath(options?: {
    readonly currentDirectory?: string;
    readonly excludedConfigPaths?: readonly string[];
}): Promise<string | undefined>;
export declare function loadWorkspaceConfig(options?: {
    readonly currentDirectory?: string;
    readonly excludedConfigPaths?: readonly string[];
}): Promise<LoadedCliWorkspaceConfig | undefined>;
export declare function loadEffectiveConfig(options?: {
    readonly homeDirectory?: string;
    readonly currentDirectory?: string;
}): Promise<LoadedEffectiveCliConfig>;
export declare function validateOutputFormat(format: string, source: string): CliOutputFormat;
//# sourceMappingURL=configLoader.d.ts.map