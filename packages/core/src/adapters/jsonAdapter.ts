import type { IAdapter, AdapterMetadata, JsonAdapterOptions } from './types';
import { version } from '../version';

/**
 * JSON Output Adapter
 *
 * Converts streaming records to JSON format (array or line-delimited).
 * Writes incrementally to avoid memory issues with large datasets.
 */
export class JsonAdapter implements IAdapter {
  private readonly _outputPath: string;
  private readonly _format: 'array' | 'jsonl';
  private readonly _metadata: AdapterMetadata;

  /**
   * Create a new JsonAdapter
   *
   * @param options - Configuration options
   * @throws {Error} If outputPath is empty or invalid
   */
  constructor(options: JsonAdapterOptions) {
    // Validate outputPath (M2: Input validation)
    if (!options.outputPath || options.outputPath.trim().length === 0) {
      throw new Error('JsonAdapter: outputPath cannot be empty');
    }

    this._outputPath = options.outputPath;
    this._format = options.format ?? 'array';

    // Generate metadata with defaults (L2: Use version from index)
    this._metadata = {
      timestamp: new Date().toISOString(),
      version,
      ...options.metadata,
    };
  }

  /**
   * Write records to JSON output file
   *
   * CRITICAL: Writes incrementally without buffering all records in memory.
   * This maintains memory efficiency from the streaming generator.
   *
   * @param records - Streaming records from generator (AsyncIterable)
   */
  async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
    if (this._format === 'array') {
      await this._writeArrayFormat(records);
    } else {
      await this._writeJsonlFormat(records);
    }
  }

  /**
   * Write JSON array format: {"metadata": {...}, "data": [...]}
   *
   * Writes opening structure with metadata, then each record separated by commas,
   * then closing bracket. Records are written incrementally without buffering.
   *
   * @param records - Streaming records from generator
   */
  private async _writeArrayFormat(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
    const file = Bun.file(this._outputPath).writer();

    try {
      // Write opening structure with metadata
      file.write('{"metadata":');
      file.write(JSON.stringify(this._metadata));
      file.write(',"data":[');

      // Write records incrementally
      let isFirst = true;
      for await (const record of records) {
        if (!isFirst) {
          file.write(',');
        }
        file.write(JSON.stringify(record));
        isFirst = false;
      }

      // Write closing bracket
      file.write(']}');
    } finally {
      await file.end();
    }
  }

  /**
   * Write JSONL (line-delimited JSON) format
   *
   * First line contains metadata as {"_metadata": {...}}, then each record
   * is written as a separate line with no commas. Each line is valid JSON.
   *
   * Format:
   * ```jsonl
   * {"_metadata":{"timestamp":"...","version":"1.0.0"}}
   * {"id":1,"name":"John"}
   * {"id":2,"name":"Jane"}
   * ```
   *
   * @param records - Streaming records from generator
   */
  private async _writeJsonlFormat(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
    const file = Bun.file(this._outputPath).writer();

    try {
      // Write metadata as first line
      file.write(JSON.stringify({ _metadata: this._metadata }));
      file.write('\n');

      // Write each record as separate line
      for await (const record of records) {
        file.write(JSON.stringify(record));
        file.write('\n');
      }
    } finally {
      await file.end();
    }
  }
}
