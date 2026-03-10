import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { ValidateSchemaAbility } from '../abilities/ValidateSchemaAbility';

/**
 * Questions for validation results using Screenplay pattern.
 */

export const ValidationResult = {
  succeeded: () =>
    Question.about<boolean>('validation succeeded', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.lastResultSucceeded();
    }),

  failed: () =>
    Question.about<boolean>('validation failed', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.lastResultFailed();
    }),

  schemaCount: () =>
    Question.about<number>('schema count', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getSchemaCount();
    }),

  fieldCount: () =>
    Question.about<number>('field count', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getFieldCount();
    }),

  firstErrorMessage: () =>
    Question.about<string>('first error message', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getFirstErrorMessage();
    }),

  firstErrorCode: () =>
    Question.about<string>('first error code', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getFirstErrorCode();
    }),

  errorCount: () =>
    Question.about<number>('error count', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getErrorCount();
    }),

  hasErrorLocation: () =>
    Question.about<boolean>('error has location', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.hasErrorLocation();
    }),

  errorsAreSorted: () =>
    Question.about<boolean>('errors are sorted', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.errorsAreSortedByLine();
    }),

  validationDuration: () =>
    Question.about<number>('validation duration', (actor: AnswersQuestions & UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      return validator.getValidationDuration();
    }),

  resolvedGenerator: (schemaName: string, fieldName: string) =>
    Question.about<string>(
      `resolved generator for ${schemaName}.${fieldName}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const validator = ValidateSchemaAbility.as(actor);
        return validator.getResolvedGenerator(schemaName, fieldName);
      },
    ),

  fieldIsUnique: (schemaName: string, fieldName: string) =>
    Question.about<boolean>(
      `whether ${schemaName}.${fieldName} is unique`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const validator = ValidateSchemaAbility.as(actor);
        return validator.isFieldUnique(schemaName, fieldName);
      },
    ),
};
