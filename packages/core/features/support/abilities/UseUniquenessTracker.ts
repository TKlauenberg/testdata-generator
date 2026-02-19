import { Ability, type AbilityType, type UsesAbilities } from '@serenity-js/core';
import { UniquenessTracker } from '../../../src/generator/uniqueness';

interface UniquenessTrackerState {
  tracker: UniquenessTracker | null;
  firstResult: boolean | null;
  secondResult: boolean | null;
}

export class UseUniquenessTracker extends Ability {
  private readonly _state: UniquenessTrackerState = {
    tracker: null,
    firstResult: null,
    secondResult: null,
  };

  public static withDefaultCapabilities(): UseUniquenessTracker {
    return new UseUniquenessTracker();
  }

  public static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
  }

  public resetTracker(): void {
    this._state.tracker = new UniquenessTracker();
    this._state.firstResult = null;
    this._state.secondResult = null;
  }

  public getTracker(): UniquenessTracker {
    if (this._state.tracker === null) {
      this.resetTracker();
    }

    const tracker = this._state.tracker;
    if (tracker === null) {
      throw new Error('Uniqueness tracker could not be initialized');
    }

    return tracker;
  }

  public setFirstResult(result: boolean): void {
    this._state.firstResult = result;
  }

  public setSecondResult(result: boolean): void {
    this._state.secondResult = result;
  }

  public getFirstResult(): boolean | null {
    return this._state.firstResult;
  }

  public getSecondResult(): boolean | null {
    return this._state.secondResult;
  }
}
