/**
 * PRNGQuestions - Questions for verifying PRNG behavior
 *
 * Questions retrieve information from the system under test.
 */

import { Question, type Answerable, type AnswersQuestions, type UsesAbilities } from '@serenity-js/core';
import { UsePRNG } from '../abilities/UsePRNG';

export const PRNGSequence = {
  /**
   * Get stored sequence values
   */
  values: (sequenceName: string) =>
    Question.about<number[]>(`the ${sequenceName} sequence values`, (actor: AnswersQuestions & UsesAbilities) => {
      const prng = UsePRNG.as(actor);
      return prng.getSequence(sequenceName);
    }),

  /**
   * Check if two sequences are identical
   */
  areIdentical: (sequenceName1: string, sequenceName2: string) =>
    Question.about<boolean>(
      `whether ${sequenceName1} and ${sequenceName2} are identical`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const seq1 = prng.getSequence(sequenceName1);
        const seq2 = prng.getSequence(sequenceName2);

        if (seq1.length !== seq2.length) return false;

        for (let i = 0; i < seq1.length; i++) {
          if (seq1[i] !== seq2[i]) return false;
        }

        return true;
      },
    ),

  /**
   * Check if two sequences are different
   */
  areDifferent: (sequenceName1: string, sequenceName2: string) =>
    Question.about<boolean>(
      `whether ${sequenceName1} and ${sequenceName2} are different`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const seq1 = prng.getSequence(sequenceName1);
        const seq2 = prng.getSequence(sequenceName2);

        if (seq1.length !== seq2.length) return true;

        for (let i = 0; i < seq1.length; i++) {
          if (seq1[i] !== seq2[i]) return true;
        }

        return false;
      },
    ),

  /**
   * Calculate average of a sequence
   */
  average: (sequenceName: string) =>
    Question.about<number>(`the average of ${sequenceName}`, (actor: AnswersQuestions & UsesAbilities) => {
      const prng = UsePRNG.as(actor);
      const seq = prng.getSequence(sequenceName);
      const sum = seq.reduce((acc, val) => acc + val, 0);
      return sum / seq.length;
    }),

  /**
   * Check if all values are within a range
   */
  allValuesInRange: (sequenceName: string, min: number, max: number, inclusive = false) =>
    Question.about<boolean>(
      `whether all ${sequenceName} values are in range [${min}, ${max}${inclusive ? ']' : ')'}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const seq = prng.getSequence(sequenceName);

        return seq.every((val) => {
          if (inclusive) {
            return val >= min && val <= max;
          } else {
            return val >= min && val < max;
          }
        });
      },
    ),

  /**
   * Check if a specific value appears in the sequence
   */
  contains: (sequenceName: string, value: Answerable<number>) =>
    Question.about<boolean>(
      `whether ${sequenceName} contains a value`,
      async (actor: AnswersQuestions & UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const seq = prng.getSequence(sequenceName);
        const targetValue = await actor.answer(value);
        return seq.includes(targetValue);
      },
    ),

  /**
   * Check if all values in a range appear at least once
   */
  containsAllValuesInRange: (sequenceName: string, min: number, max: number) =>
    Question.about<boolean>(
      `whether ${sequenceName} contains all values from ${min} to ${max}`,
      (actor: AnswersQuestions & UsesAbilities) => {
        const prng = UsePRNG.as(actor);
        const seq = prng.getSequence(sequenceName);
        const uniqueValues = new Set(seq);

        for (let i = min; i <= max; i++) {
          if (!uniqueValues.has(i)) {
            return false;
          }
        }

        return true;
      },
    ),
};
