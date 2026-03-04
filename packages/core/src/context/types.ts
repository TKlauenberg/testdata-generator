export interface ContextMetadata {
  readonly source: string;
  readonly format: 'json' | 'csv';
  readonly loadedAt: string;
  readonly recordCount: number;
}

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type ContextRecord = { readonly [key: string]: JsonValue };

export interface ContextData {
  readonly records: readonly ContextRecord[];
  readonly metadata: ContextMetadata;
}
