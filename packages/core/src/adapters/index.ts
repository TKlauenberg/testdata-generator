/**
 * Output Adapters Module
 *
 * Provides adapters for converting streaming records to various output formats.
 */

export { JsonAdapter } from './jsonAdapter';
export { CsvAdapter } from './csvAdapter';
export { SqlAdapter } from './sqlAdapter';
export type {
	IAdapter,
	AdapterMetadata,
	JsonAdapterOptions,
	CsvAdapterOptions,
	SqlAdapterOptions,
	SqlDialect,
} from './types';
