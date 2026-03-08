import type { RNG } from '../generator/rng';
import { isContextData, normalizeContextTags } from './contextManager';
import type {
  ContextCollectionInput,
  ContextData,
  ContextRecord,
} from './types';

interface ContextSelectionExpression {
  readonly raw: string;
  readonly collection: string;
  readonly tags: readonly string[];
  readonly selector:
    | { readonly kind: 'random' }
    | { readonly kind: 'index'; readonly index: number };
}

interface NormalizedContextSource {
  readonly records: readonly ContextRecord[];
  readonly tags: readonly string[];
}

function isContextDataCollection(
  collection: ContextCollectionInput,
): collection is readonly ContextData[] {
  return Array.isArray(collection)
    && collection.length > 0
    && collection.every((item) => isContextData(item));
}

function normalizeContextSource(source: ContextData): NormalizedContextSource {
  return {
    records: source.records,
    tags: normalizeContextTags(source.metadata.tags),
  };
}

function normalizeContextSources(
  collection: ContextCollectionInput,
): readonly NormalizedContextSource[] {
  if (isContextData(collection)) {
    return [normalizeContextSource(collection)];
  }

  if (isContextDataCollection(collection)) {
    return collection.map((item) => normalizeContextSource(item));
  }

  return [
    {
      records: collection,
      tags: [],
    },
  ];
}

export function filterContextRecords(
  _collectionName: string,
  collection: ContextCollectionInput,
  tags: readonly string[],
): readonly ContextRecord[] {
  const normalizedTags = normalizeContextTags(tags);
  const sources = normalizeContextSources(collection);

  if (normalizedTags.length === 0) {
    return sources.flatMap((source) => source.records);
  }

  return sources
    .filter((source) => normalizedTags.every((tag) => source.tags.includes(tag)))
    .flatMap((source) => source.records);
}

export function selectContextRecord(
  expression: ContextSelectionExpression,
  collection: ContextCollectionInput,
  rng: RNG,
): ContextRecord {
  const filteredRecords = filterContextRecords(
    expression.collection,
    collection,
    expression.tags,
  );

  if (filteredRecords.length === 0) {
    if (expression.tags.length > 0) {
      throw new Error(
        `No context data in collection '${expression.collection}' matches tags '${expression.tags.join(', ')}' for reference '${expression.raw}'`,
      );
    }

    throw new Error(
      `Context collection '${expression.collection}' is empty for reference '${expression.raw}'`,
    );
  }

  if (expression.selector.kind === 'random') {
    const index = Math.floor(rng.nextFloat() * filteredRecords.length);
    return filteredRecords[index];
  }

  const index = expression.selector.index;
  if (index < 0 || index >= filteredRecords.length) {
    throw new Error(
      `Context index ${index} is out of range for collection '${expression.collection}' (size=${filteredRecords.length}) in reference '${expression.raw}'`,
    );
  }

  return filteredRecords[index];
}