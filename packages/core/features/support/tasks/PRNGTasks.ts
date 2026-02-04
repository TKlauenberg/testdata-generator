/**
 * GenerateRandomSequence Task
 *
 * Tasks represent goal-oriented actions that an Actor performs.
 */

import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UsePRNG } from '../abilities/UsePRNG';

export class GenerateRandomSequence {
  /**
   * Generate a sequence of random floats
   */
  static ofFloats(count: number, rngName = 'default', sequenceName?: string): Interaction {
    return Interaction.where(
      `#actor generates ${count} random floats`,
      (actor: UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const rng = prng.getRNG(rngName);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(rng.nextFloat());
        }

        const storeName = sequenceName ?? rngName;
        prng.storeSequence(storeName, values);
      },
    );
  }

  /**
   * Generate a sequence of random integers within a range
   */
  static ofIntegers(
    count: number,
    min: number,
    max: number,
    rngName = 'default',
    sequenceName?: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} random integers between ${min} and ${max}`,
      (actor: UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const rng = prng.getRNG(rngName);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(rng.nextIntRange(min, max));
        }

        const storeName = sequenceName ?? rngName;
        prng.storeSequence(storeName, values);
      },
    );
  }
}
