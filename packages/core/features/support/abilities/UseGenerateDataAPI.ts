/**
 * UseGenerateDataAPI Ability
 *
 * Enables an actor to call the public generateData() API and track results/errors.
 * This is the primary API for end-users (QA testers, developers) to generate test data.
 */

import { Ability, type UsesAbilities, type AbilityType } from '@serenity-js/core';
import {
  generateData,
  ValidationError,
  isContextData,
  type ContextCollectionInput,
  type ContextData,
  type ContextRecord,
} from '../../../src/index';

/**
 * Internal state for tracking generation results
 */
export interface GenerateDataAPIState {
  dslSource: string;
  records: Record<string, unknown>[];
  recordsSecondSequence: Record<string, unknown>[];
  contextCollections: Record<string, ContextCollectionInput>;
  lastError: Error | null;
  generationStarted: boolean;
  generationDuration: number;
}

/**
 * Ability to use the public generateData() API
 */
export class UseGenerateDataAPI extends Ability {
  private readonly _state: GenerateDataAPIState = {
    dslSource: '',
    records: [],
    recordsSecondSequence: [],
    contextCollections: {},
    lastError: null,
    generationStarted: false,
    generationDuration: 0,
  };

  public static withDefaultCapabilities(): UseGenerateDataAPI {
    return new UseGenerateDataAPI();
  }

  public static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
  }

  /**
   * Store DSL source code for later generation
   */
  public storeDSLSource(source: string): void {
    this._state.dslSource = source;
    this._state.records = [];
    this._state.recordsSecondSequence = [];
    this._state.lastError = null;
    this._state.generationStarted = false;
  }

  public storeContextCollection(name: string, records: readonly ContextRecord[]): void {
    this._state.contextCollections[name] = records;
  }

  public storeTaggedContextCollection(name: string, context: ContextData): void {
    const current = this._state.contextCollections[name];
    if (current === undefined) {
      this._state.contextCollections[name] = [context];
      return;
    }

    if (isContextData(current)) {
      this._state.contextCollections[name] = [current, context];
      return;
    }

    if (Array.isArray(current) && current.every((item) => isContextData(item))) {
      this._state.contextCollections[name] = [...current, context];
      return;
    }

    this._state.contextCollections[name] = [
      {
        records: current as readonly ContextRecord[],
        metadata: {
          source: `${name}:inline`,
          format: 'json',
          loadedAt: new Date().toISOString(),
          recordCount: (current as readonly ContextRecord[]).length,
          tags: [],
        },
      },
      context,
    ];
  }

  /**
   * Generate records using the public API (expects success)
   */
  public async generateRecords(count: number, seed?: number): Promise<void> {
    const startTime = performance.now();
    this._state.generationStarted = true;
    this._state.records = [];

    try {
      const options = seed !== undefined
        ? { count, seed, context: this._state.contextCollections }
        : { count, context: this._state.contextCollections };
      const recordStream = generateData(this._state.dslSource, options);

      for await (const record of recordStream) {
        this._state.records.push(record);
      }

      this._state.generationDuration = performance.now() - startTime;
    } catch (error) {
      this._state.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Generate records with seed, optionally storing as second sequence
   */
  public async generateRecordsWithSeed(
    count: number,
    seed: number,
    storeAsSecond: boolean = false,
  ): Promise<void> {
    const startTime = performance.now();
    this._state.generationStarted = true;

    try {
      const recordStream = generateData(this._state.dslSource, {
        count,
        seed,
        context: this._state.contextCollections,
      });
      const records: Record<string, unknown>[] = [];

      for await (const record of recordStream) {
        records.push(record);
      }

      if (storeAsSecond) {
        this._state.recordsSecondSequence = records;
      } else {
        this._state.records = records;
      }

      this._state.generationDuration = performance.now() - startTime;
    } catch (error) {
      this._state.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Attempt to generate records (catches ValidationError for assertion)
   */
  public async attemptGenerateRecords(count: number): Promise<void> {
    const startTime = performance.now();

    try {
      this._state.generationStarted = false; // Track if we even started
      const recordStream = generateData(this._state.dslSource, {
        count,
        context: this._state.contextCollections,
      });

      // If we get here, validation passed
      this._state.generationStarted = true;
      this._state.records = [];

      for await (const record of recordStream) {
        this._state.records.push(record);
      }

      this._state.generationDuration = performance.now() - startTime;
    } catch (error) {
      this._state.lastError = error as Error;
      this._state.generationDuration = performance.now() - startTime;

      // Don't throw - we want to assert on the error
      if (error instanceof ValidationError) {
        // Validation error happened before generation - that's what we're testing
        this._state.generationStarted = false;
      } else {
        // Some other error - still caught for assertion
        this._state.generationStarted = true;
      }
    }
  }

  /**
   * Get generated records (primary sequence)
   */
  public getRecords(): Record<string, unknown>[] {
    return this._state.records;
  }

  /**
   * Get generated records (second sequence for comparison)
   */
  public getRecordsSecondSequence(): Record<string, unknown>[] {
    return this._state.recordsSecondSequence;
  }

  /**
   * Get last error (if any)
   */
  public getLastError(): Error | null {
    return this._state.lastError;
  }

  /**
   * Check if generation started (vs failed validation immediately)
   */
  public didGenerationStart(): boolean {
    return this._state.generationStarted;
  }

  /**
   * Get generation duration in milliseconds
   */
  public getGenerationDuration(): number {
    return this._state.generationDuration;
  }
}
