/**
 * UseGenerators Ability
 *
 * Enables an actor to generate random data using primitive generators
 */

import { Ability, type UsesAbilities, type AbilityType } from '@serenity-js/core';
import { createRNG, type RNG } from '../../../src/generator/rng';

export interface GeneratorState {
  sequences: Map<string, unknown[]>;
  sequentialGenerators: Map<string, () => number>;
  lastError: Error | null;
}

export class UseGenerators extends Ability {
  private readonly _state: GeneratorState = {
    sequences: new Map(),
    sequentialGenerators: new Map(),
    lastError: null,
  };

  public static withDefaultCapabilities(): UseGenerators {
    return new UseGenerators();
  }

  public static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
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

  public storeSequentialGenerator(name: string, generator: () => number): void {
    this._state.sequentialGenerators.set(name, generator);
  }

  public getSequentialGenerator(name: string): () => number {
    const generator = this._state.sequentialGenerators.get(name);
    if (!generator) {
      throw new Error(`Sequential generator "${name}" not found`);
    }
    return generator;
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
