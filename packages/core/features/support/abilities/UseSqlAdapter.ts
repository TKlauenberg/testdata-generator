import { Ability } from '@serenity-js/core';
import * as path from 'node:path';
import { type AdapterMetadata, SqlAdapter, type SqlAdapterOptions } from '../../../src/adapters';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../../__test-output__');

export class UseSqlAdapter extends Ability {
  private _lastOutputPath: string | undefined;

  public static toWriteFiles(): UseSqlAdapter {
    return new UseSqlAdapter();
  }

  public async writeToFile(
    records: AsyncIterable<Record<string, unknown>>,
    filename: string,
    options: Omit<SqlAdapterOptions, 'outputPath'>,
    metadata?: AdapterMetadata,
  ): Promise<void> {
    const outputPath = path.join(TEST_OUTPUT_DIR, filename);
    this._lastOutputPath = outputPath;

    const adapter = new SqlAdapter({
      outputPath,
      metadata,
      ...options,
    });

    await adapter.write(records);
  }

  public getLastOutputPath(): string {
    if (!this._lastOutputPath) {
      throw new Error('No SQL file has been written yet');
    }

    return this._lastOutputPath;
  }
}
