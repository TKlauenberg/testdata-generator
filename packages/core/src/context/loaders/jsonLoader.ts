import { err, ok } from '../../common/result';
import type { Result } from '../../common/result';
import type { ContextData, ContextRecord } from '../types';

function isObjectRecord(value: unknown): value is ContextRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeContextPayload(
  parsedJson: unknown,
  filePath: string,
): Result<readonly ContextRecord[], string> {
  if (isObjectRecord(parsedJson)) {
    return ok([parsedJson]);
  }

  if (Array.isArray(parsedJson)) {
    for (const [index, item] of parsedJson.entries()) {
      if (!isObjectRecord(item)) {
        return err(
          `Invalid JSON context array in "${filePath}": expected only objects, found non-object at index ${index}`,
        );
      }
    }

    return ok(parsedJson);
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

  const records = recordsResult.value;

  return {
    records,
    metadata: {
      source: filePath,
      format: 'json',
      loadedAt: new Date().toISOString(),
      recordCount: records.length,
    },
  };
}
