import {
  Ability,
  type Actor as _Actor,
  type AnswersQuestions as _AnswersQuestions,
  type UsesAbilities as _UsesAbilities,
} from '@serenity-js/core';

/**
 * PerformCalculations is an example Ability that demonstrates the Screenplay pattern.
 *
 * Abilities represent what an Actor can do. They encapsulate the system interaction
 * logic and maintain state specific to that capability.
 *
 * In real features, Abilities would interact with actual system components:
 * - ParseSchemas would call the scanner/parser/analyzer
 * - GenerateData would call the generator
 * - ValidateSchemas would validate DSL source code
 *
 * This example uses simple math operations to demonstrate the pattern structure.
 */
export class PerformCalculations extends Ability {
  private _firstNumber: number = 0;
  private _secondNumber: number = 0;
  private _result: number = 0;

  /**
   * Static factory method - common pattern for creating Abilities.
   * This makes Actor setup readable: Actor.whoCan(PerformCalculations.using())
   */
  static using(): PerformCalculations {
    return new PerformCalculations();
  }

  /**
   * Set the numbers for calculation
   */
  setNumbers(first: number, second: number): void {
    this._firstNumber = first;
    this._secondNumber = second;
  }

  /**
   * Add the numbers
   */
  add(): void {
    this._result = this._firstNumber + this._secondNumber;
  }

  /**
   * Subtract second from first
   */
  subtract(): void {
    this._result = this._firstNumber - this._secondNumber;
  }

  /**
   * Multiply the current result by a number
   */
  multiplyBy(multiplier: number): void {
    this._result = this._result * multiplier;
  }

  /**
   * Get the current result
   */
  getResult(): number {
    return this._result;
  }
}
