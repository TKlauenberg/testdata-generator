import type {
  GenerationMetadataFormat,
  GenerationMetadataLineageEntry,
  GenerationMetadataPlatformReserved,
} from '../common';

export interface ContextMetadata {
  readonly source: string;
  readonly format: 'json' | 'csv';
  readonly loadedAt: string;
  readonly recordCount: number;
  readonly tags: readonly string[];
  readonly generationFormat?: GenerationMetadataFormat;
  readonly timestamp?: string;
  readonly sourcePattern?: string;
  readonly version?: string;
  readonly seed?: number;
  readonly patternHash?: string;
  readonly lineage?: readonly GenerationMetadataLineageEntry[];
  readonly platformReserved?: GenerationMetadataPlatformReserved;
}

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type ContextRecord = { readonly [key: string]: JsonValue };

export interface ContextData {
  readonly records: readonly ContextRecord[];
  readonly metadata: ContextMetadata;
}

export interface SavedContextMetadata {
  readonly timestamp: string;
  readonly sourcePattern?: string;
  readonly format?: GenerationMetadataFormat;
  readonly count: number;
  readonly version: string;
  readonly tags: readonly string[];
  readonly seed?: number;
  readonly patternHash?: string;
  readonly lineage?: readonly GenerationMetadataLineageEntry[];
  readonly platformReserved?: GenerationMetadataPlatformReserved;
}

export interface SavedContextEnvelope {
  readonly metadata: SavedContextMetadata;
  readonly data: readonly ContextRecord[];
}

export type ContextCollectionInput =
  | readonly ContextRecord[]
  | ContextData
  | readonly ContextData[];

export type ContextCollections = {
  readonly [collectionName: string]: ContextCollectionInput;
};
