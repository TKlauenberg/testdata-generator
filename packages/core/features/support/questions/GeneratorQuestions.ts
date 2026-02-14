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

  public static allMatchUUIDFormat(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} match RFC4122 v4 UUID format`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return values.every((v) => uuidRegex.test(v));
      },
    );
  }

  public static allHaveLength(
    seqName: string,
    expectedLength: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} have length ${expectedLength}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => v.length === expectedLength);
      },
    );
  }

  public static allMatchURLSafeCharacters(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} use only URL-safe characters`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        const urlSafeRegex = /^[A-Za-z0-9_-]+$/;
        return values.every((v) => urlSafeRegex.test(v));
      },
    );
  }

  public static areDifferent(
    seq1Name: string,
    seq2Name: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether sequences ${seq1Name} and ${seq2Name} are different`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const seq1 = generators.getSequence(seq1Name);
        const seq2 = generators.getSequence(seq2Name);

        return JSON.stringify(seq1) !== JSON.stringify(seq2);
      },
    );
  }

  public static matchesExpectedValues(
    seqName: string,
    expectedValues: number[],
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether sequence ${seqName} matches expected values`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as number[];

        return JSON.stringify(values) === JSON.stringify(expectedValues);
      },
    );
  }

  public static allValuesAreUnique(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} are unique`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName);

        const uniqueValues = new Set(values);
        return uniqueValues.size === values.length;
      },
    );
  }

  // Personal data validators

  public static allNonEmptyStrings(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} are non-empty strings`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => typeof v === 'string' && v.length > 0);
      },
    );
  }

  public static atLeastNUniqueValues(
    seqName: string,
    minUnique: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether ${seqName} has at least ${minUnique} unique values`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName);

        const uniqueValues = new Set(values);
        return uniqueValues.size >= minUnique;
      },
    );
  }

  public static allContainOneSpace(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} contain exactly one space`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => {
          const spaceCount = (v.match(/ /g) || []).length;
          return spaceCount === 1;
        });
      },
    );
  }

  public static allHaveTwoParts(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} have at least two parts`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => v.split(' ').length === 2);
      },
    );
  }

  public static allMatchEmailFormat(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} match valid email format`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        const emailRegex = /^[a-z0-9.-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        return values.every((v) => emailRegex.test(v));
      },
    );
  }

  public static allEndWithDomain(
    seqName: string,
    domain: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} end with @${domain}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => v.endsWith(`@${domain}`));
      },
    );
  }

  public static allAreLowercase(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} are lowercase`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => v === v.toLowerCase());
      },
    );
  }

  public static allMatchFirstnameLastnamePattern(
    seqName: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} use firstname.lastname pattern`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        // Pattern: word.word@domain (before @ symbol)
        const pattern = /^[a-z0-9.-]+\.[a-z0-9.-]+@/;
        return values.every((v) => pattern.test(v));
      },
    );
  }

  public static allMatchPhoneFormat(
    seqName: string,
    format: string,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} match format ${format}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        // Convert format to regex by replacing # with \d
        const regexPattern = format.replace(/#/g, '\\d').replace(/[()]/g, '\\$&');
        const regex = new RegExp(`^${regexPattern}$`);

        return values.every((v) => regex.test(v));
      },
    );
  }

  public static allContainNDigits(
    seqName: string,
    expectedDigitCount: number,
  ): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      `whether all values in ${seqName} contain exactly ${expectedDigitCount} digits`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        const values = generators.getSequence(seqName) as string[];

        return values.every((v) => {
          const digits = v.replace(/\D/g, '');
          return digits.length === expectedDigitCount;
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

export class ErrorWasThrown {
  public static check(): ReturnType<typeof Question.about<boolean>> {
    return Question.about<boolean>(
      'whether an error was thrown',
      (actor: AnswersQuestions & UsesAbilities) => {
        const generators = UseGenerators.as(actor);
        return generators.getLastError() !== null;
      },
    );
  }
}
