import { Actor, Task, Interaction, type UsesAbilities } from '@serenity-js/core';
import { createGenerationMetadata } from '../../../src/common';
import { UseCsvAdapter } from '../abilities/UseCsvAdapter';
import { UseCsvContextLoader } from '../abilities/UseCsvContextLoader';
import { UseGenerateDataAPI } from '../abilities/UseGenerateDataAPI';

async function* arrayToAsyncIterable<T>(array: readonly T[]): AsyncIterable<T> {
  for (const item of array) {
    yield await Promise.resolve(item);
  }
}

export class WriteRecordsToCsv extends Task {
  private constructor(
    private readonly _filename: string,
    private readonly _delimiter?: string,
  ) {
    super(`Write records to CSV file "${_filename}"`);
  }

  public static file(filename: string): WriteRecordsToCsv {
    return new WriteRecordsToCsv(filename);
  }

  public withDelimiter(delimiter: string): WriteRecordsToCsv {
    return new WriteRecordsToCsv(this._filename, delimiter);
  }

  public async performAs(actor: Actor): Promise<void> {
    const csvAdapter = actor.abilityTo(UseCsvAdapter);
    const api = UseGenerateDataAPI.as(actor);
    const records = api.getRecords();
    const metadata = createGenerationMetadata({
      sourcePattern: this._filename,
      count: records.length,
      format: 'csv',
      lineageInputs: [
        {
          type: 'root-pattern',
          identifier: this._filename,
          content: JSON.stringify(records),
        },
      ],
    });

    await csvAdapter.writeToFile(arrayToAsyncIterable(records), this._filename, this._delimiter, metadata);
  }
}

export class StorePreparedCsvRecords {
  public static fromTable(tableRows: readonly Record<string, string>[]): Interaction {
    return Interaction.where(
      '#actor stores prepared CSV records',
      (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        const normalizedRecords = tableRows.map((row) => {
          const normalized: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            if (/^-?\d+$/.test(value)) {
              normalized[key] = Number(value);
            } else if (value === 'true') {
              normalized[key] = true;
            } else if (value === 'false') {
              normalized[key] = false;
            } else {
              normalized[key] = value.replace(/\\n/g, '\n');
            }
          }
          return normalized;
        });

        api.storeDSLSource('');
        api.getRecords().splice(0, api.getRecords().length, ...normalizedRecords);
      },
    );
  }
}

export class LoadGeneratedCsvOutput {
  public static now(): Interaction {
    return Interaction.where(
      '#actor loads the generated CSV output',
      async (actor: UsesAbilities) => {
        const csvAdapter = actor.abilityTo(UseCsvAdapter);
        const loader = actor.abilityTo(UseCsvContextLoader);
        await loader.load(csvAdapter.getLastOutputPath());
      },
    );
  }
}