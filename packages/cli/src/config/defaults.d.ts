import type { CliGlobalConfig } from './types';
export declare const GLOBAL_CONFIG_FILE_NAME = ".tdconfig.json";
export declare const BUILT_IN_CLI_CONFIG: CliGlobalConfig;
export declare function cloneBuiltInCliConfig(): CliGlobalConfig;
export declare function resolveGlobalConfigPath(homeDirectory?: string): string;
//# sourceMappingURL=defaults.d.ts.map