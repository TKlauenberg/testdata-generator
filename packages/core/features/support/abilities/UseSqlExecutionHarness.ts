import { Ability } from '@serenity-js/core';
import { Database } from 'bun:sqlite';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteTableName(tableName: string): string {
  return tableName
    .split('.')
    .map((part) => quoteIdentifier(part))
    .join('.');
}

export class UseSqlExecutionHarness extends Ability {
  private _database: Database;
  private _lastTableName: string | undefined;
  private _lastRows: Array<Record<string, unknown>> = [];

  private constructor() {
    super();
    this._database = new Database(':memory:');
  }

  public static withInMemoryDatabase(): UseSqlExecutionHarness {
    return new UseSqlExecutionHarness();
  }

  public createTable(tableName: string, columnDefinitions: string): void {
    this._database.close();
    this._database = new Database(':memory:');
    this._database.exec(`CREATE TABLE ${quoteTableName(tableName)} (${columnDefinitions});`);
    this._lastTableName = tableName;
    this._lastRows = [];
  }

  public async executeFile(filePath: string): Promise<void> {
    if (!this._lastTableName) {
      throw new Error('No SQL table has been prepared yet');
    }

    const sql = await Bun.file(filePath).text();
    this._database.exec(sql);

    const rows = this._database
      .query(`SELECT * FROM ${quoteTableName(this._lastTableName)} ORDER BY rowid`)
      .all() as Array<Record<string, unknown>>;

    this._lastRows = rows;
  }

  public getRows(): readonly Record<string, unknown>[] {
    return this._lastRows;
  }
}