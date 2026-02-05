/**
 * JSON Adapter Ability
 *
 * Allows actors to write generated records to JSON files.
 * Supports both array format and JSONL format.
 */

import { Ability } from '@serenity-js/core';
import { JsonAdapter, type JsonAdapterOptions } from '../../../src/adapters';
import * as path from 'node:path';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../../__test-output__');

/**
 * Ability to write records to JSON files using JsonAdapter
 */
export class UseJsonAdapter extends Ability {
  private _lastOutputPath: string | undefined;

  /**
   * Create the ability to use JSON adapter
   */
  static toWriteFiles(): UseJsonAdapter {
    return new UseJsonAdapter();
  }

  /**
   * Write records to JSON file
   *
   * @param records - Streaming records from generator
   * @param filename - Output filename
   * @param format - 'array' or 'jsonl'
   * @param metadata - Optional metadata to include
   */
  async writeToFile(
    records: AsyncIterable<Record<string, unknown>>,
    filename: string,
    format: 'array' | 'jsonl' = 'array',
    metadata?: Partial<{ sourcePattern: string; count: number; seed: number }>,
  ): Promise<void> {
    const outputPath = path.join(TEST_OUTPUT_DIR, filename);
    this._lastOutputPath = outputPath;

    const options: JsonAdapterOptions = {
      outputPath,
      format,
      metadata,
    };

    const adapter = new JsonAdapter(options);
    await adapter.write(records);
  }

  /**
   * Get the last output file path
   */
  getLastOutputPath(): string {
    if (!this._lastOutputPath) {
      throw new Error('No JSON file has been written yet');
    }
    return this._lastOutputPath;
  }
}
