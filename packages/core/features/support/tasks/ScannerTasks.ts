import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { ScanSourceCode } from '../abilities/ScanSourceCode';

/**
 * Tasks for scanning DSL source code.
 *
 * These wrap scanner operations in Screenplay Tasks that actors can perform.
 */

export const SetSourceCode = {
  /**
   * Set DSL source code to be scanned
   * Usage: actor.attemptsTo(SetSourceCode.to('schema User { }'))
   */
  to: (source: string, filename?: string) =>
    Interaction.where(`#actor sets source code`, (actor: UsesAbilities) => {
      ScanSourceCode.as(actor).setSource(source, filename);
    }),
};

export const PerformScan = {
  /**
   * Scan the source code that was previously set
   * Usage: actor.attemptsTo(PerformScan.ofSourceCode())
   */
  ofSourceCode: () =>
    Interaction.where(`#actor scans the source code`, (actor: UsesAbilities) => {
      ScanSourceCode.as(actor).performScan();
    }),
};
