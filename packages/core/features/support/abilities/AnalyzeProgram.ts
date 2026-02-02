/**
 * AnalyzeProgram Ability
 *
 * Grants an Actor the ability to run semantic analysis on a parsed Program.
 */

import { Ability } from '@serenity-js/core';
import { analyze } from '../../../src/analyzer/analyzer';
import type { Program } from '../../../src/parser/ast';
import type { ValidatedProgram } from '../../../src/analyzer/types';
import type { Diagnostic } from '../../../src/common/diagnostic';
import type { Result } from '../../../src/common/result';

export class AnalyzeProgram extends Ability {
  private _analysisResult?: Result<ValidatedProgram, Diagnostic[]>;

  static using(): AnalyzeProgram {
    return new AnalyzeProgram();
  }

  analyzeProgram(program: Program): Result<ValidatedProgram, Diagnostic[]> {
    this._analysisResult = analyze(program);
    return this._analysisResult;
  }

  getResult(): Result<ValidatedProgram, Diagnostic[]> | undefined {
    return this._analysisResult;
  }

}
