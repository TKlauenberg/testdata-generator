/**
 * Generator Tasks
 *
 * Tasks for generating random data with primitive generators
 */

import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UseGenerators } from '../abilities/UseGenerators';
import {
  randomInt,
  randomFloat,
  randomBoolean,
  randomString,
  CHARSET_ALPHA,
} from '../../../src/generator/generators';

export class GenerateIntegers {
  public static between(
    min: number,
    max: number,
    count: number,
    seed: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} integers between ${min} and ${max}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(randomInt(rng, min, max));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class GenerateFloats {
  public static between(
    min: number,
    max: number,
    count: number,
    seed: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} floats between ${min} and ${max}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(randomFloat(rng, min, max));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class GenerateBooleans {
  public static count(count: number, seed: number, sequenceName: string): Interaction {
    return Interaction.where(
      `#actor generates ${count} booleans`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: boolean[] = [];
        for (let i = 0; i < count; i++) {
          values.push(randomBoolean(rng));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class GenerateStrings {
  public static ofLength(
    length: number,
    count: number,
    seed: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} strings of length ${length}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: string[] = [];
        for (let i = 0; i < count; i++) {
          values.push(randomString(rng, length));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class GenerateStringsWithCharset {
  public static ofLength(
    length: number,
    charsetType: 'alpha' | 'numeric' | 'alphanumeric',
    count: number,
    seed: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} ${charsetType} strings of length ${length}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const charset = charsetType === 'alpha' ? CHARSET_ALPHA : undefined;

        const values: string[] = [];
        for (let i = 0; i < count; i++) {
          values.push(
            charset ? randomString(rng, length, charset) : randomString(rng, length),
          );
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class TryGenerateIntegerWithInvalidRange {
  public static withMinMax(min: number, max: number): Interaction {
    return Interaction.where(
      '#actor tries to generate integer with invalid range',
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(42);

        try {
          randomInt(rng, min, max);
        } catch (error) {
          generators.storeError(error as Error);
        }
      },
    );
  }
}

export class TryGenerateStringWithNegativeLength {
  public static ofLength(length: number): Interaction {
    return Interaction.where(
      '#actor tries to generate string with negative length',
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(42);

        try {
          randomString(rng, length);
        } catch (error) {
          generators.storeError(error as Error);
        }
      },
    );
  }
}

export class TryGenerateStringWithEmptyCharset {
  public static attempt(): Interaction {
    return Interaction.where(
      '#actor tries to generate string with empty charset',
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(42);

        try {
          randomString(rng, 10, '');
        } catch (error) {
          generators.storeError(error as Error);
        }
      },
    );
  }
}
