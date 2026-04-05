import type { GenerationMetadata } from '../common';

/**
 * Adapter Interface
 *
 * Base interface for all output format adapters (JSON, CSV, SQL, etc.)
 * Adapters consume streaming records and write them to output files.
 */
export interface IAdapter {
  /**
   * Write records to output destination
   *
   * @param records - Streaming records from generator (AsyncIterable)
   * @returns Promise that resolves when all records are written
   */
  write(records: AsyncIterable<Record<string, unknown>>): Promise<void>;
}

export type AdapterMetadata = GenerationMetadata;

/**
 * Configuration options for JsonAdapter
 */
export interface JsonAdapterOptions {
  /** Output file path */
  readonly outputPath: string;

  /** Output format: 'array' (default) or 'jsonl' (line-delimited) */
  readonly format?: 'array' | 'jsonl';

  /** Optional metadata to include in output */
  readonly metadata?: Partial<AdapterMetadata>;
}

/**
 * Configuration options for CsvAdapter
 */
export interface CsvAdapterOptions {
  /** Output file path */
  readonly outputPath: string;

  /** Field delimiter, defaults to comma */
  readonly delimiter?: string;

  /** Optional metadata to include in output */
  readonly metadata?: Partial<AdapterMetadata>;
}

/** Supported SQL dialects for identifier quoting */
export type SqlDialect = 'postgres' | 'mysql';

/**
 * Configuration options for SqlAdapter
 */
export interface SqlAdapterOptions {
  /** Output file path */
  readonly outputPath: string;

  /** Target table name */
  readonly tableName: string;

  /** SQL dialect for identifier quoting */
  readonly dialect?: SqlDialect;

  /** Maximum rows per INSERT statement */
  readonly batchSize?: number;

  /** Optional metadata to include in output */
  readonly metadata?: Partial<AdapterMetadata>;
}
