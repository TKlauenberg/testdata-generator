import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { version } from '../version';
import { loadCsvContext } from './loaders/csvLoader';
import { loadJsonContext } from './loaders/jsonLoader';
import type { ContextData, ContextRecord, SavedContextEnvelope } from './types';

const DEFAULT_CONTEXT_DIRECTORY = './contexts';
const WINDOWS_RESERVED_CONTEXT_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

function hasValidContextTags(tags: unknown): tags is readonly string[] {
  return Array.isArray(tags) && tags.every((tag) => typeof tag === 'string');
}

function hasValidOptionalSavedContextMetadata(metadata: ContextData['metadata']): boolean {
  return (metadata.timestamp === undefined || typeof metadata.timestamp === 'string')
    && (metadata.sourcePattern === undefined || typeof metadata.sourcePattern === 'string')
    && (metadata.version === undefined || typeof metadata.version === 'string');
}

function mergeContextTags(
  existingTags: readonly string[],
  requestedTags: readonly string[],
): readonly string[] {
  return normalizeContextTags([...existingTags, ...requestedTags]);
}

function normalizeContextName(name: string): string {
  const trimmedName = name.trim();
  const withoutJsonExtension = trimmedName.toLowerCase().endsWith('.json')
    ? trimmedName.slice(0, -5)
    : trimmedName;
  const rootName = withoutJsonExtension.split('.')[0]?.toUpperCase() ?? '';

  if (
    withoutJsonExtension.length === 0
    || withoutJsonExtension === '.'
    || withoutJsonExtension === '..'
    || path.basename(withoutJsonExtension) !== withoutJsonExtension
    || /[^A-Za-z0-9._-]/.test(withoutJsonExtension)
    || /[. ]$/.test(withoutJsonExtension)
    || WINDOWS_RESERVED_CONTEXT_NAMES.has(rootName)
  ) {
    throw new Error(
      `Invalid context name '${name}'. Use letters, numbers, dots, underscores, and hyphens only.`,
    );
  }

  return withoutJsonExtension;
}

export interface SaveContextOptions {
  readonly directory?: string;
  readonly sourcePattern?: string;
}

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
  const metadata = candidate.metadata;

  return Array.isArray(candidate.records)
    && metadata !== undefined
    && typeof metadata === 'object'
    && typeof metadata.source === 'string'
    && (metadata.format === 'json' || metadata.format === 'csv')
    && typeof metadata.loadedAt === 'string'
    && typeof metadata.recordCount === 'number'
    && hasValidContextTags(metadata.tags)
    && hasValidOptionalSavedContextMetadata(metadata);
}

export async function saveAsContext(
  records: readonly Record<string, unknown>[],
  name: string,
  tags: readonly string[] = [],
  options: SaveContextOptions = {},
): Promise<void> {
  const normalizedName = normalizeContextName(name);
  const outputDirectory = path.resolve(options.directory ?? DEFAULT_CONTEXT_DIRECTORY);
  const outputPath = path.join(outputDirectory, `${normalizedName}.json`);
  const normalizedTags = normalizeContextTags(tags);
  const envelope: SavedContextEnvelope = {
    metadata: {
      timestamp: new Date().toISOString(),
      sourcePattern: options.sourcePattern,
      count: records.length,
      version,
      tags: normalizedTags,
    },
    data: records as readonly ContextRecord[],
  };

  await mkdir(outputDirectory, { recursive: true });

  try {
    await Bun.write(outputPath, `${JSON.stringify(envelope, null, 2)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save context '${name}' to '${outputPath}': ${message}`);
  }
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
      tags: mergeContextTags(context.metadata.tags, normalizedTags),
    },
  };
}