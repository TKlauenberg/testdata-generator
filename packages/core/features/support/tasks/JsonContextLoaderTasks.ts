import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UseJsonContextLoader } from '../abilities/UseJsonContextLoader';

export class LoadJsonContextFixture {
  public static fromPath(filePath: string): Interaction {
    return Interaction.where(
      `#actor loads JSON context from ${filePath}`,
      async (actor: UsesAbilities) => {
        const loader = UseJsonContextLoader.as(actor);
        await loader.load(filePath);
      },
    );
  }
}

export class AttemptLoadJsonContextFixture {
  public static fromPath(filePath: string): Interaction {
    return Interaction.where(
      `#actor attempts to load JSON context from ${filePath}`,
      async (actor: UsesAbilities) => {
        const loader = UseJsonContextLoader.as(actor);
        await loader.attemptLoad(filePath);
      },
    );
  }
}
