import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { PerformCalculations } from '../abilities/PerformCalculations';

/**
 * CalculationResult is an example Question that demonstrates the Screenplay pattern.
 *
 * Questions allow Actors to query the state of the system.
 * They use Abilities to retrieve information.
 *
 * In real features, Questions would query things like:
 * - ValidationResult.value() → Result<ValidatedProgram, Diagnostic[]>
 * - GeneratedRecords.count() → number
 * - ErrorMessage.text() → string
 *
 * This example demonstrates the Question pattern structure with simple math operations.
 */
export const CalculationResult = {
  /**
   * Get the current result value
   * Usage: actor.asks(CalculationResult.value())
   */
  value: () =>
    Question.about<number>('the calculation result', (actor: AnswersQuestions & UsesAbilities) => {
      const calculations = PerformCalculations.as(actor);
      return calculations.getResult();
    }),
};

/**
 * ScreenplayKnowledge is an example Question for the documentation scenario
 */
export const ScreenplayKnowledge = {
  aboutActors: () =>
    Question.about<string>('Screenplay pattern - Actors', () => {
      return 'Actors represent users or systems interacting with the application';
    }),

  aboutAbilities: () =>
    Question.about<string>('Screenplay pattern - Abilities', () => {
      return 'Abilities define what an Actor can do (e.g., parse schemas, generate data)';
    }),

  aboutTasks: () =>
    Question.about<string>('Screenplay pattern - Tasks', () => {
      return 'Tasks represent high-level business actions composed of Interactions';
    }),

  aboutQuestions: () =>
    Question.about<string>('Screenplay pattern - Questions', () => {
      return 'Questions allow Actors to query system state and retrieve information';
    }),
};
