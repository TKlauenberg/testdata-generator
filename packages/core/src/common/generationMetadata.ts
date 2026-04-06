import { createHash } from 'node:crypto';
import { version as packageVersion } from '../version';

export type GenerationMetadataFormat = 'json' | 'jsonl' | 'csv' | 'sql';

export type GenerationMetadataLineageType = 'root-pattern' | 'imported-pattern' | 'workspace-generator';

export interface GenerationMetadataContextReferenceRandomSelector {
  readonly kind: 'random';
}

export interface GenerationMetadataContextReferenceIndexSelector {
  readonly kind: 'index';
  readonly index: number;
}

export type GenerationMetadataContextReferenceSelector =
  | GenerationMetadataContextReferenceRandomSelector
  | GenerationMetadataContextReferenceIndexSelector;

export interface GenerationMetadataContextReference {
  readonly raw: string;
  readonly collection: string;
  readonly tags: readonly string[];
  readonly selector: GenerationMetadataContextReferenceSelector;
  readonly fieldPath?: readonly string[];
}

export interface GenerationMetadataPlatformReserved {
  readonly contextReferences?: readonly GenerationMetadataContextReference[];
}

export interface GenerationMetadataLineageEntry {
  readonly type: GenerationMetadataLineageType;
  readonly identifier: string;
  readonly hash: string;
}

export interface GenerationMetadataLineageInput {
  readonly type: GenerationMetadataLineageType;
  readonly identifier: string;
  readonly content: string;
}

export interface GenerationMetadata {
  readonly timestamp: string;
  readonly sourcePattern?: string;
  readonly count?: number;
  readonly format: GenerationMetadataFormat;
  readonly seed?: number;
  readonly version: string;
  readonly patternHash?: string;
  readonly lineage?: readonly GenerationMetadataLineageEntry[];
  readonly platformReserved?: GenerationMetadataPlatformReserved;
}

export interface CreateGenerationMetadataOptions {
  readonly timestamp?: string;
  readonly sourcePattern?: string;
  readonly count?: number;
  readonly format: GenerationMetadataFormat;
  readonly seed?: number;
  readonly version?: string;
  readonly patternHash?: string;
  readonly lineage?: readonly GenerationMetadataLineageEntry[];
  readonly lineageInputs?: readonly GenerationMetadataLineageInput[];
  readonly platformReserved?: GenerationMetadataPlatformReserved;
}

export const GENERATION_METADATA_COMMENT_LABEL = 'testdata-generator-metadata: ';

function hashText(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(Object.prototype.toString.call(value));
}

function normalizeLineageEntries(
  lineageInputs: readonly GenerationMetadataLineageInput[],
): readonly GenerationMetadataLineageEntry[] {
  return [...lineageInputs]
    .sort((left, right) => {
      const typeComparison = left.type.localeCompare(right.type);
      if (typeComparison !== 0) {
        return typeComparison;
      }

      return left.identifier.localeCompare(right.identifier);
    })
    .map((entry) => ({
      type: entry.type,
      identifier: entry.identifier,
      hash: hashText(entry.content),
    }));
}

function createPatternHash(lineage: readonly GenerationMetadataLineageEntry[]): string | undefined {
  if (lineage.length === 0) {
    return undefined;
  }

  return hashText(stableStringify(lineage));
}

function isLineageType(value: unknown): value is GenerationMetadataLineageType {
  return value === 'root-pattern' || value === 'imported-pattern' || value === 'workspace-generator';
}

function isGenerationMetadataLineageEntry(value: unknown): value is GenerationMetadataLineageEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationMetadataLineageEntry>;
  return isLineageType(candidate.type)
    && typeof candidate.identifier === 'string'
    && typeof candidate.hash === 'string';
}

function isGenerationMetadataContextReferenceSelector(
  value: unknown,
): value is GenerationMetadataContextReferenceSelector {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationMetadataContextReferenceSelector>;
  const index = (candidate as Partial<GenerationMetadataContextReferenceIndexSelector>).index;
  return candidate.kind === 'random'
    || (candidate.kind === 'index'
      && typeof index === 'number'
      && Number.isInteger(index)
      && index >= 0);
}

