/**
 * Analyzer Tasks
 *
 * High-level actions that Actors can perform related to semantic analysis.
 */

import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ParseTokens } from '../abilities/ParseTokens';
import { AnalyzeProgram } from '../abilities/AnalyzeProgram';

export const AnalyzeParsedProgram = {
  fromParseResult: () =>
    Interaction.where(`#actor runs semantic analysis`, (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const analysisAbility = actor.abilityTo(AnalyzeProgram);

      const parseResult = parseAbility.getResult();
      if (!parseResult) {
        throw new Error('Cannot analyze: parse result is missing');
      }

      if (!parseResult.ok) {
        throw new Error('Cannot analyze: parsing failed with errors');
      }

      analysisAbility.analyzeProgram(parseResult.value);
    }),
};
