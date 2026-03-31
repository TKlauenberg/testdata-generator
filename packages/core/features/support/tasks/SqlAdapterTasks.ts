import { Actor, Interaction, Task, type UsesAbilities } from '@serenity-js/core';
import type { SqlDialect } from '../../../src/adapters';
import { UseGenerateDataAPI } from '../abilities/UseGenerateDataAPI';
import { UseSqlAdapter } from '../abilities/UseSqlAdapter';
import { UseSqlExecutionHarness } from '../abilities/UseSqlExecutionHarness';

async function* arrayToAsyncIterable<T>(array: readonly T[]): AsyncIterable<T> {
  for (const item of array) {
    yield await Promise.resolve(item);
  }
}

function normalizeValue(value: string): unknown {
  if (value === 'null') {
    return null;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value.replace(/\\n/g, '\n');
}

export class WriteRecordsToSql extends Task {
  private constructor(
    private readonly _filename: string,
    private readonly _tableName: string,
    private readonly _dialect: SqlDialect,
    private readonly _batchSize?: number,
  ) {
    super(`Write records to SQL file "${_filename}"`);
  }

  public static file(filename: string): WriteRecordsToSql {
    return new WriteRecordsToSql(filename, '', 'postgres');
  }

  public forTable(tableName: string): WriteRecordsToSql {
    return new WriteRecordsToSql(this._filename, tableName, this._dialect, this._batchSize);
  }

  public usingDialect(dialect: SqlDialect): WriteRecordsToSql {
    return new WriteRecordsToSql(this._filename, this._tableName, dialect, this._batchSize);
  }

  public withBatchSize(batchSize: number): WriteRecordsToSql {
    return new WriteRecordsToSql(this._filename, this._tableName, this._dialect, batchSize);
  }

  public async performAs(actor: Actor): Promise<void> {
    if (this._tableName.trim().length === 0) {
      throw new Error('WriteRecordsToSql requires a target table name');
    }

    const api = UseGenerateDataAPI.as(actor);
    const sqlAdapter = actor.abilityTo(UseSqlAdapter);

    await sqlAdapter.writeToFile(
      arrayToAsyncIterable(api.getRecords()),
      this._filename,
      {
        tableName: this._tableName,
        dialect: this._dialect,
        batchSize: this._batchSize,
      },
    );
  }
}

export class StorePreparedSqlRecords {
  public static fromTable(tableRows: readonly Record<string, string>[]): Interaction {
    return Interaction.where(
      '#actor stores prepared SQL records',
      (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        const normalizedRecords = tableRows.map((row) => {
          const normalized: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(row)) {
            normalized[key] = normalizeValue(value);
          }

          return normalized;
        });

        api.storeDSLSource('');
        api.getRecords().splice(0, api.getRecords().length, ...normalizedRecords);
      },
    );
  }
}

export class PrepareSqlExecutionTable extends Task {
  private constructor(
    private readonly _tableName: string,
    private readonly _columnDefinitions: string,
  ) {
    super(`Prepare SQL execution table "${_tableName}"`);
  }

  public static named(tableName: string): PrepareSqlExecutionTable {
    return new PrepareSqlExecutionTable(tableName, '');
  }

  public withColumns(columnDefinitions: string): PrepareSqlExecutionTable {
    return new PrepareSqlExecutionTable(this._tableName, columnDefinitions.trim());
  }

  public performAs(actor: Actor): void {
    if (this._columnDefinitions.length === 0) {
      throw new Error('PrepareSqlExecutionTable requires at least one column definition');
    }

    actor.abilityTo(UseSqlExecutionHarness).createTable(this._tableName, this._columnDefinitions);
  }
}

export class ExecuteGeneratedSql {
  public static now(): Interaction {
    return Interaction.where(
      '#actor executes the generated SQL against the in-memory table',
      async (actor: UsesAbilities) => {
        const sqlAdapter = actor.abilityTo(UseSqlAdapter);
        const harness = actor.abilityTo(UseSqlExecutionHarness);

        await harness.executeFile(sqlAdapter.getLastOutputPath());
      },
    );
  }
}