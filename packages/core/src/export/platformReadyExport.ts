import type { ContextRecord, SavedContextEnvelope, SavedContextMetadata } from '../context';
import {
  createGenerationMetadata,
  decodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
  isGenerationMetadata,
} from '../common';
import type { GenerationMetadata } from '../common';
import {
  queryGenerationHistory,
  readPatternVersionSnapshot,
} from '../history';
import type { GenerationHistoryEntry, PatternVersionSnapshot } from '../history';

export type PlatformReadyArtifactType = 'generated-json' | 'generated-csv' | 'generated-sql' | 'saved-context-json';

export interface PlatformReadyExportArtifact {
  readonly type: PlatformReadyArtifactType;
  readonly format: 'json' | 'csv' | 'sql';
  readonly payload: unknown;
}

export interface PlatformReadyExportEnvelope {
  readonly contract: 'testdata-generator/platform-ready-export';
  readonly version: 1;
  readonly exportedAt: string;
  readonly artifact: PlatformReadyExportArtifact;
  readonly metadata: GenerationMetadata;
  readonly historyEntry: GenerationHistoryEntry;
  readonly patternSnapshot: PatternVersionSnapshot;
}

export interface CreatePlatformReadyExportOptions {
  readonly artifactPath: string;
  readonly historyPath: string;
  readonly patternVersionStorePath: string;
  readonly exportedAt?: string;
}

export type PlatformReadyExportErrorCode =
  | 'artifact-not-found'
  | 'artifact-read-failed'
  | 'invalid-artifact-json'
  | 'invalid-saved-context'
  | 'missing-metadata'
  | 'invalid-metadata'
  | 'unsupported-artifact'
  | 'missing-history'
  | 'ambiguous-history'
  | 'history-mismatch'
  | 'missing-pattern-snapshot';

export class PlatformReadyExportError extends Error {
  readonly code: PlatformReadyExportErrorCode;

  constructor(code: PlatformReadyExportErrorCode, message: string) {
    super(message);
    this.name = 'PlatformReadyExportError';
    this.code = code;
  }
}

interface GeneratedJsonArtifactEnvelope {
  readonly metadata: GenerationMetadata;
  readonly data: readonly ContextRecord[];
}

