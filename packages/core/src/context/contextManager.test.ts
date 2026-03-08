import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { isContextData, loadContext } from './contextManager';

const TEST_DIR = path.join(import.meta.dir, '../../__test-output__/context-manager');

async function writeFixture(filename: string, value: string): Promise<string> {
  const filePath = path.join(TEST_DIR, filename);
  await Bun.write(filePath, value);
  return filePath;
}

describe('loadContext', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('loads JSON context and normalizes tags once at the boundary', async () => {
    const filePath = await writeFixture(
      'users.json',
      JSON.stringify([{ id: 'u-1', email: 'qa.one@example.com' }]),
    );

    const context = await loadContext(filePath, [' Staging ', 'REGION-US', 'staging']);

    expect(context.records).toHaveLength(1);
    expect(context.metadata.format).toBe('json');
    expect(context.metadata.tags).toEqual(['staging', 'region-us']);
  });

  test('loads CSV context through the orchestrating entry point', async () => {
    const filePath = await writeFixture(
      'users.csv',
      ['id,email', 'u-1,qa.one@example.com', 'u-2,qa.two@example.com'].join('\n'),
    );

    const context = await loadContext(filePath, ['Production']);

    expect(context.records).toHaveLength(2);
    expect(context.metadata.format).toBe('csv');
    expect(context.metadata.tags).toEqual(['production']);
  });

  test('rejects unsupported context file types with an actionable error', async () => {
    const filePath = await writeFixture('users.txt', 'nope');

    expect.assertions(1);
    try {
      await loadContext(filePath, ['staging']);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/unsupported context file type/i);
    }
  });

  test('rejects context-like objects whose metadata tags are not strings', () => {
    const candidate = {
      records: [{ id: 'u-1' }],
      metadata: {
        source: 'users.json',
        format: 'json',
        loadedAt: '2026-03-08T00:00:00.000Z',
        recordCount: 1,
        tags: [123],
      },
    };

    expect(isContextData(candidate)).toBe(false);
  });
});