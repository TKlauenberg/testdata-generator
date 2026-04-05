import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import {
  createGenerationMetadata,
  encodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
} from '../common';
import { SqlAdapter } from './sqlAdapter';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../__test-output__/sql-adapter');
const TEST_FILE = path.join(TEST_OUTPUT_DIR, 'output.sql');

async function* createRecordStream(
  records: Array<Record<string, unknown>>,
): AsyncIterable<Record<string, unknown>> {
  for (const record of records) {
    yield await Promise.resolve(record);
  }
}

async function readSql(filePath: string): Promise<string> {
  return await Bun.file(filePath).text();
}

function createSqlMetadata(count: number) {
  return createGenerationMetadata({
    timestamp: '2026-04-05T10:20:00.000Z',
    sourcePattern: 'schemas/users.td',
    count,
    format: 'sql',
    seed: 42,
    version: '0.1.0',
    lineageInputs: [
      { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number }' },
    ],
  });
}

describe('SqlAdapter', () => {
  beforeEach(async () => {
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  test('writes batched postgres INSERT statements with stable column order', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'public.users',
      batchSize: 2,
      metadata: createSqlMetadata(3),
    });

    await adapter.write(
      createRecordStream([
        {},
        { name: 'Alice', id: 1, active: true },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Cara', active: false, ignored: 'late-column' },
      ]),
    );

    const content = await readSql(TEST_FILE);

    expect(content).toContain('INSERT INTO "public"."users" ("name", "id", "active") VALUES (\'Alice\', 1, TRUE), (\'Bob\', 2, NULL);\n');
    expect(content).toContain('INSERT INTO "public"."users" ("name", "id", "active") VALUES (\'Cara\', 3, FALSE);\n');
    expect(content).toStartWith(`-- ${GENERATION_METADATA_COMMENT_LABEL}${encodeGenerationMetadataComment(createSqlMetadata(3))}\n`);
  });

  test('truncates an existing file before writing fresh SQL output', async () => {
    await Bun.write(TEST_FILE, 'INSERT INTO stale VALUES (1);\ntrailing-garbage');

    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
      metadata: createSqlMetadata(1),
    });

    await adapter.write(createRecordStream([{ id: 2 }]));

    const content = await readSql(TEST_FILE);

    expect(content).toContain('INSERT INTO "users" ("id") VALUES (2);\n');
  });

  test('supports MySQL identifier quoting and escapes embedded backticks', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'qa.users',
      dialect: 'mysql',
      metadata: createSqlMetadata(1),
    });

    await adapter.write(createRecordStream([{ 'user`name': 'Alice', value: 1 }]));

    const content = await readSql(TEST_FILE);

    expect(content).toContain("INSERT INTO `qa`.`users` (`user``name`, `value`) VALUES ('Alice', 1);\n");
  });

  test('escapes injection-like strings into a single safe SQL literal', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
      metadata: createSqlMetadata(1),
    });

    await adapter.write(createRecordStream([{ payload: "O'Brien'); DROP TABLE users; --" }]));

    const content = await readSql(TEST_FILE);

    expect(content).toContain(
      "INSERT INTO \"users\" (\"payload\") VALUES ('O''Brien''); DROP TABLE users; --');\n",
    );
  });

  test('preserves newline content inside escaped SQL string literals', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
      metadata: createSqlMetadata(1),
    });

    await adapter.write(createRecordStream([{ notes: 'line 1\nline 2' }]));

    const content = await readSql(TEST_FILE);

    expect(content).toContain('INSERT INTO "users" ("notes") VALUES (\'line 1\nline 2\');\n');
  });

  test('serializes NULL, booleans, numbers, bigint, arrays, and objects', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
      metadata: createSqlMetadata(1),
    });

    await adapter.write(
      createRecordStream([
        {
          nullable: null,
          boolTrue: true,
          boolFalse: false,
          count: 42,
          big: 9007199254740993n,
          tags: ['sql', 'adapter'],
          profile: { role: 'qa', level: 2 },
        },
      ]),
    );

    const content = await readSql(TEST_FILE);

    expect(content).toContain(
      'INSERT INTO "users" ("nullable", "boolTrue", "boolFalse", "count", "big", "tags", "profile") VALUES (NULL, TRUE, FALSE, 42, 9007199254740993, \'["sql","adapter"]\', \'{"role":"qa","level":2}\');\n',
    );
  });

  test('writes metadata comments even when no non-empty records are emitted', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
    });

    await adapter.write(createRecordStream([{}, {}]));

    const content = await readSql(TEST_FILE);

    expect(content).toStartWith(`-- ${GENERATION_METADATA_COMMENT_LABEL}`);
  });

  test('rejects empty outputPath and tableName values', () => {
    expect(() => new SqlAdapter({ outputPath: '', tableName: 'users' })).toThrow(
      'outputPath cannot be empty',
    );
    expect(() => new SqlAdapter({ outputPath: TEST_FILE, tableName: '' })).toThrow(
      'tableName cannot be empty',
    );
  });

  test('rejects invalid batchSize values', () => {
    expect(
      () => new SqlAdapter({ outputPath: TEST_FILE, tableName: 'users', batchSize: 0 }),
    ).toThrow('batchSize must be a positive integer');
    expect(
      () => new SqlAdapter({ outputPath: TEST_FILE, tableName: 'users', batchSize: -1 }),
    ).toThrow('batchSize must be a positive integer');
    expect(
      () => new SqlAdapter({ outputPath: TEST_FILE, tableName: 'users', batchSize: 1.5 }),
    ).toThrow('batchSize must be a positive integer');
  });

  test('rejects non-finite numeric values instead of emitting invalid SQL literals', async () => {
    const adapter = new SqlAdapter({
      outputPath: TEST_FILE,
      tableName: 'users',
    });

    let thrownError: unknown;

    try {
      await adapter.write(createRecordStream([{ score: Number.NaN }]));
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain('cannot serialize non-finite numbers');
  });
});
