import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ConstructASTNodes } from '../abilities/ConstructASTNodes';
import type { FieldNode } from '../../../src/parser/ast';

/**
 * Tasks for constructing AST nodes.
 *
 * These wrap AST construction operations in Screenplay Tasks that actors can perform.
 */

export const ConstructProgramNode = {
  /**
   * Construct a Program node with N declarations
   * Usage: actor.attemptsTo(ConstructProgramNode.with(2))
   */
  with: (declarationsCount: number) =>
    Interaction.where(
      `#actor constructs a Program node with ${declarationsCount} declarations`,
      (actor: UsesAbilities) => {
        ConstructASTNodes.as(actor).constructProgramNode(declarationsCount);
      },
    ),
};

export const ConstructSchemaNode = {
  /**
   * Construct a SchemaNode with name and fields
   * Usage: actor.attemptsTo(ConstructSchemaNode.named('User').withFields(3))
   */
  named: (name: string) => ({
    withFields: (fieldsCount: number) =>
      Interaction.where(
        `#actor constructs a SchemaNode named "${name}" with ${fieldsCount} fields`,
        (actor: UsesAbilities) => {
          ConstructASTNodes.as(actor).constructSchemaNode(name, fieldsCount);
        },
      ),
    withFieldsList: (fields: FieldNode[]) =>
      Interaction.where(
        `#actor constructs a SchemaNode named "${name}" with field list`,
        (actor: UsesAbilities) => {
          ConstructASTNodes.as(actor).constructSchemaNodeWithFields(name, fields);
        },
      ),
  }),
};

export const ConstructFieldNode = {
  /**
   * Construct a FieldNode with name, type, and optional generator
   * Usage: actor.attemptsTo(ConstructFieldNode.named('id').withType('string').andGenerator('uuid'))
   */
  named: (name: string) => ({
    withType: (type: string) => ({
      andGenerator: (generator: string) =>
        Interaction.where(
          `#actor constructs a FieldNode named "${name}" with type "${type}" and generator "${generator}"`,
          (actor: UsesAbilities) => {
            ConstructASTNodes.as(actor).constructFieldNode(name, type, generator);
          },
        ),
      withoutGenerator: () =>
        Interaction.where(
          `#actor constructs a FieldNode named "${name}" with type "${type}"`,
          (actor: UsesAbilities) => {
            ConstructASTNodes.as(actor).constructFieldNode(name, type);
          },
        ),
    }),
    withUniqueness: () =>
      Interaction.where(
        `#actor constructs a FieldNode named "${name}" with uniqueness constraint`,
        (actor: UsesAbilities) => {
          ConstructASTNodes.as(actor).constructFieldNode(name, 'string', undefined, true);
        },
      ),
  }),
};

export const ConstructProfileNode = {
  /**
   * Construct a ProfileNode with name and defaults
   * Usage: actor.attemptsTo(ConstructProfileNode.named('Standard').withDefaults(2))
   */
  named: (name: string) => ({
    withDefaults: (defaultsCount: number) =>
      Interaction.where(
        `#actor constructs a ProfileNode named "${name}" with ${defaultsCount} defaults`,
        (actor: UsesAbilities) => {
          ConstructASTNodes.as(actor).constructProfileNode(name, defaultsCount);
        },
      ),
  }),
};

export const AddFieldImmutably = {
  /**
   * Add a field to a schema immutably (creates new schema, preserves original)
   * Usage: actor.attemptsTo(AddFieldImmutably.toSchema())
   */
  toSchema: () =>
    Interaction.where(`#actor adds a field to schema immutably`, (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const originalSchema = ability.getCurrentNode();
      if (originalSchema?.kind !== 'schema') {
        throw new Error('Current node is not a schema');
      }

      ability.setOriginalNode(originalSchema);

      const newField = ability.constructFieldNode('newField', 'string', 'uuid');
      const newSchema = ability.addFieldImmutably(originalSchema, newField);

      ability.setNewNode(newSchema);
      ability.setCurrentNode(newSchema);
    }),
};
