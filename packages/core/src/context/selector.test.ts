import { describe, expect, test } from 'bun:test';
import { createRNG } from '../generator/rng';
import type { ContextCollections, ContextData } from './types';
import { filterContextRecords, selectContextRecord } from './selector';

function createContextData(
  source: string,
  records: Array<Record<string, string>>,
  tags: readonly string[] = [],
): ContextData {
  return {
    records,
    metadata: {
      source,
      format: 'json',
      loadedAt: '2026-03-06T00:00:00.000Z',
      recordCount: records.length,
      tags,
    },
  };
}

describe('filterContextRecords', () => {
  test('filters by AND-combined tags with case-insensitive matching', () => {
    const collections: ContextCollections = {
      users: [
        createContextData('staging-us.json', [{ email: 'staging.us@example.com' }], ['staging', 'region-us']),
        createContextData('staging-eu.json', [{ email: 'staging.eu@example.com' }], ['staging', 'region-eu']),
        createContextData('prod-us.json', [{ email: 'prod.us@example.com' }], ['production', 'region-us']),
      ],
    };

    const records = filterContextRecords('users', collections.users, ['STAGING', 'region-us']);

    expect(records).toEqual([{ email: 'staging.us@example.com' }]);
  });

  test('keeps untagged context accessible when no tag filter is applied', () => {
    const collections: ContextCollections = {
      users: [
        createContextData('untagged.json', [{ email: 'untagged@example.com' }]),
        createContextData('staging.json', [{ email: 'staging@example.com' }], ['staging']),
      ],
    };

    const records = filterContextRecords('users', collections.users, []);

    expect(records).toEqual([
      { email: 'untagged@example.com' },
      { email: 'staging@example.com' },
    ]);
  });
});

describe('selectContextRecord', () => {
  test('selects deterministically from the filtered candidates under a fixed seed', () => {
    const collection: ContextCollections['users'] = [
      createContextData(
        'staging-us.json',
        [
          { email: 'staging.us.one@example.com' },
          { email: 'staging.us.two@example.com' },
        ],
        ['staging', 'region-us'],
      ),
      createContextData('prod-us.json', [{ email: 'prod.us@example.com' }], ['production', 'region-us']),
    ];

    const expression = {
      raw: '@context.users@staging AND @region-us.random.email',
      collection: 'users',
      tags: ['staging', 'region-us'],
      selector: { kind: 'random' as const },
      fieldPath: ['email'],
    };

    const rngA = createRNG(123);
    const rngB = createRNG(123);

    const first = selectContextRecord(expression, collection, rngA);
    const second = selectContextRecord(expression, collection, rngB);

    expect(first).toEqual(second);
  });

  test('throws a clear error when tag filters match no context source', () => {
    const collection: ContextCollections['users'] = [
      createContextData('prod-us.json', [{ email: 'prod.us@example.com' }], ['production', 'region-us']),
    ];

    const expression = {
      raw: '@context.users@staging.random.email',
      collection: 'users',
      tags: ['staging'],
      selector: { kind: 'random' as const },
      fieldPath: ['email'],
    };

    expect(() => selectContextRecord(expression, collection, createRNG(1))).toThrow(/matches tags/i);
  });
});