import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ValidateSchemaAbility } from '../abilities/ValidateSchemaAbility';
import type { DefaultSpec } from '../../../src/parser';

/**
 * Tasks for validation operations using Screenplay pattern.
 */

export const ValidateSchema = {
  /**
   * Set the schema source to validate
   */
  withSource: (source: string) =>
    Interaction.where(`#actor provides schema source`, (actor: UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      validator.setSchemaSource(source);
    }),

  /**
   * Execute the validation
   */
  execute: () =>
    Interaction.where(`#actor validates the schema`, (actor: UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      validator.performValidation();
    }),

  withDefaultGenerators: (defaults: readonly DefaultSpec[]) =>
    Interaction.where(`#actor configures generator defaults`, (actor: UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      validator.setDefaultGenerators(defaults);
    }),

  withGlobalDefaultGenerators: (defaults: readonly DefaultSpec[]) =>
    Interaction.where(`#actor configures global generator defaults`, (actor: UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      validator.setGlobalDefaultGenerators(defaults);
    }),

  withWorkspaceDefaultGenerators: (defaults: readonly DefaultSpec[]) =>
    Interaction.where(`#actor configures workspace generator defaults`, (actor: UsesAbilities) => {
      const validator = ValidateSchemaAbility.as(actor);
      validator.setWorkspaceDefaultGenerators(defaults);
    }),
};
