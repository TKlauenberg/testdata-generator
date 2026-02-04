/**
 * UseGenerators Ability
 *
 * Enables an actor to generate random data using primitive generators
 */

import { Ability, type UsesAbilities } from '@serenity-js/core';
import { createRNG, type RNG } from '../../../src/generator/rng';

export interface GeneratorState {
  sequences: Map<string, unknown[]>;
  lastError: Error | null;
}

export class UseGenerators extends Ability {
  private readonly _state: GeneratorState = {
    sequences: new Map(),
    lastError: null,
  };

  public static withDefaultCapabilities(): UseGenerators {
    return new UseGenerators();
  }

  public static as(actor: UsesAbilities): UseGenerators {
    return actor.abilityTo(UseGenerators);
  }

  public createRNG(seed: number): RNG {
    return createRNG(seed);
  }

  public storeSequence(name: string, values: unknown[]): void {
    this._state.sequences.set(name, values);
  }

  public getSequence(name: string): unknown[] {
    return this._state.sequences.get(name) ?? [];
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
