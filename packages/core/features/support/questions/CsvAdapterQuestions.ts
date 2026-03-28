import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { UseCsvContextLoader } from '../abilities/UseCsvContextLoader';

export const LoadedGeneratedCsvRecordCount = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'loaded generated CSV record count',
    (actor: AnswersQuestions & UsesAbilities) => {
      const context = UseCsvContextLoader.as(actor).getContext();
      return context?.records.length ?? 0;
    },
  );
};

export const LoadedGeneratedCsvMetadataFormat = (): ReturnType<typeof Question.about<string>> => {
  return Question.about<string>(
    'loaded generated CSV metadata format',
    (actor: AnswersQuestions & UsesAbilities) => {
      const context = UseCsvContextLoader.as(actor).getContext();
      return context?.metadata.format ?? '';
    },
  );
};

export const LoadedGeneratedCsvFieldValue = (
  index: number,
  field: string,
): ReturnType<typeof Question.about<unknown>> => {
  return Question.about<unknown>(
    `loaded generated CSV record ${index} field ${field}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const context = UseCsvContextLoader.as(actor).getContext();
      return context?.records[index]?.[field];
    },
  );
};