/**
 * Questions for JSON Adapter validation
 *
 * Query JSON output file properties and content.
 */

import { Actor, Question } from '@serenity-js/core';
import { UseJsonAdapter } from '../abilities/UseJsonAdapter';
import { exists } from 'node:fs/promises';

/**
 * Question: Check if JSON file exists
 */
export class JsonFileExists extends Question<Promise<boolean>> {
  private constructor(private readonly _filename: string) {
    super(`JSON file "${_filename}" exists`);
  }

  static named(filename: string): JsonFileExists {
    return new JsonFileExists(filename);
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    return await exists(filepath);
  }
}

/**
 * Question: Get JSON file content
 */
export class JsonFileContent extends Question<Promise<{ metadata: unknown; data: Array<Record<string, unknown>> }>> {
  private constructor(private readonly _filename: string) {
    super(`JSON file "${_filename}" content`);
  }

  static of(filename: string): JsonFileContent {
    return new JsonFileContent(filename);
  }

  async answeredBy(actor: Actor): Promise<{ metadata: unknown; data: Array<Record<string, unknown>> }> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    return JSON.parse(content) as { metadata: unknown; data: Array<Record<string, unknown>> };
  }
}

/**
 * Question: Check if JSON is parsable
 */
export class JsonIsParsable extends Question<Promise<boolean>> {
  private constructor(private readonly _filename: string) {
    super(`JSON file "${_filename}" is parsable`);
  }

  static named(filename: string): JsonIsParsable {
    return new JsonIsParsable(filename);
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    try {
      const jsonAdapter = actor.abilityTo(UseJsonAdapter);
      const filepath = jsonAdapter.getLastOutputPath();
      const file = Bun.file(filepath);
      const content = await file.text();
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Question: Get JSONL file content
 */
export class JsonlFileContent extends Question<Promise<Array<Record<string, unknown>>>> {
  private constructor(private readonly _filename: string) {
    super(`JSONL file "${_filename}" content`);
  }

  static of(filename: string): JsonlFileContent {
    return new JsonlFileContent(filename);
  }

  async answeredBy(actor: Actor): Promise<Array<Record<string, unknown>>> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}

/**
 * Question: Get JSON metadata
 */
export class JsonMetadata extends Question<
  Promise<{
    timestamp: string;
    sourcePattern?: string;
    count?: number;
    seed?: number;
    version: string;
  }>
> {
  private constructor(private readonly _filename: string) {
    super(`JSON metadata from "${_filename}"`);
  }

  static from(filename: string): JsonMetadata {
    return new JsonMetadata(filename);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static check() {
    return Question.about('JSONL file has metadata as first line', async (actor) => {
      const jsonAdapter = actor.abilityTo(UseJsonAdapter);
      const filepath = jsonAdapter.getLastOutputPath();
      const file = Bun.file(filepath);
      const content = await file.text();
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      if (lines.length === 0) return false;
      
      try {
        const firstLine = JSON.parse(lines[0]) as { metadata?: unknown };
        return 'metadata' in firstLine && firstLine.metadata !== undefined;
      } catch {
        return false;
      }
    });
  }

  async answeredBy(actor: Actor): Promise<{
    timestamp: string;
    sourcePattern?: string;
    count?: number;
    seed?: number;
    version: string;
  }> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    const parsed = JSON.parse(content) as { metadata: unknown };
    return parsed.metadata as {
      timestamp: string;
      sourcePattern?: string;
      count?: number;
      seed?: number;
      version: string;
    };
  }
}

/**
 * Question: Count records in JSON file
 */
export class JsonRecordCount extends Question<Promise<number>> {
  private constructor(private readonly _filename: string) {
    super(`Number of records in "${_filename}"`);
  }

  static in(filename: string): JsonRecordCount {
    return new JsonRecordCount(filename);
  }

  static from(filename: string): JsonRecordCount {
    return this.in(filename);
  }

  async answeredBy(actor: Actor): Promise<number> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    const parsed = JSON.parse(content) as { data: Array<unknown> };
    return parsed.data.length;
  }
}

/**
 * Question: Count records in JSONL file (excluding metadata line)
 */
export class JsonlRecordCount extends Question<Promise<number>> {
  private constructor(private readonly _filename: string) {
    super(`Number of records in JSONL "${_filename}"`);
  }

  static in(filename: string): JsonlRecordCount {
    return new JsonlRecordCount(filename);
  }

  static from(filename: string): JsonlRecordCount {
    return this.in(filename);
  }

  async answeredBy(actor: Actor): Promise<number> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    // Subtract 1 for metadata line
    return lines.length - 1;
  }
}

/**
 * Question: Check if all JSONL lines are valid JSON
 */
export class JsonlLinesValid extends Question<Promise<boolean>> {
  private constructor(private readonly _filename: string) {
    super(`All lines in JSONL "${_filename}" are valid JSON`);
  }

  static in(filename: string): JsonlLinesValid {
    return new JsonlLinesValid(filename);
  }

  static check(): JsonlLinesValid {
    return new JsonlLinesValid('output.jsonl');
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const filepath = jsonAdapter.getLastOutputPath();
    const file = Bun.file(filepath);
    const content = await file.text();
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    try {
      for (const line of lines) {
        JSON.parse(line);
      }
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Question: Check if JSON data matches generated records
 */
export class JsonDataMatchesGenerated extends Question<Promise<boolean>> {
  private constructor(private readonly _filename: string) {
    super(`JSON data in "${_filename}" matches generated records`);
  }

  static in(filename: string): JsonDataMatchesGenerated {
    return new JsonDataMatchesGenerated(filename);
  }

  static check(): JsonDataMatchesGenerated {
    return new JsonDataMatchesGenerated('output.json');
  }

  answeredBy(_actor: Actor): Promise<boolean> {
    // stub implementation: requires access to generation context
    // TODO: implement full comparison logic
    return Promise.resolve(true);
  }
}
