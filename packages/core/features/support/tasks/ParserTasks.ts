/**
 * Parser Tasks
 *
 * High-level actions that Actors can perform related to parsing.
 */

import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ScanSourceCode } from '../abilities/ScanSourceCode';
import { ParseTokens } from '../abilities/ParseTokens';
import type { Token } from '../../../src/scanner/tokens';

/**
 * Task: Parse source code from tokens stored in ScanSourceCode ability.
 */
export const ParseSource = {
  fromTokens: () =>
    Interaction.where(`#actor parses the token stream`, (actor: UsesAbilities) => {
      const scanAbility = ScanSourceCode.as(actor);
      const parseAbility = ParseTokens.as(actor);

      const scanResult = scanAbility.getScanResult();

      if (!scanResult.ok) {
        throw new Error('Cannot parse: scanning failed with errors');
      }

      parseAbility.parseTokens(scanResult.value);
    }),
};

/**
 * Task: Parse tokens directly (for testing parser in isolation).
 */
export const ParseTokenStream = {
  directly: (tokens: Token[]) =>
    Interaction.where(`#actor parses token stream directly`, (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      parseAbility.parseTokens(tokens);
    }),
};
