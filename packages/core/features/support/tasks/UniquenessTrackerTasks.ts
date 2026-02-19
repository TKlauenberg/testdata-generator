import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UseUniquenessTracker } from '../abilities/UseUniquenessTracker';

export class PrepareUniquenessTracker {
  public static fresh(): Interaction {
    return Interaction.where('#actor prepares a fresh uniqueness tracker', (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      ability.resetTracker();
    });
  }
}

export class TrackFieldValue {
  public static asFirst(field: string, value: string): Interaction {
    return Interaction.where(`#actor tracks first value for field ${field}`, (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      ability.setFirstResult(ability.getTracker().track(field, value));
    });
  }

  public static asSecond(field: string, value: string): Interaction {
    return Interaction.where(`#actor tracks second value for field ${field}`, (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      ability.setSecondResult(ability.getTracker().track(field, value));
    });
  }
}

export class TrackCompositeValue {
  public static asFirst(fieldsCsv: string, valuesCsv: string): Interaction {
    return Interaction.where('#actor tracks first composite uniqueness value', (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      const fields = fieldsCsv.split(',').map((entry) => entry.trim());
      const values = valuesCsv.split(',').map((entry) => entry.trim());

      ability.setFirstResult(ability.getTracker().trackComposite(fields, values));
    });
  }

  public static asSecond(fieldsCsv: string, valuesCsv: string): Interaction {
    return Interaction.where('#actor tracks second composite uniqueness value', (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      const fields = fieldsCsv.split(',').map((entry) => entry.trim());
      const values = valuesCsv.split(',').map((entry) => entry.trim());

      ability.setSecondResult(ability.getTracker().trackComposite(fields, values));
    });
  }
}

export class ClearUniquenessTracker {
  public static now(): Interaction {
    return Interaction.where('#actor clears the uniqueness tracker', (actor: UsesAbilities) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      ability.getTracker().clear();
    });
  }
}
