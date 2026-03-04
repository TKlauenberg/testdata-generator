export interface ContextMetadata {
  readonly source: string;
  readonly format: 'json';
  readonly loadedAt: string;
  readonly recordCount: number;
}

export type ContextRecord = Readonly<Record<string, unknown>>;

export interface ContextData {
  readonly records: readonly ContextRecord[];
  readonly metadata: ContextMetadata;
}
