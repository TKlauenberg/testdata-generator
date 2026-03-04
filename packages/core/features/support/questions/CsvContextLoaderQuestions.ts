import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { UseCsvContextLoader } from '../abilities/UseCsvContextLoader';

export const LoadedCsvContextRecordCount = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'loaded CSV context record count',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseCsvContextLoader.as(actor);
      const context = loader.getContext();
      return context?.records.length ?? 0;
    },
  );
};

export const LoadedCsvContextMetadataFormat = (): ReturnType<typeof Question.about<string>> => {
  return Question.about<string>(
    'loaded CSV context metadata format',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseCsvContextLoader.as(actor);
      const context = loader.getContext();
      return context?.metadata.format ?? '';
    },
  );
};

export const LoadedCsvContextFieldValue = (
  index: number,
  field: string,
): ReturnType<typeof Question.about<unknown>> => {
  return Question.about<unknown>(
    `loaded CSV record ${index} field ${field}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseCsvContextLoader.as(actor);
      const context = loader.getContext();
      if (!context || index < 0 || index >= context.records.length) {
        return undefined;
      }
      return context.records[index]?.[field];
    },
  );
};

export const CsvContextLoadingFailed = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether CSV context loading failed',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseCsvContextLoader.as(actor);
      return loader.getLastError() !== null;
    },
  );
};

export const CsvContextLoadingErrorMessageContains = (
  text: string,
): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    `whether CSV context loading error message contains ${text}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseCsvContextLoader.as(actor);
      const lastError = loader.getLastError();
      if (!lastError) {
        return false;
      }
      return lastError.message.toLowerCase().includes(text.toLowerCase());
    },
  );
};