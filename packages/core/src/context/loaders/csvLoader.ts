import { err, ok } from '../../common/result';
import {
  decodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
} from '../../common';
import type {
  GenerationMetadataFormat,
  GenerationMetadataLineageEntry,
  GenerationMetadataPlatformReserved,
} from '../../common';
import type { Result } from '../../common/result';
import type { ContextData, ContextRecord, JsonValue } from '../types';

function normalizeHeader(header: string): Result<string, string> {
  const normalized = header.trim();

  if (normalized.length === 0) {
    return err('CSV header names must be non-empty');
  }

  return ok(normalized);
}

function inferCsvPrimitive(rawValue: string): JsonValue {
  const trimmed = rawValue.trim();
  const lowered = trimmed.toLowerCase();

  if (lowered === 'true') {
    return true;
  }

  if (lowered === 'false') {
    return false;
  }

  const numericPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
  if (numericPattern.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return rawValue;
}

function mapRowToRecord(
  headers: readonly string[],
  row: readonly string[],
  rowNumber: number,
): Result<ContextRecord, string> {
  if (row.length !== headers.length) {
    return err(
      `Malformed CSV row ${rowNumber}: expected ${headers.length} columns but found ${row.length}`,
    );
  }

  const record: Record<string, JsonValue> = {};
  for (const [index, header] of headers.entries()) {
    record[header] = inferCsvPrimitive(row[index] ?? '');
  }

  return ok(record);
}

function isRowBlank(row: readonly string[]): boolean {
  return row.every((cell) => cell.length === 0);
}

function extractMetadataCommentPayload(row: readonly string[]): string | undefined {
  if (row.length !== 1) {
    return undefined;
  }

  const trimmed = row[0]?.trim();
  const prefix = `# ${GENERATION_METADATA_COMMENT_LABEL}`;

  if (!trimmed?.startsWith(prefix)) {
    return undefined;
  }

  return trimmed.slice(prefix.length).trim();
}

export async function parseCsvStream(
  stream: ReadableStream<Uint8Array>,
  onRow: (row: readonly string[]) => Result<void, string>,
): Promise<Result<void, string>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;
  let pendingQuoteInQuotedField = false;
  let justClosedQuote = false;

  const pushCell = (): void => {
    currentRow.push(currentCell);
    currentCell = '';
    justClosedQuote = false;
  };

  const emitRow = (): Result<void, string> => {
    pushCell();
    const result = onRow(currentRow);
    currentRow = [];
    return result;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      for (let index = 0; index < chunk.length; index += 1) {
        const char = chunk[index];

        if (pendingQuoteInQuotedField) {
          if (char === '"') {
            currentCell += '"';
            pendingQuoteInQuotedField = false;
            continue;
          }

          inQuotes = false;
          justClosedQuote = true;
          pendingQuoteInQuotedField = false;
        }

        if (justClosedQuote) {
          if (char === ' ' || char === '\t') {
            continue;
          }

          if (char !== ',' && char !== '\n' && char !== '\r') {
            return err(
              `Malformed CSV: unexpected character "${char}" after closing quote`,
            );
          }
        }

        if (char === '"') {
          if (!inQuotes) {
            if (currentCell.length > 0) {
              return err('Malformed CSV: unexpected quote in unquoted field');
            }
            inQuotes = true;
            continue;
          }

          pendingQuoteInQuotedField = true;
          continue;
        }

        if (char === ',' && !inQuotes) {
          pushCell();
          continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && chunk[index + 1] === '\n') {
            index += 1;
          }

          const emitted = emitRow();
          if (!emitted.ok) {
            return emitted;
          }
          continue;
        }

        currentCell += char;
      }
    }

    const finalChunk = decoder.decode();
    for (let index = 0; index < finalChunk.length; index += 1) {
      const char = finalChunk[index];

      if (pendingQuoteInQuotedField) {
        if (char === '"') {
          currentCell += '"';
          pendingQuoteInQuotedField = false;
          continue;
        }

        inQuotes = false;
        justClosedQuote = true;
        pendingQuoteInQuotedField = false;
      }

      if (justClosedQuote) {
        if (char === ' ' || char === '\t') {
          continue;
        }

        if (char !== ',' && char !== '\n' && char !== '\r') {
          return err(
            `Malformed CSV: unexpected character "${char}" after closing quote`,
          );
        }
      }

      if (char === '"') {
        if (!inQuotes) {
          if (currentCell.length > 0) {
            return err('Malformed CSV: unexpected quote in unquoted field');
          }
          inQuotes = true;
          continue;
        }

        pendingQuoteInQuotedField = true;
        continue;
      }

      if (char === ',' && !inQuotes) {
        pushCell();
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && finalChunk[index + 1] === '\n') {
          index += 1;
        }

        const emitted = emitRow();
        if (!emitted.ok) {
          return emitted;
        }
        continue;
      }

      currentCell += char;
    }

    if (pendingQuoteInQuotedField) {
      inQuotes = false;
      justClosedQuote = true;
      pendingQuoteInQuotedField = false;
    }

    if (inQuotes) {
      return err('Malformed CSV: unterminated quoted field');
    }

    if (currentCell.length > 0 || currentRow.length > 0 || justClosedQuote) {
      const emitted = emitRow();
      if (!emitted.ok) {
        return emitted;
      }
    }

    return ok(undefined);
  } finally {
    reader.releaseLock();
  }
}

