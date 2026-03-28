import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { loadCsvContext } from '../context';
import { CsvAdapter } from './csvAdapter';

const TEST_OUTPUT_DIR = path.join(import.meta.dir, '../../__test-output__/csv-adapter');
const TEST_FILE = path.join(TEST_OUTPUT_DIR, 'output.csv');

async function* createRecordStream(records: Array<Record<string, unknown>>): AsyncIterable<Record<string, unknown>> {
  for (const record of records) {
    yield await Promise.resolve(record);
  }
}

async function readCsv(filePath: string): Promise<string> {
  return await Bun.file(filePath).text();
}

describe('CsvAdapter', () => {
  beforeEach(async () => {
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  test('writes header row from the first record and preserves field order', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(
      createRecordStream([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe('id,name,active\n1,Alice,true\n2,Bob,false\n');
  });

  test('truncates an existing file before writing new CSV content', async () => {
    await Bun.write(TEST_FILE, 'id,name\n1,stale\ntrailing-garbage');

    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(
      createRecordStream([
        { id: 2, name: 'Fresh' },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe('id,name\n2,Fresh\n');
  });

  test('skips leading empty records until it finds headers to write', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(
      createRecordStream([
        {},
        { id: 1, name: 'Alice' },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe('id,name\n1,Alice\n');
  });

  test('escapes commas, quotes, carriage returns, and embedded newlines', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(
      createRecordStream([
        {
          id: 1,
          comma: 'Doe, Jane',
          quote: 'He said "hello"',
          multiline: 'Line 1\r\nLine 2\nLine 3',
        },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe(
      'id,comma,quote,multiline\n1,"Doe, Jane","He said ""hello""","Line 1\r\nLine 2\nLine 3"\n',
    );
  });

  test('supports a custom delimiter while keeping comma as the default', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE, delimiter: ';' });

    await adapter.write(
      createRecordStream([
        { id: 1, value: 'alpha;beta', plain: 'ok' },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe('id;value;plain\n1;"alpha;beta";ok\n');
  });

  test('serializes nested objects and arrays as JSON strings before escaping', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(
      createRecordStream([
        {
          id: 1,
          profile: { role: 'qa', level: 2 },
          tags: ['smoke', 'csv'],
        },
      ]),
    );

    const content = await readCsv(TEST_FILE);

    expect(content).toBe(
      'id,profile,tags\n1,"{""role"":""qa"",""level"":2}","[""smoke"",""csv""]"\n',
    );
  });

  test('writes large streams without buffering records into an intermediate array', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });
    const recordCount = 10000;
    let produced = 0;

    async function* generateRecords(): AsyncIterable<Record<string, unknown>> {
      for (let index = 0; index < recordCount; index += 1) {
        produced += 1;
        yield await Promise.resolve({ id: index, value: `row-${index}` });
      }
    }

    await adapter.write(generateRecords());

    const context = await loadCsvContext(TEST_FILE);

    expect(produced).toBe(recordCount);
    expect(context.metadata.recordCount).toBe(recordCount);
    expect(context.records[0]).toEqual({ id: 0, value: 'row-0' });
    expect(context.records[recordCount - 1]).toEqual({ id: recordCount - 1, value: `row-${recordCount - 1}` });
  });

  test('creates an empty file when no records are emitted', async () => {
    const adapter = new CsvAdapter({ outputPath: TEST_FILE });

    await adapter.write(createRecordStream([]));

    const content = await readCsv(TEST_FILE);

    expect(content).toBe('');
  });

  test('rejects an empty outputPath', () => {
    expect(() => new CsvAdapter({ outputPath: '' })).toThrow('outputPath cannot be empty');
  });
});