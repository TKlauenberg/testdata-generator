/**
 * ParseTokens Ability
 *
 * Grants an Actor the ability to parse tokens into an AST.
 * Stores the parser result for later inspection.
 */

import { Ability, type UsesAbilities, type AbilityType } from '@serenity-js/core';
import { parse } from '../../../src/parser/parser';
import type { Token } from '../../../src/scanner/tokens';
import type { Program } from '../../../src/parser/ast';
import type { Result } from '../../../src/common/result';
import type { Diagnostic } from '../../../src/common/diagnostic';

export class ParseTokens extends Ability {
  private _parseResult?: Result<Program, Diagnostic[]>;

  static using(): ParseTokens {
    return new ParseTokens();
  }

  /**
   * Performs parsing of the token stream.
   */
  parseTokens(tokens: Token[]): Result<Program, Diagnostic[]> {
    this._parseResult = parse(tokens);
    return this._parseResult;
  }

  /**
   * Gets the most recent parse result.
   */
  getResult(): Result<Program, Diagnostic[]> | undefined {
    return this._parseResult;
  }

  /**
   * Retrieves ParseTokens ability from an actor.
   */
  static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
  }
}
