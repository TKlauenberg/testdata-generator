import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { loadCsvContext } from './csvLoader';
import type { ContextData } from '../types';

const TEST_DIR = path.join(import.meta.dir, '../../../__test-output__/csv-context-loader');

async function writeCsvFixture(filename: string, csv: string): Promise<string> {
  const filePath = path.join(TEST_DIR, filename);
  await Bun.write(filePath, csv);
  return filePath;
}

describe('loadCsvContext', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('loads headered CSV and maps rows in stable order', async () => {
    const filePath = await writeCsvFixture(
      'basic.csv',
      ['id,email,active', 'u-1,qa.one@example.com,true', 'u-2,qa.two@example.com,false'].join(
        '\n',
      ),
    );

    const context = await loadCsvContext(filePath);

    expect(context.records).toEqual([
      { id: 'u-1', email: 'qa.one@example.com', active: true },
      { id: 'u-2', email: 'qa.two@example.com', active: false },
    ]);
    expect(context.metadata.format).toBe('csv');
    expect(context.metadata.recordCount).toBe(2);
  });

  test('handles quoted fields and escaped quotes/commas', async () => {
    const filePath = await writeCsvFixture(
      'quoted.csv',
      ['id,name,notes', '1,"Doe, Jane","Said ""hello, world"""'].join('\n'),
    );

    const context = await loadCsvContext(filePath);

    expect(context.records).toEqual([
      {
        id: 1,
        name: 'Doe, Jane',
        notes: 'Said "hello, world"',
      },
    ]);
  });

  test('infers booleans and safe numbers but preserves lossy-looking strings', async () => {
    const filePath = await writeCsvFixture(
      'inference.csv',
      ['id,count,enabled,zip', 'item-1,42,true,00123'].join('\n'),
    );

    const context = await loadCsvContext(filePath);

    expect(context.records[0]).toEqual({
      id: 'item-1',
      count: 42,
      enabled: true,
      zip: '00123',
    });
  });

  test('rejects missing files with actionable message', async () => {
    const missingPath = path.join(TEST_DIR, 'missing.csv');
    expect.assertions(1);
    try {
      await loadCsvContext(missingPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/not found|missing/i);
    }
  });

  test('rejects malformed row widths', async () => {
    const filePath = await writeCsvFixture('bad-width.csv', ['id,name', '1,alice,extra'].join('\n'));
    expect.assertions(1);
    try {
      await loadCsvContext(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/expected 2 columns but found 3/i);
    }
  });

  test('rejects empty header names', async () => {
    const filePath = await writeCsvFixture('empty-header.csv', ['id,,name', '1,,alice'].join('\n'));
    expect.assertions(1);
    try {
      await loadCsvContext(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/header names must be non-empty/i);
    }
  });

  test('rejects malformed quoted input', async () => {
    const filePath = await writeCsvFixture('unterminated.csv', ['id,name', '1,"broken'].join('\n'));
    expect.assertions(1);
    try {
      await loadCsvContext(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/unterminated quoted field/i);
    }
  });

  test('processes large CSV inputs with accurate recordCount', async () => {
    const rowCount = 10000;
    const lines = ['id,value'];
    for (let index = 0; index < rowCount; index += 1) {
      lines.push(`${index},item-${index}`);
    }

    const filePath = await writeCsvFixture('large.csv', lines.join('\n'));
    const context = await loadCsvContext(filePath);

    expect(context.metadata.recordCount).toBe(rowCount);
    expect(context.records[0]).toEqual({ id: 0, value: 'item-0' });
    expect(context.records[rowCount - 1]).toEqual({ id: rowCount - 1, value: `item-${rowCount - 1}` });
  });

  test('returns a strongly-typed context contract', async () => {
    const filePath = await writeCsvFixture('types.csv', ['id,name', '1,typed'].join('\n'));
    const context: ContextData = await loadCsvContext(filePath);
    expect(context.metadata.format).toBe('csv');
  });
});