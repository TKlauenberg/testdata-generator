/**
 * UseRecordGeneration Ability
 *
 * Enables an actor to generate records from validated schemas
 */

import { Ability, type UsesAbilities } from '@serenity-js/core';
import { createRNG, type RNG } from '../../../src/generator/rng';
import type { ValidatedSchema } from '../../../src/analyzer/types';
import type { GeneratedRecord } from '../../../src/generator/generator';

export interface RecordGenerationState {
  schema: ValidatedSchema | null;
  rngs: Map<string, RNG>;
  records: Map<string, GeneratedRecord>;
  multipleRecords: GeneratedRecord[];
  lastError: Error | null;
}

export class UseRecordGeneration extends Ability {
  private readonly _state: RecordGenerationState = {
    schema: null,
    rngs: new Map(),
    records: new Map(),
    multipleRecords: [],
    lastError: null,
  };

  public static withDefaultCapabilities(): UseRecordGeneration {
    return new UseRecordGeneration();
  }

  public static as(actor: UsesAbilities): UseRecordGeneration {
    return actor.abilityTo(UseRecordGeneration);
  }

  public setSchema(schema: ValidatedSchema): void {
    this._state.schema = schema;
  }

  public getSchema(): ValidatedSchema | null {
    return this._state.schema;
  }

  public createRNG(seed: number, name: string = 'default'): RNG {
    const rng = createRNG(seed);
    this._state.rngs.set(name, rng);
    return rng;
  }

  public getRNG(name: string = 'default'): RNG | undefined {
    return this._state.rngs.get(name);
  }

  public storeRecord(name: string, record: GeneratedRecord): void {
    this._state.records.set(name, record);
    // Clear multiple records when storing single record to avoid context confusion
    this._state.multipleRecords = [];
  }

  public getRecord(name: string = 'record1'): GeneratedRecord | undefined {
    return this._state.records.get(name);
  }

  public storeMultipleRecords(records: GeneratedRecord[]): void {
    this._state.multipleRecords = records;
    // Clear single records when storing multiple to avoid context confusion
    this._state.records.clear();
  }

  public getMultipleRecords(): GeneratedRecord[] {
    return this._state.multipleRecords;
  }

  public storeError(error: Error): void {
    this._state.lastError = error;
  }

  public getLastError(): Error | null {
    return this._state.lastError;
  }

  public clearError(): void {
    this._state.lastError = null;
  }
}
