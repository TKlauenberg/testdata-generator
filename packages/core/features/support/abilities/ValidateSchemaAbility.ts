import { Ability, type UsesAbilities, type AbilityType } from '@serenity-js/core';
import { validateSchema } from '../../../src/validate';
import type { Result } from '../../../src/common/result';
import type { ValidatedProgram } from '../../../src/analyzer/types';
import type { Diagnostic } from '../../../src/common/diagnostic';
import type { DefaultSpec } from '../../../src/parser';

/**
 * Ability to validate schemas using the validation API.
 */
export class ValidateSchemaAbility extends Ability {
  private _schemaSource?: string;
  private _configuredDefaultGenerators?: readonly DefaultSpec[];
  private _globalDefaultGenerators?: readonly DefaultSpec[];
  private _workspaceDefaultGenerators?: readonly DefaultSpec[];
  private _result?: Result<ValidatedProgram, Diagnostic[]>;
  private _validationStartTime?: number;
  private _validationEndTime?: number;

  static as<A extends Ability>(this: AbilityType<A>, actor: UsesAbilities): A {
    return actor.abilityTo(this);
  }

  setSchemaSource(source: string): void {
    this._schemaSource = source;
  }

  setDefaultGenerators(defaultGenerators: readonly DefaultSpec[]): void {
    this._configuredDefaultGenerators = defaultGenerators;
    this._globalDefaultGenerators = undefined;
    this._workspaceDefaultGenerators = undefined;
  }

  setGlobalDefaultGenerators(defaultGenerators: readonly DefaultSpec[]): void {
    this._configuredDefaultGenerators = undefined;
    this._globalDefaultGenerators = defaultGenerators;
  }

  setWorkspaceDefaultGenerators(defaultGenerators: readonly DefaultSpec[]): void {
    this._configuredDefaultGenerators = undefined;
    this._workspaceDefaultGenerators = defaultGenerators;
  }

  performValidation(): void {
    if (this._schemaSource === undefined) {
      throw new Error('No schema source provided');
    }
    this._validationStartTime = performance.now();
    this._result = validateSchema(this._schemaSource, 'test.td', {
      defaultGenerators: this.getEffectiveDefaultGenerators(),
    });
    this._validationEndTime = performance.now();
  }

  private getEffectiveDefaultGenerators(): readonly DefaultSpec[] {
    if (this._configuredDefaultGenerators !== undefined) {
      return this._configuredDefaultGenerators;
    }

    if (this._workspaceDefaultGenerators !== undefined) {
      return this._workspaceDefaultGenerators;
    }

    return this._globalDefaultGenerators ?? [];
  }

  getResolvedGenerator(schemaName: string, fieldName: string): string {
    if (!this._result?.ok) {
      throw new Error('Validation did not succeed');
    }

    const field = this._result.value.schemas.get(schemaName)?.fields.find((item) => item.node.name === fieldName);
    if (!field) {
      throw new Error(`Field '${fieldName}' not found in schema '${schemaName}'`);
    }

    return field.resolvedGenerator ?? field.resolvedType;
  }

  isFieldUnique(schemaName: string, fieldName: string): boolean {
    if (!this._result?.ok) {
      throw new Error('Validation did not succeed');
    }

    const field = this._result.value.schemas.get(schemaName)?.fields.find((item) => item.node.name === fieldName);
    if (!field) {
      throw new Error(`Field '${fieldName}' not found in schema '${schemaName}'`);
    }

    return field.isUnique;
  }

  lastResultSucceeded(): boolean {
    return this._result?.ok === true;
  }

  lastResultFailed(): boolean {
    return this._result?.ok === false;
  }

  getSchemaCount(): number {
    if (!this._result?.ok) {
      throw new Error('Validation did not succeed');
    }
    return this._result.value.schemas.size;
  }

  getFieldCount(): number {
    if (!this._result?.ok) {
      throw new Error('Validation did not succeed');
    }
    return this._result.value.metadata.totalFields;
  }

  getFirstErrorMessage(): string {
    if (this._result?.ok || !this._result) {
      throw new Error('No validation errors');
    }
    return this._result.errors[0]?.message ?? '';
  }

  getFirstErrorCode(): string {
    if (this._result?.ok || !this._result) {
      throw new Error('No validation errors');
    }
    return this._result.errors[0]?.code ?? '';
  }

  getErrorCount(): number {
    if (this._result?.ok || !this._result) {
      return 0;
    }
    return this._result.errors.length;
  }

  hasErrorLocation(): boolean {
    if (this._result?.ok || !this._result) {
      return false;
    }
    return this._result.errors[0]?.location !== undefined;
  }

  errorsAreSortedByLine(): boolean {
    if (this._result?.ok || !this._result) {
      return true;
    }
    for (let i = 1; i < this._result.errors.length; i++) {
      const prevLine = this._result.errors[i - 1].location?.line ?? 0;
      const currLine = this._result.errors[i].location?.line ?? 0;
      if (currLine < prevLine) {
        return false;
      }
    }
    return true;
  }

  getValidationDuration(): number {
    if (
      this._validationStartTime === undefined ||
      this._validationEndTime === undefined
    ) {
      return 0;
    }
    return this._validationEndTime - this._validationStartTime;
  }
}
