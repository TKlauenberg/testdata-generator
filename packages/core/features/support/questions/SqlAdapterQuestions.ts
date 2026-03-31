import { Question, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { UseSqlAdapter } from '../abilities/UseSqlAdapter';
import { UseSqlExecutionHarness } from '../abilities/UseSqlExecutionHarness';

export const GeneratedSqlOutput = (): ReturnType<typeof Question.about<Promise<string>>> => {
  return Question.about<Promise<string>>(
    'generated SQL output',
    async (actor: AnswersQuestions & UsesAbilities) => {
      const outputPath = actor.abilityTo(UseSqlAdapter).getLastOutputPath();
      return await Bun.file(outputPath).text();
    },
  );
};

export const ExecutedSqlRowCount = (): ReturnType<typeof Question.about<number>> => {
  return Question.about<number>(
    'executed SQL row count',
    (actor: AnswersQuestions & UsesAbilities) => actor.abilityTo(UseSqlExecutionHarness).getRows().length,
  );
};

export const ExecutedSqlFieldValue = (
  index: number,
  field: string,
): ReturnType<typeof Question.about<unknown>> => {
  return Question.about<unknown>(
    `executed SQL row ${index} field ${field}`,
    (actor: AnswersQuestions & UsesAbilities) => actor.abilityTo(UseSqlExecutionHarness).getRows()[index]?.[field],
  );
};