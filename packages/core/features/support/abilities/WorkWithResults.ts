import { Ability } from '@serenity-js/core';
import { ok, err, type Result } from '../../../src/common/result';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * WorkWithResults demonstrates integration with the project's Result<T, E> pattern.
 *
 * This shows how Screenplay components interact with the core library's Result type,
 * which is used throughout the scanner, parser, analyzer, and generator.
 *
 * Real examples from future stories:
 * - ParseSchemas would return Result<ValidatedProgram, Diagnostic[]>
 * - GenerateData would return Result<Record[], Diagnostic[]>
 * - ValidateConstraints would return Result<void, Diagnostic[]>
 */
export class WorkWithResults extends Ability {
  private _lastResult?: Result<string, Diagnostic[]>;

  static using(): WorkWithResults {
    return new WorkWithResults();
  }

  /**
   * Simulate a successful operation that returns Result<T, E>
   */
  performSuccessfulOperation(value: string): void {
    this._lastResult = ok(value);
  }

  /**
   * Simulate a failed operation with Diagnostic errors
   * This demonstrates how scanner/parser/analyzer report errors
   */
  performFailedOperation(diagnostics: Diagnostic[]): void {
    this._lastResult = err(diagnostics);
  }

  /**
   * Get the last result for assertions
   */
  getLastResult(): Result<string, Diagnostic[]> | undefined {
    return this._lastResult;
  }
}
