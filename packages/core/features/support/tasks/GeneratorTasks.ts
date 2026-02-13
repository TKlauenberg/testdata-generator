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
  uuid,
  sequential,
  nanoid,
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

// Identity Generators

export class GenerateUUIDs {
  public static count(count: number, seed: number, sequenceName: string): Interaction {
    return Interaction.where(
      `#actor generates ${count} UUIDs`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: string[] = [];
        for (let i = 0; i < count; i++) {
          values.push(uuid(rng));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class GenerateSequentialIDs {
  public static count(
    count: number,
    startValue: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} sequential IDs from ${startValue}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const gen = sequential(startValue);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(gen());
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class CreateSequentialGenerator {
  public static withStart(
    generatorName: string,
    startValue: number,
  ): Interaction {
    return Interaction.where(
      `#actor creates sequential generator ${generatorName} starting from ${startValue}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const gen = sequential(startValue);
        generators.storeSequentialGenerator(generatorName, gen);
      },
    );
  }
}

export class GenerateFromSequentialGenerator {
  public static count(
    generatorName: string,
    count: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} IDs from generator ${generatorName}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const gen = generators.getSequentialGenerator(generatorName);

        const values: number[] = [];
        for (let i = 0; i < count; i++) {
          values.push(gen());
        }

        // Append to existing sequence or create new one
        const existing = generators.getSequence(sequenceName) || [];
        generators.storeSequence(sequenceName, [...existing, ...values]);
      },
    );
  }
}

export class GenerateNanoIDs {
  public static ofLength(
    length: number,
    count: number,
    seed: number,
    sequenceName: string,
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} NanoIDs of length ${length}`,
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        const values: string[] = [];
        for (let i = 0; i < count; i++) {
          values.push(nanoid(rng, length));
        }

        generators.storeSequence(sequenceName, values);
      },
    );
  }
}

export class TryCreateSequentialWithInvalidStart {
  public static withStart(startValue: number): Interaction {
    return Interaction.where(
      '#actor tries to create sequential generator with invalid start',
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);

        try {
          sequential(startValue);
        } catch (error) {
          generators.storeError(error as Error);
        }
      },
    );
  }
}

export class TryGenerateNanoIDWithInvalidLength {
  public static withLength(length: number, seed: number): Interaction {
    return Interaction.where(
      '#actor tries to generate NanoID with invalid length',
      (actor: UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const rng = generators.createRNG(seed);

        try {
          nanoid(rng, length);
        } catch (error) {
          generators.storeError(error as Error);
        }
      },
    );
  }
}
