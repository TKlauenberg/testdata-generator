import { Ability, type UsesAbilities, type AbilityType } from '@serenity-js/core';
import { validateSchema } from '../../../src/validate';
import type { Result } from '../../../src/common/result';
import type { ValidatedProgram } from '../../../src/analyzer/types';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * Ability to validate schemas using the validation API.
 */
export class ValidateSchemaAbility extends Ability {
  private _schemaSource?: string;
  private _result?: Result<ValidatedProgram, Diagnostic[]>;
  private _validationStartTime?: number;
  private _validationEndTime?: number;

  static as(actor: UsesAbilities): ValidateSchemaAbility {
    return actor.abilityTo(ValidateSchemaAbility as AbilityType<ValidateSchemaAbility>);
  }

  setSchemaSource(source: string): void {
    this._schemaSource = source;
  }

  performValidation(): void {
    if (this._schemaSource === undefined) {
      throw new Error('No schema source provided');
    }
    this._validationStartTime = performance.now();
    this._result = validateSchema(this._schemaSource, 'test.td');
    this._validationEndTime = performance.now();
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
