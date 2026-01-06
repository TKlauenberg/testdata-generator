import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { WorkWithResults } from '../abilities/WorkWithResults';
import type { Result } from '../../../src/common/result';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * Questions for querying Result<T, E> values.
 *
 * These demonstrate how to extract information from Result types in assertions.
 * Future stories will follow this pattern for validation results, parse results, etc.
 */

export const OperationResult = {
  /**
   * Get the complete Result object
   */
  value: () =>
    Question.about<Result<string, Diagnostic[]> | undefined>(
      'the operation result',
      (actor: AnswersQuestions & UsesAbilities) => {
        const results = WorkWithResults.as(actor);
        return results.getLastResult();
      },
    ),

  /**
   * Check if operation succeeded
   */
  succeeded: () =>
    Question.about<boolean>('operation succeeded', (actor: AnswersQuestions & UsesAbilities) => {
      const results = WorkWithResults.as(actor);
      const result = results.getLastResult();
      return result?.ok === true;
    }),

  /**
   * Check if operation failed
   */
  failed: () =>
    Question.about<boolean>('operation failed', (actor: AnswersQuestions & UsesAbilities) => {
      const results = WorkWithResults.as(actor);
      const result = results.getLastResult();
      return result?.ok === false;
    }),

  /**
   * Get the success value (only valid if succeeded)
   */
  successValue: () =>
    Question.about<string | undefined>(
      'the success value',
      (actor: AnswersQuestions & UsesAbilities) => {
        const results = WorkWithResults.as(actor);
        const result = results.getLastResult();
        return result?.ok ? result.value : undefined;
      },
    ),

  /**
   * Get error diagnostics (only valid if failed)
   */
  errors: () =>
    Question.about<Diagnostic[]>(
      'the error diagnostics',
      (actor: AnswersQuestions & UsesAbilities) => {
        const results = WorkWithResults.as(actor);
        const result = results.getLastResult();
        return result && !result.ok ? result.errors : [];
      },
    ),

  /**
   * Get the first error message (common pattern for assertions)
   */
  firstErrorMessage: () =>
    Question.about<string>('the first error message', (actor: AnswersQuestions & UsesAbilities) => {
      const results = WorkWithResults.as(actor);
      const result = results.getLastResult();
      if (result && !result.ok && result.errors.length > 0) {
        return result.errors[0].message;
      }
      return '';
    }),
};
