import type { CsvAdapterOptions, IAdapter } from './types';

function serializeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCsvValue(value: string, delimiter: string): string {
  const shouldQuote = value.includes(delimiter)
    || value.includes('"')
    || value.includes('\n')
    || value.includes('\r');

  if (!shouldQuote) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

export class CsvAdapter implements IAdapter {
  private readonly _outputPath: string;
  private readonly _delimiter: string;

  constructor(options: CsvAdapterOptions) {
    if (!options.outputPath || options.outputPath.trim().length === 0) {
      throw new Error('CsvAdapter: outputPath cannot be empty');
    }

    this._outputPath = options.outputPath;
    this._delimiter = options.delimiter ?? ',';
  }

  async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
    await Bun.write(this._outputPath, '');
    const file = Bun.file(this._outputPath).writer();

    try {
      let headers: string[] | null = null;

      for await (const record of records) {
        if (headers === null) {
          const candidateHeaders = Object.keys(record);

          if (candidateHeaders.length === 0) {
            continue;
          }

          headers = candidateHeaders;

          file.write(headers.join(this._delimiter));
          file.write('\n');
        }

        const row = headers.map((header) => {
          const serialized = serializeCsvValue(record[header]);
          return escapeCsvValue(serialized, this._delimiter);
        });

        file.write(row.join(this._delimiter));
        file.write('\n');
      }
    } finally {
      await file.end();
    }
  }
}