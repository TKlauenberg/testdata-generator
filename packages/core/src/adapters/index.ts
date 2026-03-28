/**
 * Output Adapters Module
 *
 * Provides adapters for converting streaming records to various output formats.
 */

export { JsonAdapter } from './jsonAdapter';
export { CsvAdapter } from './csvAdapter';
export type { IAdapter, AdapterMetadata, JsonAdapterOptions, CsvAdapterOptions } from './types';
