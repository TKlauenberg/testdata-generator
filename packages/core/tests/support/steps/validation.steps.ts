/**
 * Step definitions for end-to-end validation feature
 * These are meant to be used with a Gherkin test runner when implemented
 * For now, the unit tests in validate.test.ts cover the acceptance criteria
 */

import { validateSchema } from '../../../src/validate';
import type { Result } from '../../../src/common/result';
import type { ValidatedProgram } from '../../../src/analyzer/types';
import type { Diagnostic } from '../../../src/common/diagnostic';

// Actor state interface for future Screenplay pattern implementation
export interface ValidationActor {
  schemaSource?: string;
  filename: string;
  result?: Result<ValidatedProgram, Diagnostic[]>;
  validationStartTime?: number;
  validationDuration?: number;
}

// Step definition helpers (to be used when Gherkin runner is implemented)
export const steps = {
  givenValidationAPIAvailable: (actor: ValidationActor): void => {
    actor.filename = 'test.td';
  },

  givenSchemaContent: (actor: ValidationActor, content: string): void => {
    actor.schemaSource = content;
  },

  givenLargeSchema: (
    actor: ValidationActor,
    schemaCount: number,
    fieldsPerSchema: number,
  ): void => {
    const schemas: string[] = [];
    for (let i = 0; i < schemaCount; i++) {
      const fields: string[] = [];
      for (let j = 0; j < fieldsPerSchema; j++) {
        const types = ['uuid', 'string', 'number', 'boolean', 'date', 'timestamp'];
        const type = types[j % types.length];
        fields.push(`  field${j}: ${type}`);
      }
      schemas.push(`schema Schema${i} {\n${fields.join('\n')}\n}`);
    }
    actor.schemaSource = schemas.join('\n\n');
  },

  whenValidateSchema: (actor: ValidationActor): void => {
    if (!actor.schemaSource) {
      throw new Error('No schema source provided');
    }
    actor.validationStartTime = performance.now();
    actor.result = validateSchema(actor.schemaSource, actor.filename);
    actor.validationDuration = performance.now() - actor.validationStartTime;
  },

  thenValidationSucceeds: (actor: ValidationActor): void => {
    if (!actor.result) {
      throw new Error('No validation result available');
    }
    if (!actor.result.ok) {
      const errorMessages = actor.result.errors
        .map((err) => `${err.location?.line}:${err.location?.column} - ${err.message}`)
        .join('\n');
      throw new Error(`Expected validation to succeed, but got errors:\n${errorMessages}`);
    }
  },

  thenValidationFails: (actor: ValidationActor): void => {
    if (!actor.result) {
      throw new Error('No validation result available');
    }
    if (actor.result.ok) {
      throw new Error('Expected validation to fail, but it succeeded');
    }
  },

  thenSchemaCount: (actor: ValidationActor, count: number): void => {
    if (!actor.result?.ok) {
      throw new Error('Expected successful validation result');
    }
    const actualCount = actor.result.value.schemas.size;
    if (actualCount !== count) {
      throw new Error(`Expected ${count} schema(s), but got ${actualCount}`);
    }
  },

  thenFieldCount: (actor: ValidationActor, count: number): void => {
    if (!actor.result?.ok) {
      throw new Error('Expected successful validation result');
    }
    const actualCount = actor.result.value.metadata.totalFields;
    if (actualCount !== count) {
      throw new Error(`Expected ${count} fields, but got ${actualCount}`);
    }
  },

  thenErrorContains: (actor: ValidationActor, text: string): void => {
    if (!actor.result || actor.result.ok) {
      throw new Error('Expected validation errors');
    }
    const hasMatchingError = actor.result.errors.some((err) =>
      err.message.toLowerCase().includes(text.toLowerCase()),
    );
    if (!hasMatchingError) {
      const errorMessages = actor.result.errors.map((err) => err.message).join('\n');
      throw new Error(`Expected error containing "${text}", but got:\n${errorMessages}`);
    }
  },

  thenErrorCodeStartsWith: (actor: ValidationActor, prefix: string): void => {
    if (!actor.result || actor.result.ok) {
      throw new Error('Expected validation errors');
    }
    const firstError = actor.result.errors[0];
    if (!firstError.code.startsWith(prefix)) {
      throw new Error(
        `Expected error code to start with "${prefix}", but got "${firstError.code}"`,
      );
    }
  },

  thenPerformanceUnder: (actor: ValidationActor, maxMs: number): void => {
    if (actor.validationDuration === undefined) {
      throw new Error('No validation duration recorded');
    }
    if (actor.validationDuration >= maxMs) {
      throw new Error(
        `Expected validation under ${maxMs}ms, took ${actor.validationDuration.toFixed(2)}ms`,
      );
    }
  },
};
