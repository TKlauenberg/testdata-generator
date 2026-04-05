import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  GenerationMetadata,
  GenerationMetadataLineageInput,
  GenerationMetadataLineageType,
} from '../common';

export const PATTERN_VERSION_STORE_DIRECTORY_NAME = '.td-pattern-versions';

export interface PatternVersionSnapshotEntry {
  readonly type: GenerationMetadataLineageType;
  readonly identifier: string;
  readonly hash: string;
  readonly content: string;
}

export interface PatternVersionSnapshot {
  readonly patternHash: string;
  readonly lineage: readonly PatternVersionSnapshotEntry[];
}

export interface CreatePatternVersionSnapshotOptions {
  readonly metadata: GenerationMetadata;
  readonly lineageInputs: readonly GenerationMetadataLineageInput[];
}

export class PatternVersionStoreParseError extends Error {
  readonly patternHash: string;

  constructor(patternHash: string, message: string) {
    super(message);
    this.name = 'PatternVersionStoreParseError';
    this.patternHash = patternHash;
  }
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { readonly code?: unknown }).code === expectedCode;
}

function toLineageKey(type: GenerationMetadataLineageType, identifier: string): string {
  return `${type}\u0000${identifier}`;
}

function isLineageType(value: unknown): value is GenerationMetadataLineageType {
  return value === 'root-pattern' || value === 'imported-pattern' || value === 'workspace-generator';
}

function isPatternVersionSnapshotEntry(value: unknown): value is PatternVersionSnapshotEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<PatternVersionSnapshotEntry>;
  return isLineageType(candidate.type)
    && typeof candidate.identifier === 'string'
    && typeof candidate.hash === 'string'
    && typeof candidate.content === 'string';
}

export function isPatternVersionSnapshot(value: unknown): value is PatternVersionSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<PatternVersionSnapshot>;
  return typeof candidate.patternHash === 'string'
    && candidate.patternHash.length > 0
    && Array.isArray(candidate.lineage)
    && candidate.lineage.every(isPatternVersionSnapshotEntry);
}

function resolvePatternVersionSnapshotPath(storeDirectory: string, patternHash: string): string {
  return path.join(storeDirectory, `${patternHash}.json`);
}

export function createPatternVersionSnapshot(
  options: CreatePatternVersionSnapshotOptions,
): PatternVersionSnapshot | undefined {
  const patternHash = options.metadata.patternHash;
  const lineage = options.metadata.lineage;

  if (patternHash === undefined || lineage === undefined || lineage.length === 0) {
    return undefined;
  }

  const contentByEntry = new Map<string, string>();

  for (const entry of options.lineageInputs) {
    const key = toLineageKey(entry.type, entry.identifier);

    if (contentByEntry.has(key)) {
      throw new Error(`Duplicate lineage input for pattern version snapshot entry '${entry.type}:${entry.identifier}'`);
    }

    contentByEntry.set(key, entry.content);
  }

  return {
    patternHash,
    lineage: lineage.map((entry) => {
      const key = toLineageKey(entry.type, entry.identifier);
      const content = contentByEntry.get(key);

      if (content === undefined) {
        throw new Error(`Missing lineage input content for pattern version snapshot entry '${entry.type}:${entry.identifier}'`);
      }

      return {
        type: entry.type,
        identifier: entry.identifier,
        hash: entry.hash,
        content,
      };
    }),
  };
}

export async function persistPatternVersionSnapshot(
  storeDirectory: string,
  snapshot: PatternVersionSnapshot,
): Promise<string> {
  await mkdir(storeDirectory, { recursive: true });

  const snapshotPath = resolvePatternVersionSnapshotPath(storeDirectory, snapshot.patternHash);

  try {
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: 'utf-8',
      flag: 'wx',
    });
  } catch (error: unknown) {
    if (hasErrorCode(error, 'EEXIST')) {
      return snapshotPath;
    }

    throw error;
  }

  return snapshotPath;
}

export async function readPatternVersionSnapshot(
  storeDirectory: string,
  patternHash: string,
): Promise<PatternVersionSnapshot | null> {
  const snapshotPath = resolvePatternVersionSnapshotPath(storeDirectory, patternHash);

  let content: string;
  try {
    content = await readFile(snapshotPath, 'utf-8');
  } catch (error: unknown) {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }

    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PatternVersionStoreParseError(
      patternHash,
      `Invalid JSON in pattern version snapshot '${patternHash}': ${message}`,
    );
  }

  if (!isPatternVersionSnapshot(parsed)) {
    throw new PatternVersionStoreParseError(patternHash, `Invalid pattern version snapshot '${patternHash}'`);
  }

  return parsed;
}