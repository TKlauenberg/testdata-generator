import { appendFile, mkdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { GenerationMetadata } from '../common';
import { isGenerationMetadata } from '../common';

export const HISTORY_LOG_FILE_NAME = '.td-history.jsonl';

export type GenerationHistoryStatus = 'success' | 'failure';

export interface GenerationHistoryEntry {
  readonly metadata: GenerationMetadata;
  readonly status: GenerationHistoryStatus;
  readonly errorMessage?: string;
  readonly durationMs: number;
  readonly recordsPerSecond: number;
  readonly outputPath?: string;
  readonly savedContextName?: string;
}

export interface CreateGenerationHistoryEntryOptions {
  readonly metadata: GenerationMetadata;
  readonly status: GenerationHistoryStatus;
  readonly errorMessage?: string;
  readonly durationMs: number;
  readonly recordsPerSecond: number;
  readonly outputPath?: string;
  readonly savedContextName?: string;
}

export interface QueryGenerationHistoryOptions {
  readonly last?: number;
}

export class GenerationHistoryParseError extends Error {
  readonly lineNumber: number;

  constructor(lineNumber: number, message: string) {
    super(message);
    this.name = 'GenerationHistoryParseError';
    this.lineNumber = lineNumber;
  }
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isGenerationHistoryEntry(value: unknown): value is GenerationHistoryEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GenerationHistoryEntry>;

  return isGenerationMetadata(candidate.metadata)
    && (candidate.status === 'success' || candidate.status === 'failure')
    && (candidate.errorMessage === undefined || typeof candidate.errorMessage === 'string')
    && isNonNegativeNumber(candidate.durationMs)
    && isNonNegativeNumber(candidate.recordsPerSecond)
    && (candidate.outputPath === undefined || typeof candidate.outputPath === 'string')
    && (candidate.savedContextName === undefined || typeof candidate.savedContextName === 'string');
}

export function createGenerationHistoryEntry(
  options: CreateGenerationHistoryEntryOptions,
): GenerationHistoryEntry {
  if (options.status === 'failure') {
    const errorMessage = options.errorMessage?.trim();
    if (errorMessage === undefined || errorMessage.length === 0) {
      throw new Error('Failure history entries must include an errorMessage');
    }
  }

  if (!isNonNegativeNumber(options.durationMs)) {
    throw new Error('History durationMs must be a non-negative finite number');
  }

  if (!isNonNegativeNumber(options.recordsPerSecond)) {
    throw new Error('History recordsPerSecond must be a non-negative finite number');
  }

  return {
    metadata: options.metadata,
    status: options.status,
    errorMessage: options.status === 'failure' ? options.errorMessage?.trim() : undefined,
    durationMs: options.durationMs,
    recordsPerSecond: options.recordsPerSecond,
    outputPath: options.outputPath,
    savedContextName: options.savedContextName,
  };
}

export async function appendGenerationHistoryEntry(
  historyPath: string,
  entry: GenerationHistoryEntry,
): Promise<void> {
  await mkdir(path.dirname(historyPath), { recursive: true });
  await appendFile(historyPath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

export async function readGenerationHistory(historyPath: string): Promise<readonly GenerationHistoryEntry[]> {
  let content: string;

  try {
    content = await readFile(historyPath, 'utf-8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const entries: GenerationHistoryEntry[] = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmedLine) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GenerationHistoryParseError(index + 1, `Invalid JSON in history log at line ${index + 1}: ${message}`);
    }

    if (!isGenerationHistoryEntry(parsed)) {
      throw new GenerationHistoryParseError(index + 1, `Invalid history entry at line ${index + 1}`);
    }

    entries.push(parsed);
  }

  return entries;
}

export async function queryGenerationHistory(
  historyPath: string,
  options: QueryGenerationHistoryOptions = {},
): Promise<readonly GenerationHistoryEntry[]> {
  const entries = await readGenerationHistory(historyPath);

  if (options.last === undefined) {
    return entries;
  }

  if (!Number.isInteger(options.last) || options.last < 0) {
    throw new Error('History query option last must be a non-negative integer');
  }

  if (options.last === 0) {
    return [];
  }

  return entries.slice(Math.max(0, entries.length - options.last));
}