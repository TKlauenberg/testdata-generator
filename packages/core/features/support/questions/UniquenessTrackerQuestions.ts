import { Question } from '@serenity-js/core';
import { UseUniquenessTracker } from '../abilities/UseUniquenessTracker';

export class FirstTrackingResult {
  public static value() {
    return Question.about('the first uniqueness tracking result', (actor) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      return ability.getFirstResult();
    });
  }
}

export class SecondTrackingResult {
  public static value() {
    return Question.about('the second uniqueness tracking result', (actor) => {
      const ability = actor.abilityTo(UseUniquenessTracker);
      return ability.getSecondResult();
    });
  }
}
