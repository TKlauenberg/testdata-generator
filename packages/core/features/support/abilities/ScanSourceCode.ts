import { Ability } from '@serenity-js/core';
import { scan } from '../../../src/scanner';
import type { Result } from '../../../src/common/result';
import type { Token } from '../../../src/scanner/tokens';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * ScanSourceCode ability allows actors to perform lexical analysis on DSL source code.
 *
 * This ability wraps the scanner module and stores results for later assertions.
 * It demonstrates how Screenplay pattern integrates with the scanner's Result type.
 */
export class ScanSourceCode extends Ability {
  private _source?: string;
  private _filename: string = 'test.td';
  private _scanResult?: Result<Token[], Diagnostic[]>;

  static using(): ScanSourceCode {
    return new ScanSourceCode();
  }

  /**
   * Store source code to be scanned
   */
  setSource(source: string, filename?: string): void {
    this._source = source;
    if (filename) {
      this._filename = filename;
    }
  }

  /**
   * Get the stored source code
   */
  getSource(): string {
    if (!this._source) {
      throw new Error('No source code has been set');
    }
    return this._source;
  }

  /**
   * Perform the scan operation
   */
  performScan(): void {
    if (!this._source) {
      throw new Error('Cannot scan: no source code has been set');
    }
    this._scanResult = scan(this._source, this._filename);
  }

  /**
   * Get the scan result for assertions
   */
  getScanResult(): Result<Token[], Diagnostic[]> {
    if (!this._scanResult) {
      throw new Error('No scan has been performed yet');
    }
    return this._scanResult;
  }
}
