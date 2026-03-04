import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UseCsvContextLoader } from '../abilities/UseCsvContextLoader';

export class LoadCsvContextFixture {
  public static fromPath(filePath: string): Interaction {
    return Interaction.where(
      `#actor loads CSV context from ${filePath}`,
      async (actor: UsesAbilities) => {
        const loader = UseCsvContextLoader.as(actor);
        await loader.load(filePath);
      },
    );
  }
}

export class AttemptLoadCsvContextFixture {
  public static fromPath(filePath: string): Interaction {
    return Interaction.where(
      `#actor attempts to load CSV context from ${filePath}`,
      async (actor: UsesAbilities) => {
        const loader = UseCsvContextLoader.as(actor);
        await loader.attemptLoad(filePath);
      },
    );
  }
}