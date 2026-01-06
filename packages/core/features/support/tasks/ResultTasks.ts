import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { WorkWithResults } from '../abilities/WorkWithResults.ts';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * Tasks that demonstrate working with Result<T, E> pattern.
 *
 * These show how to wrap operations that return Results in Screenplay Tasks.
 * Future stories will follow this pattern for scanner/parser/analyzer operations.
 */

export const PerformOperation = {
  /**
   * Perform an operation that succeeds
   * Usage: actor.attemptsTo(PerformOperation.thatSucceeds('parsed data'))
   */
  thatSucceeds: (value: string) =>
    Interaction.where(`#actor performs an operation that succeeds`, (actor: UsesAbilities) => {
      const results = WorkWithResults.as(actor);
      results.performSuccessfulOperation(value);
    }),

  /**
   * Perform an operation that fails with diagnostics
   * Usage: actor.attemptsTo(PerformOperation.thatFails(diagnostics))
   */
  thatFails: (diagnostics: Diagnostic[]) =>
    Interaction.where(`#actor performs an operation that fails`, (actor: UsesAbilities) => {
      const results = WorkWithResults.as(actor);
      results.performFailedOperation(diagnostics);
    }),
};
