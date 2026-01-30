import { Question, type UsesAbilities } from '@serenity-js/core';
import { ScanSourceCode } from '../abilities/ScanSourceCode';
import type { Token } from '../../../src/scanner/tokens';
import type { Diagnostic } from '../../../src/common/diagnostic';

/**
 * Questions about scanner results.
 *
 * These allow actors to query scanner state for assertions.
 */

export const ScanResult = {
  /**
   * Check if scan succeeded
   * Usage: actor.asks(ScanResult.succeeded())
   */
  succeeded: () =>
    Question.about<boolean>(`scan succeeded`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      return result.ok;
    }),

  /**
   * Check if scan failed
   * Usage: actor.asks(ScanResult.failed())
   */
  failed: () =>
    Question.about<boolean>(`scan failed`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      return !result.ok;
    }),

  /**
   * Get the tokens from successful scan
   * Usage: actor.asks(ScanResult.tokens())
   */
  tokens: () =>
    Question.about<Token[]>(`scan tokens`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        throw new Error('Cannot get tokens from failed scan');
      }
      return result.value;
    }),

  /**
   * Get the errors from failed scan
   * Usage: actor.asks(ScanResult.errors())
   */
  errors: () =>
    Question.about<Diagnostic[]>(`scan errors`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (result.ok) {
        throw new Error('Cannot get errors from successful scan');
      }
      return result.errors;
    }),

  /**
   * Get the first token from successful scan
   * Usage: actor.asks(ScanResult.firstToken())
   */
  firstToken: () =>
    Question.about<Token>(`first token`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        throw new Error('Cannot get first token from failed scan');
      }
      if (result.value.length === 0) {
        throw new Error('No tokens in scan result');
      }
      return result.value[0];
    }),

  /**
   * Get the first error from failed scan
   * Usage: actor.asks(ScanResult.firstError())
   */
  firstError: () =>
    Question.about<Diagnostic>(`first error`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (result.ok) {
        throw new Error('Cannot get first error from successful scan');
      }
      if (result.errors.length === 0) {
        throw new Error('No errors in scan result');
      }
      return result.errors[0];
    }),

  /**
   * Get the error code from first error
   * Usage: actor.asks(ScanResult.firstErrorCode())
   */
  firstErrorCode: () =>
    Question.about<string>(`first error code`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (result.ok) {
        throw new Error('Cannot get error code from successful scan');
      }
      if (result.errors.length === 0) {
        throw new Error('No errors in scan result');
      }
      return result.errors[0].code;
    }),

  /**
   * Get the error message from first error
   * Usage: actor.asks(ScanResult.firstErrorMessage())
   */
  firstErrorMessage: () =>
    Question.about<string>(`first error message`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (result.ok) {
        throw new Error('Cannot get error message from successful scan');
      }
      if (result.errors.length === 0) {
        throw new Error('No errors in scan result');
      }
      return result.errors[0].message;
    }),
};

/**
 * Questions about tokens
 */
export const TokenList = {
  /**
   * Count tokens of a specific kind
   * Usage: actor.asks(TokenList.countOfKind('identifier'))
   */
  countOfKind: (kind: string) =>
    Question.about<number>(`count of ${kind} tokens`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        throw new Error('Cannot count tokens from failed scan');
      }
      return result.value.filter((token) => token.kind === kind).length;
    }),

  /**
   * Check if tokens contain a specific keyword
   * Usage: actor.asks(TokenList.containsKeyword('schema'))
   */
  containsKeyword: (keyword: string) =>
    Question.about<boolean>(`tokens contain keyword ${keyword}`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        return false;
      }
      return result.value.some((token) => token.kind === 'keyword' && token.value === keyword);
    }),

  /**
   * Check if tokens contain a specific identifier
   * Usage: actor.asks(TokenList.containsIdentifier('User'))
   */
  containsIdentifier: (identifier: string) =>
    Question.about<boolean>(`tokens contain identifier ${identifier}`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        return false;
      }
      return result.value.some(
        (token) => token.kind === 'identifier' && token.value === identifier,
      );
    }),

  /**
   * Check if tokens contain operator tokens
   * Usage: actor.asks(TokenList.containsOperators())
   */
  containsOperators: () =>
    Question.about<boolean>(`tokens contain operators`, (actor: UsesAbilities) => {
      const result = ScanSourceCode.as(actor).getScanResult();
      if (!result.ok) {
        return false;
      }
      return result.value.some((token) => token.kind === 'operator');
    }),
};
