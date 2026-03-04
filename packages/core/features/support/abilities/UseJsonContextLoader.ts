import { Ability, type AbilityType, type UsesAbilities } from '@serenity-js/core';
import { loadJsonContext, type ContextData } from '../../../src/context';

interface JsonContextLoaderState {
  context: ContextData | null;
  lastError: Error | null;
}

export class UseJsonContextLoader extends Ability {
  private readonly _state: JsonContextLoaderState = {
    context: null,
    lastError: null,
  };

  public static withDefaultCapabilities(): UseJsonContextLoader {
    return new UseJsonContextLoader();
  }

  public static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
  }

  public async load(filePath: string): Promise<void> {
    this._state.context = null;
    this._state.lastError = null;

    try {
      this._state.context = await loadJsonContext(filePath);
    } catch (error) {
      this._state.lastError = error instanceof Error ? error : new Error(String(error));
      throw this._state.lastError;
    }
  }

  public async attemptLoad(filePath: string): Promise<void> {
    try {
      await this.load(filePath);
    } catch {
      return;
    }
  }

  public getContext(): ContextData | null {
    return this._state.context;
  }

  public getLastError(): Error | null {
    return this._state.lastError;
  }
}
