/**
 * Tasks for JSON Adapter operations
 *
 * High-level actions for writing generated records to JSON files.
 */

import { Actor, Task } from '@serenity-js/core';
import { UseJsonAdapter } from '../abilities/UseJsonAdapter';
import { UseRecordGeneration } from '../abilities/UseRecordGeneration';

/**
 * Task: Write generated records to JSON file
 */
export class WriteRecordsToJson extends Task {
  private constructor(
    private readonly _filename: string,
    private readonly _format: 'array' | 'jsonl',
    private readonly _metadata?: Partial<{ sourcePattern: string; count: number; seed: number }>,
  ) {
    super(`Write records to JSON file "${_filename}" in ${_format} format`);
  }

  /**
   * Create task to write to array format
   */
  static arrayFile(filename: string): WriteRecordsToJson {
    return new WriteRecordsToJson(filename, 'array');
  }

  /**
   * Create task to write to JSONL format
   */
  static jsonlFile(filename: string): WriteRecordsToJson {
    return new WriteRecordsToJson(filename, 'jsonl');
  }

  /**
   * Add metadata to the output
   */
  withMetadata(metadata: Partial<{ sourcePattern: string; count: number; seed: number }>): WriteRecordsToJson {
    return new WriteRecordsToJson(this._filename, this._format, metadata);
  }

  /**
   * Execute the task
   */
  async performAs(actor: Actor): Promise<void> {
    const jsonAdapter = actor.abilityTo(UseJsonAdapter);
    const recordGen = actor.abilityTo(UseRecordGeneration);

    // Get the records stream
    const records = recordGen.getRecordsStream();

    // Write to JSON file
    await jsonAdapter.writeToFile(records, this._filename, this._format, this._metadata);
  }
}

/**
 * Task: Set generation options
 */
export class ConfigureGeneration extends Task {
  private constructor(
    private readonly _config: {
      recordCount?: number;
      sourcePattern?: string;
      seed?: number;
    },
  ) {
    super('Configure generation options');
  }

  /**
   * Set record count
   */
  static withRecordCount(count: number): ConfigureGeneration {
    return new ConfigureGeneration({ recordCount: count });
  }

  /**
   * Set source pattern
   */
  static withSourcePattern(pattern: string): ConfigureGeneration {
    return new ConfigureGeneration({ sourcePattern: pattern });
  }

  /**
   * Set seed
   */
  static withSeed(seed: number): ConfigureGeneration {
    return new ConfigureGeneration({ seed });
  }

  /**
   * Add record count to configuration
   */
  andRecordCount(count: number): ConfigureGeneration {
    return new ConfigureGeneration({ ...this._config, recordCount: count });
  }

  /**
   * Add source pattern to configuration
   */
  andSourcePattern(pattern: string): ConfigureGeneration {
    return new ConfigureGeneration({ ...this._config, sourcePattern: pattern });
  }

  /**
   * Add seed to configuration
   */
  andSeed(seed: number): ConfigureGeneration {
    return new ConfigureGeneration({ ...this._config, seed });
  }

  /**
   * Execute the task
   */
  async performAs(actor: Actor): Promise<void> {
    // Store configuration in actor's memory for later use
    await actor.remember('generationConfig', this._config);
  }
}