export async function loadCsvContext(filePath: string): Promise<ContextData> {
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new Error(`CSV context file not found: ${filePath}`);
  }

  const records: ContextRecord[] = [];
  let headers: readonly string[] | null = null;
  let csvRowNumber = 0;
  let generationMetadata:
    | {
        readonly timestamp: string;
        readonly sourcePattern?: string;
        readonly format: GenerationMetadataFormat;
        readonly version: string;
        readonly seed?: number;
        readonly patternHash?: string;
        readonly lineage?: readonly GenerationMetadataLineageEntry[];
        readonly platformReserved?: GenerationMetadataPlatformReserved;
      }
    | undefined;

  let parseResult: Result<void, string>;
  try {
    parseResult = await parseCsvStream(file.stream(), (row) => {
      if (row.length === 1 && row[0] === '' && headers === null) {
        return ok(undefined);
      }

      if (headers === null) {
        const metadataPayload = extractMetadataCommentPayload(row);
        if (metadataPayload !== undefined) {
          try {
            const decoded = decodeGenerationMetadataComment(metadataPayload);
            generationMetadata = {
              timestamp: decoded.timestamp,
              sourcePattern: decoded.sourcePattern,
              format: decoded.format,
              version: decoded.version,
              seed: decoded.seed,
              patternHash: decoded.patternHash,
              lineage: decoded.lineage,
              platformReserved: decoded.platformReserved,
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return err(`Invalid CSV metadata comment: ${message}`);
          }

          return ok(undefined);
        }
      }

      csvRowNumber += 1;

      if (headers === null) {
        if (isRowBlank(row)) {
          return err('CSV header row must not be empty');
        }

        const normalizedHeaders: string[] = [];
        const seenHeaders = new Set<string>();
        for (const header of row) {
          const normalized = normalizeHeader(header);
          if (!normalized.ok) {
            return normalized;
          }

          if (seenHeaders.has(normalized.value)) {
            return err(`CSV header names must be unique: duplicate "${normalized.value}"`);
          }

          seenHeaders.add(normalized.value);
          normalizedHeaders.push(normalized.value);
        }
        headers = normalizedHeaders;
        return ok(undefined);
      }

      if (isRowBlank(row)) {
        return ok(undefined);
      }

      const rowResult = mapRowToRecord(headers, row, csvRowNumber);
      if (!rowResult.ok) {
        return rowResult;
      }

      records.push(rowResult.value);
      return ok(undefined);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read CSV context file "${filePath}": ${message}`);
  }

  if (!parseResult.ok) {
    throw new Error(`Invalid CSV in context file "${filePath}": ${parseResult.errors}`);
  }

  if (headers === null) {
    throw new Error(`Invalid CSV in context file "${filePath}": CSV content is empty`);
  }

  return {
    records,
    metadata: {
      source: filePath,
      format: 'csv',
      loadedAt: new Date().toISOString(),
      recordCount: records.length,
      tags: [],
      generationFormat: generationMetadata?.format,
      timestamp: generationMetadata?.timestamp,
      sourcePattern: generationMetadata?.sourcePattern,
      version: generationMetadata?.version,
      seed: generationMetadata?.seed,
      patternHash: generationMetadata?.patternHash,
      lineage: generationMetadata?.lineage,
      platformReserved: generationMetadata?.platformReserved,
    },
  };
}