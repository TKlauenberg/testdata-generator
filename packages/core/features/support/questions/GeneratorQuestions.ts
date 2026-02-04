/**
 * Generator Questions
 *
 * Questions for querying generated data
 */

import {
  Question,
  type AnswersQuestions,
  type UsesAbilities,
} from '@serenity-js/core';
import { UseGenerators } from '../abilities/UseGenerators';
import {
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
} from '../../../src/generator/generators';

export class GeneratedSequence {
  public static areIdentical(
    seq1Name: string,
    seq2Name: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether sequences ${seq1Name} and ${seq2Name} are identical`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const seq1 = generators.getSequence(seq1Name);
        const seq2 = generators.getSequence(seq2Name);

        return JSON.stringify(seq1) === JSON.stringify(seq2);
      },
    );
  }

  public static values(seqName: string): ReturnType<typeof Question.about<unknown[]>> {
    return Question.about<unknown[]>(
      `values from sequence ${seqName}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        return generators.getSequence(seqName);
      },
    );
  }

  public static allIntegersInRange(
    seqName: string,
    min: number,
    max: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all integers in ${seqName} are between ${min} and ${max}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as number[];

        return values.every((v) => v >= min && v <= max);
      },
    );
  }

  public static allAreIntegers(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} are integers`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as number[];

        return values.every((v) => Number.isInteger(v));
      },
    );
  }

  public static allFloatsInRange(
    seqName: string,
    min: number,
    max: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all floats in ${seqName} are between ${min} and ${max}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as number[];

        return values.every((v) => v >= min && v < max);
      },
    );
  }

  public static allAreNumbers(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} are numbers`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as number[];

        return values.every((v) => typeof v === 'number');
      },
    );
  }

  public static hasBalancedBooleans(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether ${seqName} has approximately 50/50 boolean distribution`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as boolean[];

        const trueCount = values.filter((v) => v === true).length;
        const ratio = trueCount / values.length;

        // Within 5% of 0.5
        return ratio > 0.45 && ratio < 0.55;
      },
    );
  }

  public static allStringsHaveLength(
    seqName: string,
    expectedLength: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all strings in ${seqName} have length ${expectedLength}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => v.length === expectedLength);
      },
    );
  }

  public static allStringsMatchCharset(
    seqName: string,
    charsetType: 'alpha' | 'numeric' | 'alphanumeric',
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all strings in ${seqName} match ${charsetType} charset`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        let charset: string;
        if (charsetType === 'alpha') {
          charset = CHARSET_ALPHA;
        } else if (charsetType === 'numeric') {
          charset = CHARSET_NUMERIC;
        } else {
          charset = CHARSET_ALPHANUMERIC;
        }

        return values.every((str) => {
          for (const char of str) {
            if (!charset.includes(char)) {
              return false;
            }
          }
          return true;
        });
      },
    );
  }

  public static noStringsMatchCharset(
    seqName: string,
    charsetType: 'alpha' | 'numeric' | 'alphanumeric',
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether no strings in ${seqName} match ${charsetType} charset`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        let charset: string;
        if (charsetType === 'alpha') {
          charset = CHARSET_ALPHA;
        } else if (charsetType === 'numeric') {
          charset = CHARSET_NUMERIC;
        } else {
          charset = CHARSET_ALPHANUMERIC;
        }

        return values.every((str) => {
          for (const char of str) {
            if (charset.includes(char)) {
              return false;
            }
          }
          return true;
        });
      },
    );
  }
}

export class ErrorMessage {
  public static last(): ReturnType<typeof Question.about<string>> {
    return Question.about<string>(
      'last error message',
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const error = generators.getLastError();
        return error ? error.message : '';
      },
    );
  }
}
