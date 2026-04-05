import type { GenerationMetadataLineageType } from '../common';
import type { PatternVersionSnapshot, PatternVersionSnapshotEntry } from './patternVersionStore';

export interface PatternVersionDiffExcerpt {
  readonly lineNumber: number;
  readonly oldLine?: string;
  readonly newLine?: string;
}

export interface PatternVersionModifiedEntry {
  readonly type: GenerationMetadataLineageType;
  readonly identifier: string;
  readonly oldHash: string;
  readonly newHash: string;
  readonly excerpt?: PatternVersionDiffExcerpt;
}

export interface PatternVersionDiff {
  readonly identical: boolean;
  readonly potentiallyBreaking: boolean;
  readonly added: readonly PatternVersionSnapshotEntry[];
  readonly removed: readonly PatternVersionSnapshotEntry[];
  readonly modified: readonly PatternVersionModifiedEntry[];
}

function compareEntryIdentity(
  left: Pick<PatternVersionSnapshotEntry, 'type' | 'identifier'>,
  right: Pick<PatternVersionSnapshotEntry, 'type' | 'identifier'>,
): number {
  const typeComparison = left.type.localeCompare(right.type);
  if (typeComparison !== 0) {
    return typeComparison;
  }

  return left.identifier.localeCompare(right.identifier);
}

function toLineageKey(type: GenerationMetadataLineageType, identifier: string): string {
  return `${type}\u0000${identifier}`;
}

function normalizeExcerptLine(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.replace(/\t/g, '  ').trim();
  if (normalized.length === 0) {
    return '<blank>';
  }

  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function buildExcerpt(oldContent: string, newContent: string): PatternVersionDiffExcerpt | undefined {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);
  const lineCount = Math.max(oldLines.length, newLines.length);

  for (let index = 0; index < lineCount; index += 1) {
    if (oldLines[index] !== newLines[index]) {
      return {
        lineNumber: index + 1,
        oldLine: normalizeExcerptLine(oldLines[index]),
        newLine: normalizeExcerptLine(newLines[index]),
      };
    }
  }

  return undefined;
}

function isPotentiallyBreakingType(type: GenerationMetadataLineageType): boolean {
  return type === 'root-pattern' || type === 'imported-pattern';
}

export function comparePatternVersions(
  oldSnapshot: PatternVersionSnapshot,
  newSnapshot: PatternVersionSnapshot,
): PatternVersionDiff {
  if (oldSnapshot.patternHash === newSnapshot.patternHash) {
    return {
      identical: true,
      potentiallyBreaking: false,
      added: [],
      removed: [],
      modified: [],
    };
  }

  const oldEntries = new Map(
    oldSnapshot.lineage.map((entry) => [toLineageKey(entry.type, entry.identifier), entry] as const),
  );
  const newEntries = new Map(
    newSnapshot.lineage.map((entry) => [toLineageKey(entry.type, entry.identifier), entry] as const),
  );

  const allEntries = [...oldSnapshot.lineage, ...newSnapshot.lineage]
    .sort(compareEntryIdentity)
    .map((entry) => toLineageKey(entry.type, entry.identifier));
  const orderedKeys = [...new Set(allEntries)];

  const added: PatternVersionSnapshotEntry[] = [];
  const removed: PatternVersionSnapshotEntry[] = [];
  const modified: PatternVersionModifiedEntry[] = [];

  for (const key of orderedKeys) {
    const oldEntry = oldEntries.get(key);
    const newEntry = newEntries.get(key);

    if (oldEntry === undefined && newEntry !== undefined) {
      added.push(newEntry);
      continue;
    }

    if (oldEntry !== undefined && newEntry === undefined) {
      removed.push(oldEntry);
      continue;
    }

    if (oldEntry !== undefined && newEntry !== undefined && oldEntry.hash !== newEntry.hash) {
      modified.push({
        type: oldEntry.type,
        identifier: oldEntry.identifier,
        oldHash: oldEntry.hash,
        newHash: newEntry.hash,
        excerpt: buildExcerpt(oldEntry.content, newEntry.content),
      });
    }
  }

  return {
    identical: added.length === 0 && removed.length === 0 && modified.length === 0,
    potentiallyBreaking: removed.length > 0 || modified.some((entry) => isPotentiallyBreakingType(entry.type)),
    added,
    removed,
    modified,
  };
}