function isGenerationMetadataContextReference(
  value: unknown,
): value is GenerationMetadataContextReference {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationMetadataContextReference>;
  return typeof candidate.raw === 'string'
    && typeof candidate.collection === 'string'
    && Array.isArray(candidate.tags)
    && candidate.tags.every((tag) => typeof tag === 'string')
    && isGenerationMetadataContextReferenceSelector(candidate.selector)
    && (candidate.fieldPath === undefined
      || (Array.isArray(candidate.fieldPath)
        && candidate.fieldPath.every((segment) => typeof segment === 'string')));
}

function isGenerationMetadataPlatformReserved(value: unknown): value is GenerationMetadataPlatformReserved {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationMetadataPlatformReserved>;
  return candidate.contextReferences === undefined
    || (Array.isArray(candidate.contextReferences)
      && candidate.contextReferences.every(isGenerationMetadataContextReference));
}

function normalizeContextReference(
  reference: GenerationMetadataContextReference,
): GenerationMetadataContextReference {
  const normalizedTags = [...reference.tags].sort((left, right) => left.localeCompare(right));
  const normalizedFieldPath = reference.fieldPath === undefined || reference.fieldPath.length === 0
    ? undefined
    : [...reference.fieldPath];

  return {
    raw: reference.raw,
    collection: reference.collection,
    tags: normalizedTags,
    selector: reference.selector.kind === 'random'
      ? { kind: 'random' }
      : { kind: 'index', index: reference.selector.index },
    fieldPath: normalizedFieldPath,
  };
}

function normalizePlatformReserved(
  platformReserved?: GenerationMetadataPlatformReserved,
): GenerationMetadataPlatformReserved | undefined {
  if (platformReserved === undefined) {
    return undefined;
  }

  const contextReferences = platformReserved.contextReferences === undefined
    ? undefined
    : [...platformReserved.contextReferences]
      .map((reference) => normalizeContextReference(reference))
      .sort((left, right) => {
        const rawComparison = left.raw.localeCompare(right.raw);
        if (rawComparison !== 0) {
          return rawComparison;
        }

        return stableStringify(left).localeCompare(stableStringify(right));
      });

  if (contextReferences === undefined || contextReferences.length === 0) {
    return undefined;
  }

  return {
    contextReferences,
  };
}

export function isGenerationMetadata(value: unknown): value is GenerationMetadata {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationMetadata>;
  return typeof candidate.timestamp === 'string'
    && (candidate.sourcePattern === undefined || typeof candidate.sourcePattern === 'string')
    && (candidate.count === undefined || (typeof candidate.count === 'number' && Number.isInteger(candidate.count) && candidate.count >= 0))
    && (candidate.format === 'json' || candidate.format === 'jsonl' || candidate.format === 'csv' || candidate.format === 'sql')
    && (candidate.seed === undefined || typeof candidate.seed === 'number')
    && typeof candidate.version === 'string'
    && (candidate.patternHash === undefined || typeof candidate.patternHash === 'string')
    && (candidate.lineage === undefined || (Array.isArray(candidate.lineage) && candidate.lineage.every(isGenerationMetadataLineageEntry)))
    && (candidate.platformReserved === undefined || isGenerationMetadataPlatformReserved(candidate.platformReserved));
}

export function createGenerationMetadata(options: CreateGenerationMetadataOptions): GenerationMetadata {
  const lineage = options.lineage ?? normalizeLineageEntries(options.lineageInputs ?? []);
  const platformReserved = normalizePlatformReserved(options.platformReserved);

  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    sourcePattern: options.sourcePattern,
    count: options.count,
    format: options.format,
    seed: options.seed,
    version: options.version ?? packageVersion,
    patternHash: options.patternHash ?? createPatternHash(lineage),
    lineage: lineage.length > 0 ? lineage : undefined,
    platformReserved,
  };
}

export function encodeGenerationMetadataComment(metadata: GenerationMetadata): string {
  return Buffer.from(JSON.stringify(metadata), 'utf-8').toString('base64url');
}

export function decodeGenerationMetadataComment(payload: string): GenerationMetadata {
  const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
  const parsed = JSON.parse(decoded) as unknown;

  if (!isGenerationMetadata(parsed)) {
    throw new Error('Invalid generation metadata payload');
  }

  return parsed;
}