interface ParsedPlatformReadyArtifact {
  readonly artifact: PlatformReadyExportArtifact;
  readonly metadata: GenerationMetadata;
  readonly preferHistoryFormat: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isContextRecord(value: unknown): value is ContextRecord {
  return isObjectRecord(value);
}

function isGeneratedJsonArtifactEnvelope(value: unknown): value is GeneratedJsonArtifactEnvelope {
  if (!isObjectRecord(value) || !('metadata' in value) || !('data' in value)) {
    return false;
  }

  const candidate = value as {
    readonly metadata?: unknown;
    readonly data?: unknown;
  };

  return isGenerationMetadata(candidate.metadata)
    && Array.isArray(candidate.data)
    && candidate.data.every((entry) => isContextRecord(entry));
}

function isSavedContextMetadata(value: unknown): value is SavedContextMetadata {
  if (!isObjectRecord(value)) {
    return false;
  }

  const candidate = value as Partial<SavedContextMetadata>;
  return typeof candidate.timestamp === 'string'
    && (candidate.sourcePattern === undefined || typeof candidate.sourcePattern === 'string')
    && (candidate.format === undefined
      || candidate.format === 'json'
      || candidate.format === 'jsonl'
      || candidate.format === 'csv'
      || candidate.format === 'sql')
    && typeof candidate.count === 'number'
    && Number.isInteger(candidate.count)
    && candidate.count >= 0
    && typeof candidate.version === 'string'
    && Array.isArray(candidate.tags)
    && candidate.tags.every((tag) => typeof tag === 'string')
    && (candidate.seed === undefined || typeof candidate.seed === 'number')
    && (candidate.patternHash === undefined || typeof candidate.patternHash === 'string')
    && isGenerationMetadata({
      timestamp: candidate.timestamp,
      sourcePattern: candidate.sourcePattern,
      count: candidate.count,
      format: candidate.format ?? 'json',
      seed: candidate.seed,
      version: candidate.version,
      patternHash: candidate.patternHash,
      lineage: candidate.lineage,
      platformReserved: candidate.platformReserved,
    })
    && (candidate.lineage === undefined
      || (Array.isArray(candidate.lineage)
        && candidate.lineage.every((entry) => isObjectRecord(entry)
          && (entry.type === 'root-pattern' || entry.type === 'imported-pattern' || entry.type === 'workspace-generator')
          && typeof entry.identifier === 'string'
          && typeof entry.hash === 'string')));
}

function isSavedContextEnvelopeCandidate(value: unknown): value is {
  readonly metadata: unknown;
  readonly data: readonly unknown[];
} {
  if (!isObjectRecord(value) || !('metadata' in value) || !('data' in value)) {
    return false;
  }

  const candidate = value as {
    readonly metadata?: unknown;
    readonly data?: unknown;
  };

  return isObjectRecord(candidate.metadata)
    && 'tags' in candidate.metadata
    && Array.isArray(candidate.data);
}

function isSavedContextEnvelope(value: unknown): value is SavedContextEnvelope {
  if (!isObjectRecord(value) || !('metadata' in value) || !('data' in value)) {
    return false;
  }

  const candidate = value as {
    readonly metadata?: unknown;
    readonly data?: unknown;
  };

  return isSavedContextMetadata(candidate.metadata)
    && Array.isArray(candidate.data)
    && candidate.data.every((entry) => isContextRecord(entry));
}

function createMetadataFromSavedContext(envelope: SavedContextEnvelope): {
  readonly metadata: GenerationMetadata;
  readonly preferHistoryFormat: boolean;
} {
  return {
    metadata: createGenerationMetadata({
    timestamp: envelope.metadata.timestamp,
    sourcePattern: envelope.metadata.sourcePattern,
    count: envelope.metadata.count,
    format: envelope.metadata.format ?? 'json',
    seed: envelope.metadata.seed,
    version: envelope.metadata.version,
    patternHash: envelope.metadata.patternHash,
    lineage: envelope.metadata.lineage,
    platformReserved: envelope.metadata.platformReserved,
    }),
    preferHistoryFormat: envelope.metadata.format === undefined,
  };
}

async function readArtifactText(artifactPath: string): Promise<string> {
  const file = Bun.file(artifactPath);
  if (!(await file.exists())) {
    throw new PlatformReadyExportError(
      'artifact-not-found',
      `Artifact '${artifactPath}' was not found. Export requires an existing generated artifact or saved-context file.`,
    );
  }

  try {
    return await file.text();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PlatformReadyExportError('artifact-read-failed', `Failed to read artifact '${artifactPath}': ${message}`);
  }
}

function decodePrefixedMetadataComment(
  firstLine: string,
  prefix: string,
  artifactKind: 'CSV' | 'SQL',
): GenerationMetadata {
  if (!firstLine.startsWith(prefix)) {
    throw new PlatformReadyExportError(
      'missing-metadata',
      `${artifactKind} artifact is missing the required generation metadata comment on the first non-empty line.`,
    );
  }

  try {
    return decodeGenerationMetadataComment(firstLine.slice(prefix.length).trim());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PlatformReadyExportError(
      'invalid-metadata',
      `${artifactKind} artifact contains an invalid generation metadata comment: ${message}`,
    );
  }
}

async function parsePlatformReadyArtifact(artifactPath: string): Promise<ParsedPlatformReadyArtifact> {
  const lowerPath = artifactPath.toLowerCase();
  const artifactText = await readArtifactText(artifactPath);

  if (lowerPath.endsWith('.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(artifactText) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new PlatformReadyExportError('invalid-artifact-json', `Invalid JSON in artifact '${artifactPath}': ${message}`);
    }

    if (isSavedContextEnvelope(parsed)) {
      const savedContextMetadata = createMetadataFromSavedContext(parsed);

      return {
        artifact: {
          type: 'saved-context-json',
          format: 'json',
          payload: parsed,
        },
        metadata: savedContextMetadata.metadata,
        preferHistoryFormat: savedContextMetadata.preferHistoryFormat,
      };
    }

    if (isSavedContextEnvelopeCandidate(parsed)) {
      throw new PlatformReadyExportError(
        'invalid-saved-context',
        `JSON artifact '${artifactPath}' looks like a saved-context envelope but its metadata does not match the canonical generation metadata contract.`,
      );
    }

    if (isGeneratedJsonArtifactEnvelope(parsed)) {
      return {
        artifact: {
          type: 'generated-json',
          format: 'json',
          payload: parsed,
        },
        metadata: parsed.metadata,
        preferHistoryFormat: false,
      };
    }

    throw new PlatformReadyExportError(
      'unsupported-artifact',
      `JSON artifact '${artifactPath}' is not a supported generated-output or saved-context envelope.`,
    );
  }

  const firstNonEmptyLine = artifactText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (lowerPath.endsWith('.csv')) {
    const metadata = decodePrefixedMetadataComment(
      firstNonEmptyLine ?? '',
      `# ${GENERATION_METADATA_COMMENT_LABEL}`,
      'CSV',
    );

    return {
      artifact: {
        type: 'generated-csv',
        format: 'csv',
        payload: artifactText,
      },
      metadata,
      preferHistoryFormat: false,
    };
  }

  if (lowerPath.endsWith('.sql')) {
    const metadata = decodePrefixedMetadataComment(
      firstNonEmptyLine ?? '',
      `-- ${GENERATION_METADATA_COMMENT_LABEL}`,
      'SQL',
    );

    return {
      artifact: {
        type: 'generated-sql',
        format: 'sql',
        payload: artifactText,
      },
      metadata,
      preferHistoryFormat: false,
    };
  }

  throw new PlatformReadyExportError(
    'unsupported-artifact',
    `Unsupported artifact '${artifactPath}'. Platform-ready export supports generated JSON, CSV, SQL, and saved-context JSON artifacts only.`,
  );
}

function requireMetadataMatchKey(
  metadata: GenerationMetadata,
  property: 'timestamp' | 'sourcePattern' | 'patternHash',
): string {
  const value = metadata[property];
  if (typeof value !== 'string' || value.length === 0) {
    throw new PlatformReadyExportError(
      'missing-metadata',
      `Artifact metadata must include '${property}' for platform-ready export matching.`,
    );
  }

  return value;
}

function createCanonicalMetadata(
  artifactMetadata: GenerationMetadata,
  historyEntry: GenerationHistoryEntry,
  preferHistoryFormat: boolean,
): GenerationMetadata {
  const historyMetadata = historyEntry.metadata;

  if (artifactMetadata.timestamp !== historyMetadata.timestamp) {
    throw new PlatformReadyExportError('history-mismatch', 'Artifact metadata timestamp does not match the resolved history entry.');
  }

  if ((artifactMetadata.sourcePattern ?? undefined) !== (historyMetadata.sourcePattern ?? undefined)) {
    throw new PlatformReadyExportError('history-mismatch', 'Artifact sourcePattern does not match the resolved history entry.');
  }

  if ((artifactMetadata.patternHash ?? undefined) !== (historyMetadata.patternHash ?? undefined)) {
    throw new PlatformReadyExportError('history-mismatch', 'Artifact patternHash does not match the resolved history entry.');
  }

  if (
    artifactMetadata.count !== undefined
    && historyMetadata.count !== undefined
    && artifactMetadata.count !== historyMetadata.count
  ) {
    throw new PlatformReadyExportError('history-mismatch', 'Artifact count does not match the resolved history entry.');
  }

  return createGenerationMetadata({
    timestamp: artifactMetadata.timestamp,
    sourcePattern: artifactMetadata.sourcePattern ?? historyMetadata.sourcePattern,
    count: artifactMetadata.count ?? historyMetadata.count,
    format: preferHistoryFormat ? historyMetadata.format : artifactMetadata.format ?? historyMetadata.format,
    seed: artifactMetadata.seed ?? historyMetadata.seed,
    version: artifactMetadata.version ?? historyMetadata.version,
    patternHash: artifactMetadata.patternHash ?? historyMetadata.patternHash,
    lineage: artifactMetadata.lineage ?? historyMetadata.lineage,
    platformReserved: artifactMetadata.platformReserved ?? historyMetadata.platformReserved,
  });
}

async function resolveHistoryEntry(
  historyPath: string,
  metadata: GenerationMetadata,
): Promise<GenerationHistoryEntry> {
  const timestamp = requireMetadataMatchKey(metadata, 'timestamp');
  const sourcePattern = requireMetadataMatchKey(metadata, 'sourcePattern');
  const patternHash = requireMetadataMatchKey(metadata, 'patternHash');
  const historyEntries = await queryGenerationHistory(historyPath);
  const matches = historyEntries.filter((entry) =>
    entry.metadata.timestamp === timestamp
    && entry.metadata.sourcePattern === sourcePattern
    && entry.metadata.patternHash === patternHash,
  );

  if (matches.length === 0) {
    throw new PlatformReadyExportError(
      'missing-history',
      `No generation history entry matches artifact metadata (timestamp='${timestamp}', sourcePattern='${sourcePattern}', patternHash='${patternHash}'). This usually means the artifact was generated with --no-history or predates audit persistence.`,
    );
  }

  if (matches.length > 1) {
    throw new PlatformReadyExportError(
      'ambiguous-history',
      `Multiple generation history entries match artifact metadata (timestamp='${timestamp}', sourcePattern='${sourcePattern}', patternHash='${patternHash}'). Export requires a unique audit match and will not guess.`,
    );
  }

  const match = matches[0];
  if (match === undefined) {
    throw new PlatformReadyExportError(
      'missing-history',
      `No generation history entry matches artifact metadata (timestamp='${timestamp}', sourcePattern='${sourcePattern}', patternHash='${patternHash}').`,
    );
  }

  return match;
}

async function resolvePatternSnapshot(
  patternVersionStorePath: string,
  metadata: GenerationMetadata,
): Promise<PatternVersionSnapshot> {
  const patternHash = requireMetadataMatchKey(metadata, 'patternHash');
  const snapshot = await readPatternVersionSnapshot(patternVersionStorePath, patternHash);

  if (snapshot === null) {
    throw new PlatformReadyExportError(
      'missing-pattern-snapshot',
      `No stored pattern-version snapshot exists for patternHash '${patternHash}'. Platform-ready export requires prior snapshot persistence from a history-enabled generation run.`,
    );
  }

  return snapshot;
}

export async function createPlatformReadyExport(
  options: CreatePlatformReadyExportOptions,
): Promise<PlatformReadyExportEnvelope> {
  const parsedArtifact = await parsePlatformReadyArtifact(options.artifactPath);
  const historyEntry = await resolveHistoryEntry(options.historyPath, parsedArtifact.metadata);
  const metadata = createCanonicalMetadata(parsedArtifact.metadata, historyEntry, parsedArtifact.preferHistoryFormat);
  const patternSnapshot = await resolvePatternSnapshot(options.patternVersionStorePath, metadata);

  return {
    contract: 'testdata-generator/platform-ready-export',
    version: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    artifact: parsedArtifact.artifact,
    metadata,
    historyEntry,
    patternSnapshot,
  };
}