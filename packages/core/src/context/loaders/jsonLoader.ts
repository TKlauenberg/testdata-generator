import { isGenerationMetadata } from '../../common';
import { err, ok } from '../../common/result';
import type { GenerationMetadata, GenerationMetadataLineageEntry } from '../../common';
import type { Result } from '../../common/result';
import type {
  ContextData,
  ContextRecord,
  SavedContextEnvelope,
  SavedContextMetadata,
} from '../types';

function isObjectRecord(value: unknown): value is ContextRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasValidContextTags(tags: unknown): tags is readonly string[] {
  return Array.isArray(tags) && tags.every((tag) => typeof tag === 'string');
}

function normalizeContextTags(tags: readonly string[] = []): readonly string[] {
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

function isSavedContextMetadataCandidate(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return 'tags' in value;
}

function isSavedContextEnvelopeCandidate(value: unknown): value is SavedContextEnvelope {
  return isObjectRecord(value)
    && 'metadata' in value
    && 'data' in value
    && Array.isArray(value.data)
    && isSavedContextMetadataCandidate(value.metadata);
}

function isGeneratedOutputEnvelopeCandidate(value: unknown): value is {
  readonly metadata: GenerationMetadata;
  readonly data: readonly ContextRecord[];
} {
  if (!isObjectRecord(value) || !('metadata' in value) || !('data' in value)) {
    return false;
  }

  const candidate = value as {
    readonly metadata?: unknown;
    readonly data?: unknown;
  };

  return isGenerationMetadata(candidate.metadata)
    && Array.isArray(candidate.data)
    && candidate.data.every((item) => isObjectRecord(item));
}

function validateSavedContextMetadata(
  metadata: unknown,
  filePath: string,
): Result<SavedContextMetadata, string> {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return err(`Invalid saved context metadata in "${filePath}": expected an object`);
  }

  const candidate = metadata as Partial<SavedContextMetadata>;

  if (typeof candidate.timestamp !== 'string') {
    return err(`Invalid saved context metadata in "${filePath}": missing string timestamp`);
  }

  if (candidate.sourcePattern !== undefined && typeof candidate.sourcePattern !== 'string') {
    return err(`Invalid saved context metadata in "${filePath}": sourcePattern must be a string when provided`);
  }

  if (
    candidate.format !== undefined
    && candidate.format !== 'json'
    && candidate.format !== 'jsonl'
    && candidate.format !== 'csv'
    && candidate.format !== 'sql'
  ) {
    return err(`Invalid saved context metadata in "${filePath}": format must be json, jsonl, csv, or sql when provided`);
  }

  if (typeof candidate.version !== 'string') {
    return err(`Invalid saved context metadata in "${filePath}": missing string version`);
  }

  if (typeof candidate.count !== 'number' || !Number.isInteger(candidate.count) || candidate.count < 0) {
    return err(`Invalid saved context metadata in "${filePath}": count must be a non-negative integer`);
  }

  if (!hasValidContextTags(candidate.tags)) {
    return err(`Invalid saved context metadata in "${filePath}": tags must be an array of strings`);
  }

  if (candidate.seed !== undefined && typeof candidate.seed !== 'number') {
    return err(`Invalid saved context metadata in "${filePath}": seed must be a number when provided`);
  }

  if (candidate.patternHash !== undefined && typeof candidate.patternHash !== 'string') {
    return err(`Invalid saved context metadata in "${filePath}": patternHash must be a string when provided`);
  }

  if (
    candidate.lineage !== undefined
    && (!Array.isArray(candidate.lineage)
      || !candidate.lineage.every((entry) => {
        const lineageEntry = entry as Partial<GenerationMetadataLineageEntry>;
        return (lineageEntry.type === 'root-pattern'
          || lineageEntry.type === 'imported-pattern'
          || lineageEntry.type === 'workspace-generator')
          && typeof lineageEntry.identifier === 'string'
          && typeof lineageEntry.hash === 'string';
      }))
  ) {
    return err(`Invalid saved context metadata in "${filePath}": lineage entries must include type, identifier, and hash`);
  }

  if (!isGenerationMetadata({
    timestamp: candidate.timestamp,
    sourcePattern: candidate.sourcePattern,
    count: candidate.count,
    format: candidate.format ?? 'json',
    seed: candidate.seed,
    version: candidate.version,
    patternHash: candidate.patternHash,
    lineage: candidate.lineage,
    platformReserved: candidate.platformReserved,
  })) {
    return err(`Invalid saved context metadata in "${filePath}": platformReserved must match the canonical generation metadata contract when provided`);
  }

  return ok({
    timestamp: candidate.timestamp,
    sourcePattern: candidate.sourcePattern,
    format: candidate.format,
    version: candidate.version,
    count: candidate.count,
    tags: normalizeContextTags(candidate.tags),
    seed: candidate.seed,
    patternHash: candidate.patternHash,
    lineage: candidate.lineage,
    platformReserved: candidate.platformReserved,
  });
}

