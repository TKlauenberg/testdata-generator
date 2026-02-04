/**
 * UsePRNG Ability
 *
 * Grants an Actor the ability to create and use random number generators.
 */

import { Ability } from '@serenity-js/core';
import { createRNG, type RNG } from '../../../src/generator/rng';

export class UsePRNG extends Ability {
  private _rngInstances = new Map<string, RNG>();
  private _sequences = new Map<string, number[]>();

  /**
   * Factory method to create UsePRNG ability
   */
  static withCoreLibrary(): UsePRNG {
    return new UsePRNG();
  }

  /**
   * Create an RNG instance with a specific seed
   * @param seed - Seed value for deterministic generation
   * @param name - Optional name to identify this RNG (e.g., "A", "B")
   */
  createRNG(seed: number, name = 'default'): RNG {
    const rng = createRNG(seed);
    this._rngInstances.set(name, rng);
    return rng;
  }

  /**
   * Get a previously created RNG instance by name
   */
  getRNG(name = 'default'): RNG {
    const rng = this._rngInstances.get(name);
    if (!rng) {
      throw new Error(`RNG instance "${name}" not found. Create it first.`);
    }
    return rng;
  }

  /**
   * Store a generated sequence for later verification
   */
  storeSequence(name: string, values: number[]): void {
    this._sequences.set(name, values);
  }

  /**
   * Get a stored sequence by name
   */
  getSequence(name: string): number[] {
    const sequence = this._sequences.get(name);
    if (!sequence) {
      throw new Error(`Sequence "${name}" not found.`);
    }
    return sequence;
  }

  /**
   * Clear all RNG instances and sequences
   */
  reset(): void {
    this._rngInstances.clear();
    this._sequences.clear();
  }
}
