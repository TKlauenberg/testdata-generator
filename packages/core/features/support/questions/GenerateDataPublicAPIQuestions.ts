/**
 * Questions for generateData() Public API
 *
 * Questions for querying results from the public generateData() API.
 * Supports assertions on generated records, errors, performance metrics, etc.
 */

import {
  Question,
  type AnswersQuestions,
  type UsesAbilities,
} from '@serenity-js/core';
import { UseGenerateDataAPI } from '../abilities/UseGenerateDataAPI';

/**
 * Question: Get all generated records
 */
export const GeneratedRecords = (): ReturnType<typeof Question.about<Record<string, unknown>[]>> => {
  return Question.about<Record<string, unknown>[]>(
    'generated records',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return api.getRecords();
    },
  );
};

/**
 * Question: Get count of generated records
 */
export const GeneratedRecordsCount = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'count of generated records',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return api.getGeneratedRecordCount();
    },
  );
};

/**
 * Question: Check if all records have a specific field
 */
export const RecordsHaveField = (fieldName: string): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    `whether all records have field "${fieldName}"`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const records = api.getRecords();
      return records.length > 0 && records.every((record) => fieldName in record);
    },
  );
};

/**
 * Question: Count how many records have specific field(s)
 */
export const RecordCountWithFields = (...fieldNames: string[]): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    `count of records with fields ${fieldNames.join(', ')}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const records = api.getRecords();
      return records.filter(record =>
        fieldNames.every(field => field in record)
      ).length;
    },
  );
};

/**
 * Question: Get the type of a field across all records (assumes consistent type)
 */
export const FieldHasType = (fieldName: string): ReturnType<typeof Question.about<string>> => {
  return Question.about<string>(
    `type of field "${fieldName}"`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const records = api.getRecords();

      if (records.length === 0) {
        return 'undefined';
      }

      const firstRecord = records[0];
      if (!(fieldName in firstRecord)) {
        return 'undefined';
      }

      return typeof firstRecord[fieldName];
    },
  );
};

/**
 * Question: Check if two record sequences are identical
 */
export const RecordsAreIdentical = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether both record sequences are identical',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const seq1 = api.getRecords();
      const seq2 = api.getRecordsSecondSequence();

      if (seq1.length !== seq2.length) {
        return false;
      }

      return JSON.stringify(seq1) === JSON.stringify(seq2);
    },
  );
};

/**
 * Question: Check if two record sequences are different
 */
export const RecordsAreDifferent = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether both record sequences are different',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const seq1 = api.getRecords();
      const seq2 = api.getRecordsSecondSequence();

      return JSON.stringify(seq1) !== JSON.stringify(seq2);
    },
  );
};

/**
 * Question: Check if an error was thrown
 */
export const ErrorWasThrown = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether an error was thrown',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return api.getLastError() !== null;
    },
  );
};

/**
 * Question: Check if error has a specific property
 */
export const ErrorHasProperty = (propertyName: string): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    `whether error has property "${propertyName}"`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const error = api.getLastError();

      if (!error) {
        return false;
      }

      return propertyName in error;
    },
  );
};

/**
 * Question: Check if error message contains specific text
 */
export const ErrorMessageContains = (text: string): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    `whether error message contains "${text}"`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      const error = api.getLastError();

      if (!error) {
        return false;
      }

      return error.message.toLowerCase().includes(text.toLowerCase());
    },
  );
};

/**
 * Question: Get generation duration in milliseconds
 */
export const GenerationDuration = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'generation duration in milliseconds',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return api.getGenerationDuration();
    },
  );
};

/**
 * Question: Get peak heap usage during generation in bytes
 */
export const PeakHeapUsed = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'peak heap usage during generation',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return api.getPeakHeapUsed();
    },
  );
};

/**
 * Question: Check if generation never started (validation failed immediately)
 */
export const NoGenerationStarted = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether generation never started',
    (actor: AnswersQuestions & UsesAbilities) => {
      const api = UseGenerateDataAPI.as(actor);
      return !api.didGenerationStart();
    },
  );
};
