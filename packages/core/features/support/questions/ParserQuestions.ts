/**
 * Parser Questions
 *
 * Questions that Actors can ask about parse results and AST nodes.
 */

import { Question, type UsesAbilities } from '@serenity-js/core';
import { ParseTokens } from '../abilities/ParseTokens';
import type { Program, SchemaNode, FieldNode } from '../../../src/parser/ast';
import type { Result } from '../../../src/common/result';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * Questions about parse result status
 */
export const ParseResult = {
  /**
   * Check if parsing succeeded
   */
  succeeded: () =>
    Question.about('parse result succeeded', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      return result?.ok === true;
    }),

  /**
   * Check if parsing failed
   */
  failed: () =>
    Question.about('parse result failed', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      return result?.ok === false;
    }),

  /**
   * Get the raw parse result (for direct inspection)
   */
  value: () =>
    Question.about<Result<Program, Diagnostic[]>>('parse result value', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result) {
        throw new Error('No parse result available');
      }
      return result;
    }),
};

/**
 * Questions about the Program node
 */
export const ProgramNode = {
  /**
   * Check if Program node exists
   */
  exists: () =>
    Question.about('Program node exists', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      return result?.ok === true && result.value.kind === 'program';
    }),

  /**
   * Get the Program node
   */
  value: () =>
    Question.about<Program | undefined>('Program node', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return undefined;
      }
      return result.value;
    }),
};

/**
 * Questions about schema nodes
 */
export const SchemaNodes = {
  /**
   * Count of schema declarations in the program
   */
  count: () =>
    Question.about('schema count', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return 0;
      }
      return result.value.declarations.filter((d) => d.kind === 'schema').length;
    }),

  /**
   * Get the first schema node
   */
  first: () =>
    Question.about<SchemaNode | undefined>('first schema', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return undefined;
      }
      return result.value.declarations.find((d) => d.kind === 'schema');
    }),

  /**
   * Get schema by index (0-based)
   */
  at: (index: number) =>
    Question.about<SchemaNode | undefined>(`schema at index ${index}`, (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return undefined;
      }
      const schemas = result.value.declarations.filter((d) => d.kind === 'schema');
      return schemas[index];
    }),
};

/**
 * Questions about field nodes
 */
export const FirstField = {
  /**
   * Get the first field of the first schema
   */
  ofFirstSchema: () =>
    Question.about<FieldNode | undefined>('first field of first schema', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return undefined;
      }
      const schema = result.value.declarations.find((d) => d.kind === 'schema');
      return schema?.fields[0];
    }),
};

export const SecondField = {
  /**
   * Get the second field of the first schema
   */
  ofFirstSchema: () =>
    Question.about<FieldNode | undefined>(
      'second field of first schema',
      (actor: UsesAbilities) => {
        const parseAbility = ParseTokens.as(actor);
        const result = parseAbility.getResult();
        if (!result?.ok) {
          return undefined;
        }
        const schema = result.value.declarations.find((d) => d.kind === 'schema');
        return schema?.fields[1];
      },
    ),
};

export const ThirdField = {
  /**
   * Get the third field of the first schema
   */
  ofFirstSchema: () =>
    Question.about<FieldNode | undefined>('third field of first schema', (actor: UsesAbilities) => {
      const parseAbility = ParseTokens.as(actor);
      const result = parseAbility.getResult();
      if (!result?.ok) {
        return undefined;
      }
      const schema = result.value.declarations.find((d) => d.kind === 'schema');
      return schema?.fields[2];
    }),
};
