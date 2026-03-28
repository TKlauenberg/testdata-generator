import { Ability } from '@serenity-js/core';
import * as path from 'node:path';
import { CsvAdapter, type CsvAdapterOptions } from '../../../src/adapters';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../../__test-output__');

export class UseCsvAdapter extends Ability {
  private _lastOutputPath: string | undefined;

  public static toWriteFiles(): UseCsvAdapter {
    return new UseCsvAdapter();
  }

  public async writeToFile(
    records: AsyncIterable<Record<string, unknown>>,
    filename: string,
    delimiter?: string,
  ): Promise<void> {
    const outputPath = path.join(TEST_OUTPUT_DIR, filename);
    this._lastOutputPath = outputPath;

    const options: CsvAdapterOptions = delimiter === undefined
      ? { outputPath }
      : { outputPath, delimiter };

    const adapter = new CsvAdapter(options);
    await adapter.write(records);
  }

  public getLastOutputPath(): string {
    if (!this._lastOutputPath) {
      throw new Error('No CSV file has been written yet');
    }

    return this._lastOutputPath;
  }
}