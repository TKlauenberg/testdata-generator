/**
 * Tasks for generateData() Public API
 *
 * High-level actions for testing the public generateData() API that combines
 * validation and generation into a single call.
 */

import { Interaction, Task, Actor, type UsesAbilities } from '@serenity-js/core';
import { UseGenerateDataAPI } from '../abilities/UseGenerateDataAPI';

/**
 * Task: Store DSL source code for later generation
 */
export class StoreDSLSource {
  public static withContent(source: string): Interaction {
    return Interaction.where(
      `#actor stores DSL source code`,
      (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        api.storeDSLSource(source);
      },
    );
  }
}

/**
 * Task: Generate records using the public API (no error handling)
 *
 * This task assumes generation will succeed and stores the records.
 * Use AttemptGenerateRecordsUsingPublicAPI for tests that expect errors.
 */
export class GenerateRecordsUsingPublicAPI {
  public static withCount(count: number): Interaction {
    return Interaction.where(
      `#actor generates ${count} records using public API`,
      async (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        await api.generateRecords(count);
      },
    );
  }
}

/**
 * Task: Generate records with a specific seed for deterministic output
 *
 * Supports storing multiple sequences for comparison (e.g., same seed = same data)
 */
export class GenerateRecordsUsingPublicAPIWithSeed extends Task {
  private _count: number = 1;
  private _seed: number = 0;
  private _storeAsSecond = false;

  private constructor() {
    super('Generate records using public API with specific seed');
  }

  public static withCount(count: number): GenerateRecordsUsingPublicAPIWithSeed {
    const instance = new GenerateRecordsUsingPublicAPIWithSeed();
    instance._count = count;
    return instance;  }

  public andSeed(seed: number): GenerateRecordsUsingPublicAPIWithSeed {
    this._seed = seed;
    return this;
  }

  public storeAsSecondSequence(): Interaction {
    this._storeAsSecond = true;
    return this.build();
  }

public build(): Interaction {
    const count = this._count;
    const seed = this._seed;
    const storeAsSecond = this._storeAsSecond;

    return Interaction.where(
      `#actor generates ${count} records with seed ${seed}`,
      async (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        await api.generateRecordsWithSeed(count, seed, storeAsSecond);
      },
    );
  }

  // Implement performAs from Task
  public async performAs(actor: Actor): Promise<void> {
    const api = UseGenerateDataAPI.as(actor);
    await api.generateRecordsWithSeed(this._count, this._seed, this._storeAsSecond);
  }
}

/**
 * Task: Attempt to generate records (with error handling)
 *
 * This task catches ValidationErrors and stores them for later assertions.
 * Use this when testing invalid schemas.
 */
export class AttemptGenerateRecordsUsingPublicAPI {
  public static withCount(count: number): Interaction {
    return Interaction.where(
      `#actor attempts to generate ${count} records using public API`,
      async (actor: UsesAbilities) => {
        const api = UseGenerateDataAPI.as(actor);
        await api.attemptGenerateRecords(count);
      },
    );
  }
}
