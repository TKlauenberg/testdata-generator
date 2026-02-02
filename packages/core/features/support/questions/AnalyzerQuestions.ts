/**
 * Questions for querying semantic analysis results.
 */

import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { AnalyzeProgram } from '../abilities/AnalyzeProgram';
import type { Diagnostic } from '../../../src/common/diagnostic';

export const AnalysisResult = {
  succeeded: () =>
    Question.about<boolean>('analysis succeeded', (actor: AnswersQuestions & UsesAbilities) => {
      const result = actor.abilityTo(AnalyzeProgram).getResult();
      return result?.ok === true;
    }),

  failed: () =>
    Question.about<boolean>('analysis failed', (actor: AnswersQuestions & UsesAbilities) => {
      const result = actor.abilityTo(AnalyzeProgram).getResult();
      return result?.ok === false;
    }),

  errors: () =>
    Question.about<Diagnostic[]>('analysis errors', (actor: AnswersQuestions & UsesAbilities) => {
      const result = actor.abilityTo(AnalyzeProgram).getResult();
      return result && !result.ok ? result.errors : [];
    }),

  hasSchema: (schemaName: string) =>
    Question.about<boolean>(
      `validated program contains schema ${schemaName}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        return result?.ok ? result.value.schemas.has(schemaName) : false;
      },
    ),

  totalFields: () =>
    Question.about<number>(
      'validated program total fields',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        return result?.ok ? result.value.metadata.totalFields : 0;
      },
    ),

  hasErrorCode: (code: string) =>
    Question.about<boolean>('analysis error code', (actor: AnswersQuestions & UsesAbilities) => {
      const result = actor.abilityTo(AnalyzeProgram).getResult();
      return result && !result.ok ? result.errors.some((error) => error.code === code) : false;
    }),

  errorMessageContains: (substring: string) =>
    Question.about<boolean>(
      'analysis error message contains',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        return result && !result.ok
          ? result.errors.some((error) => error.message.includes(substring))
          : false;
      },
    ),

  errorSuggestionContains: (substring: string) =>
    Question.about<boolean>(
      'analysis error suggestion contains',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        return result && !result.ok
          ? result.errors.some((error) => error.suggestion?.includes(substring))
          : false;
      },
    ),

  errorMessageMatches: (pattern: string) =>
    Question.about<boolean>(
      'analysis error message matches',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        if (!result || result.ok) {
          return false;
        }
        const regex = new RegExp(pattern);
        return result.errors.some((error) => regex.test(error.message));
      },
    ),

  errorCountAtLeast: (count: number) =>
    Question.about<boolean>(
      'analysis error count at least',
      (actor: AnswersQuestions & UsesAbilities) => {
        const result = actor.abilityTo(AnalyzeProgram).getResult();
        return result && !result.ok ? result.errors.length >= count : false;
      },
    ),
};
