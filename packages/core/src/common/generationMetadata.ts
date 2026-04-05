import { createHash } from 'node:crypto';
import { version as packageVersion } from '../version';

export type GenerationMetadataFormat = 'json' | 'jsonl' | 'csv' | 'sql';

export type GenerationMetadataLineageType = 'root-pattern' | 'imported-pattern' | 'workspace-generator';

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
}

export const GENERATION_METADATA_COMMENT_LABEL = 'testdata-ai-metadata: ';

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
    && (candidate.lineage === undefined || (Array.isArray(candidate.lineage) && candidate.lineage.every(isGenerationMetadataLineageEntry)));
}

export function createGenerationMetadata(options: CreateGenerationMetadataOptions): GenerationMetadata {
  const lineage = options.lineage ?? normalizeLineageEntries(options.lineageInputs ?? []);

  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    sourcePattern: options.sourcePattern,
    count: options.count,
    format: options.format,
    seed: options.seed,
    version: options.version ?? packageVersion,
    patternHash: options.patternHash ?? createPatternHash(lineage),
    lineage: lineage.length > 0 ? lineage : undefined,
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