import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { expect } from 'bun:test';
import type { SqlDialect } from '../../src/adapters';
import {
  ExecuteGeneratedSql,
  PrepareSqlExecutionTable,
  StorePreparedSqlRecords,
  WriteRecordsToSql,
} from '../support/tasks/SqlAdapterTasks';
import {
  ExecutedSqlFieldValue,
  ExecutedSqlRowCount,
  GeneratedSqlOutput,
} from '../support/questions/SqlAdapterQuestions';

function toSqlDialect(dialect: string): SqlDialect {
  if (dialect !== 'postgres' && dialect !== 'mysql') {
    throw new Error(`Unsupported SQL dialect: ${dialect}`);
  }

  return dialect;
}

Given('{word} has SQL-ready generated records:', async (actorName: string, table: DataTable) => {
  await actorCalled(actorName).attemptsTo(StorePreparedSqlRecords.fromTable(table.hashes()));
});

When(
  '{word} writes the records to SQL file {string} for table {string} using {word} dialect',
  async (actorName: string, filename: string, tableName: string, dialect: string) => {
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToSql.file(filename).forTable(tableName).usingDialect(toSqlDialect(dialect)),
    );
  },
);

When(
  '{word} writes the prepared records to SQL file {string} for table {string} using {word} dialect and batch size {int}',
  async (
    actorName: string,
    filename: string,
    tableName: string,
    dialect: string,
    batchSize: number,
  ) => {
    await actorCalled(actorName).attemptsTo(
      WriteRecordsToSql.file(filename)
        .forTable(tableName)
        .usingDialect(toSqlDialect(dialect))
        .withBatchSize(batchSize),
    );
  },
);

When(
  '{word} prepares an in-memory SQL table {string} with columns:',
  async (actorName: string, tableName: string, docString: string) => {
    await actorCalled(actorName).attemptsTo(
      PrepareSqlExecutionTable.named(tableName).withColumns(docString),
    );
  },
);

When('{word} executes the generated SQL against the in-memory table', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(ExecuteGeneratedSql.now());
});

Then('the generated SQL should contain {string}', async (fragment: string) => {
  const sql = await actorCalled('QATester').answer(GeneratedSqlOutput());
  expect(sql).toContain(fragment);
});

Then('the executed SQL should insert {int} rows', async (count: number) => {
  await actorCalled('QATester').attemptsTo(Ensure.that(ExecutedSqlRowCount(), equals(count)));
});

Then(
  'executed SQL row {int} field {string} should equal string {string}',
  async (index: number, field: string, value: string) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(ExecutedSqlFieldValue(index, field), equals(value)),
    );
  },
);

Then(
  'executed SQL row {int} field {string} should be numeric',
  async (index: number, field: string) => {
    const value = await actorCalled('QATester').answer(ExecutedSqlFieldValue(index, field));
    expect(typeof value).toBe('number');
  },
);

Then(
  'executed SQL row {int} field {string} should be a non-empty string',
  async (index: number, field: string) => {
    const value = await actorCalled('QATester').answer(ExecutedSqlFieldValue(index, field));
    expect(typeof value).toBe('string');
    expect((value as string).length).toBeGreaterThan(0);
  },
);
