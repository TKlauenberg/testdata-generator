import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { loadJsonContext } from './jsonLoader';
import type { ContextData } from '../types';

const TEST_DIR = path.join(import.meta.dir, '../../../__test-output__/json-context-loader');

async function writeJsonFixture(filename: string, value: unknown): Promise<string> {
  const filePath = path.join(TEST_DIR, filename);
  await Bun.write(filePath, JSON.stringify(value));
  return filePath;
}

async function writeRawFixture(filename: string, value: string): Promise<string> {
  const filePath = path.join(TEST_DIR, filename);
  await Bun.write(filePath, value);
  return filePath;
}

describe('loadJsonContext', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('loads a single object payload and normalizes to one record', async () => {
    const filePath = await writeJsonFixture('single.json', {
      id: 'u-1',
      email: 'user@example.com',
    });

    const context = await loadJsonContext(filePath);

    expect(context.records).toEqual([
      {
        id: 'u-1',
        email: 'user@example.com',
      },
    ]);
    expect(context.metadata.format).toBe('json');
    expect(context.metadata.source).toBe(filePath);
    expect(context.metadata.recordCount).toBe(1);
    expect(context.metadata.loadedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  test('loads an array-of-objects payload without mutating order', async () => {
    const filePath = await writeJsonFixture('array.json', [
      { id: 'u-1', role: 'admin' },
      { id: 'u-2', role: 'tester' },
    ]);

    const context = await loadJsonContext(filePath);

    expect(context.records).toEqual([
      { id: 'u-1', role: 'admin' },
      { id: 'u-2', role: 'tester' },
    ]);
    expect(context.metadata.recordCount).toBe(2);
  });

  test('rejects malformed JSON with clear parse error', async () => {
    const filePath = await writeRawFixture('malformed.json', '{"id": "u-1"');

    await expect(loadJsonContext(filePath)).rejects.toThrow(/invalid json/i);
  });

  test('rejects missing files with actionable message', async () => {
    const missingPath = path.join(TEST_DIR, 'missing.json');

    await expect(loadJsonContext(missingPath)).rejects.toThrow(/not found|missing/i);
  });

  test('rejects primitive top-level JSON payloads', async () => {
    const filePath = await writeJsonFixture('primitive.json', 42);

    await expect(loadJsonContext(filePath)).rejects.toThrow(/top-level|object|array/i);
  });

  test('rejects arrays with non-object entries', async () => {
    const filePath = await writeJsonFixture('mixed.json', [{ id: 'ok' }, 'bad-entry']);

    await expect(loadJsonContext(filePath)).rejects.toThrow(/array|objects|index 1/i);
  });

  test('returns a strongly-typed context contract', async () => {
    const filePath = await writeJsonFixture('types.json', { id: 'typed' });

    const context: ContextData = await loadJsonContext(filePath);

    expect(context.metadata.recordCount).toBe(1);
  });
});
