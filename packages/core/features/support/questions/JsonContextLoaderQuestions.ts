import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { UseJsonContextLoader } from '../abilities/UseJsonContextLoader';

export const LoadedContextRecordCount = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'loaded JSON context record count',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseJsonContextLoader.as(actor);
      const context = loader.getContext();
      return context?.records.length ?? 0;
    },
  );
};

export const LoadedContextMetadataFormat = (): ReturnType<typeof Question.about<string>> => {
  return Question.about<string>(
    'loaded JSON context metadata format',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseJsonContextLoader.as(actor);
      const context = loader.getContext();
      return context?.metadata.format ?? '';
    },
  );
};

export const LoadedContextFieldValue = (
  index: number,
  field: string,
): ReturnType<typeof Question.about<unknown>> => {
  return Question.about<unknown>(
    `loaded record ${index} field ${field}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseJsonContextLoader.as(actor);
      const context = loader.getContext();
      if (!context || index < 0 || index >= context.records.length) {
        return undefined;
      }
      return context.records[index]?.[field];
    },
  );
};

export const JsonContextLoadingFailed = (): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    'whether JSON context loading failed',
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseJsonContextLoader.as(actor);
      return loader.getLastError() !== null;
    },
  );
};

export const JsonContextLoadingErrorMessageContains = (
  text: string,
): ReturnType<typeof Question.about<boolean>> => {
  return Question.about<boolean>(
    `whether JSON context loading error message contains ${text}`,
    (actor: AnswersQuestions & UsesAbilities) => {
      const loader = UseJsonContextLoader.as(actor);
      const lastError = loader.getLastError();
      if (!lastError) {
        return false;
      }
      return lastError.message.toLowerCase().includes(text.toLowerCase());
    },
  );
};
