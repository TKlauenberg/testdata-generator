import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { PerformCalculations } from '../abilities/PerformCalculations.ts';

/**
 * SetNumbers is an example Task that demonstrates the Screenplay pattern.
 *
 * Tasks represent high-level business actions that an Actor performs.
 * They use Abilities to interact with the system.
 *
 * In real features, Tasks would perform actions like:
 * - ValidateSchema.withSource(source)
 * - GenerateRecords.fromSchema(schema).withCount(100)
 * - SaveContext.toFile(filename)
 *
 * This example demonstrates the Task pattern structure with simple math operations.
 */
export const SetNumbers = {
  /**
   * Static factory method - makes task creation readable.
   * Usage: actor.attemptsTo(SetNumbers.to(2, 3))
   */
  to: (first: number, second: number) =>
    Interaction.where(`#actor sets numbers to ${first} and ${second}`, (actor: UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      calculations.setNumbers(first, second);
    }),
};

/**
 * AddNumbers Task - adds the two numbers
 */
export const AddNumbers = {
  together: () =>
    Interaction.where('#actor adds the numbers together', (actor: UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      calculations.add();
    }),
};

/**
 * SubtractNumbers Task - subtracts second from first
 */
export const SubtractNumbers = {
  secondFromFirst: () =>
    Interaction.where(
      '#actor subtracts the second number from the first',
      (actor: UsesAbilities) => {
        const calculations = PerformCalculations.as(actor);
        calculations.subtract();
      },
    ),
};

/**
 * MultiplyResult Task - multiplies the current result
 */
export const MultiplyResult = {
  by: (multiplier: number) =>
    Interaction.where(`#actor multiplies the result by ${multiplier}`, (actor: UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      calculations.multiplyBy(multiplier);
    }),
};
