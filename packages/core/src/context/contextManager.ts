import * as path from 'node:path';
import { loadCsvContext } from './loaders/csvLoader';
import { loadJsonContext } from './loaders/jsonLoader';
import type { ContextData } from './types';

export function normalizeContextTags(tags: readonly string[] = []): readonly string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag.length === 0 || seen.has(normalizedTag)) {
      continue;
    }

    seen.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

export function isContextData(value: unknown): value is ContextData {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ContextData>;
  return Array.isArray(candidate.records)
    && candidate.metadata !== undefined
    && typeof candidate.metadata.source === 'string'
    && (candidate.metadata.format === 'json' || candidate.metadata.format === 'csv')
    && typeof candidate.metadata.loadedAt === 'string'
    && typeof candidate.metadata.recordCount === 'number'
    && Array.isArray(candidate.metadata.tags);
}

export async function loadContext(
  filePath: string,
  tags: readonly string[] = [],
): Promise<ContextData> {
  const extension = path.extname(filePath).toLowerCase();
  const normalizedTags = normalizeContextTags(tags);

  let context: ContextData;
  if (extension === '.json') {
    context = await loadJsonContext(filePath);
  } else if (extension === '.csv') {
    context = await loadCsvContext(filePath);
  } else {
    throw new Error(
      `Unsupported context file type '${extension || '<none>'}' for '${filePath}'. Supported types: .json, .csv`,
    );
  }

  return {
    records: context.records,
    metadata: {
      ...context.metadata,
      tags: normalizedTags,
    },
  };
}