function normalizeSavedContextEnvelope(
  parsedJson: SavedContextEnvelope,
  filePath: string,
): Result<{
  readonly records: readonly ContextRecord[];
  readonly savedMetadata: SavedContextMetadata;
}, string> {
  const metadataResult = validateSavedContextMetadata(parsedJson.metadata, filePath);
  if (!metadataResult.ok) {
    return metadataResult;
  }

  if (!Array.isArray(parsedJson.data)) {
    return err(`Invalid saved context envelope in "${filePath}": data must be an array of objects`);
  }

  for (const [index, item] of parsedJson.data.entries()) {
    if (!isObjectRecord(item)) {
      return err(
        `Invalid saved context envelope in "${filePath}": expected only objects in data, found non-object at index ${index}`,
      );
    }
  }

  if (metadataResult.value.count !== parsedJson.data.length) {
    return err(
      `Invalid saved context envelope in "${filePath}": metadata count ${metadataResult.value.count} does not match data length ${parsedJson.data.length}`,
    );
  }

  return ok({
    records: parsedJson.data,
    savedMetadata: metadataResult.value,
  });
}

function normalizeContextPayload(
  parsedJson: unknown,
  filePath: string,
): Result<{
  readonly records: readonly ContextRecord[];
  readonly savedMetadata?: SavedContextMetadata;
  readonly generatedMetadata?: GenerationMetadata;
}, string> {
  if (isSavedContextEnvelopeCandidate(parsedJson)) {
    return normalizeSavedContextEnvelope(parsedJson, filePath);
  }

  if (isGeneratedOutputEnvelopeCandidate(parsedJson)) {
    return ok({
      records: parsedJson.data,
      generatedMetadata: parsedJson.metadata,
    });
  }

  if (isObjectRecord(parsedJson)) {
    return ok({ records: [parsedJson] });
  }

  if (Array.isArray(parsedJson)) {
    for (const [index, item] of parsedJson.entries()) {
      if (!isObjectRecord(item)) {
        return err(
          `Invalid JSON context array in "${filePath}": expected only objects, found non-object at index ${index}`,
        );
      }
    }

    return ok({ records: parsedJson });
  }

  return err(
    `Invalid JSON context top-level value in "${filePath}": expected an object or an array of objects`,
  );
}

export async function loadJsonContext(filePath: string): Promise<ContextData> {
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new Error(`JSON context file not found: ${filePath}`);
  }

  let fileContent: string;
  try {
    fileContent = await file.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSON context file "${filePath}": ${message}`);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(fileContent) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in context file "${filePath}": ${message}`);
  }

  const recordsResult = normalizeContextPayload(parsedJson, filePath);
  if (!recordsResult.ok) {
    throw new Error(recordsResult.errors);
  }

  const { records, savedMetadata, generatedMetadata } = recordsResult.value;

  return {
    records,
    metadata: {
      source: filePath,
      format: 'json',
      loadedAt: new Date().toISOString(),
      recordCount: records.length,
      tags: savedMetadata?.tags ?? [],
      generationFormat: savedMetadata?.format ?? generatedMetadata?.format,
      timestamp: savedMetadata?.timestamp ?? generatedMetadata?.timestamp,
      sourcePattern: savedMetadata?.sourcePattern ?? generatedMetadata?.sourcePattern,
      version: savedMetadata?.version ?? generatedMetadata?.version,
      seed: savedMetadata?.seed ?? generatedMetadata?.seed,
      patternHash: savedMetadata?.patternHash ?? generatedMetadata?.patternHash,
      lineage: savedMetadata?.lineage ?? generatedMetadata?.lineage,
      platformReserved: savedMetadata?.platformReserved ?? generatedMetadata?.platformReserved,
    },
  };
}
