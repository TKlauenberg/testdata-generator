/**
 * Common Utilities Module
 *
 * Shared utilities used across the testdata-ai project.
 * Currently exports the Result type pattern for error handling
 * and the Diagnostic system for error reporting.
 */

export type { Result } from './result';
export { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr } from './result';

export type {
  Diagnostic,
  SourceLocation,
  DiagnosticSeverity,
  CreateDiagnosticOptions,
} from './diagnostic';
export {
  createDiagnostic,
  unterminatedString,
  invalidCharacter,
  unexpectedEOF,
  unexpectedToken,
  expectedToken,
  missingSemicolon,
  undefinedReference,
  typeMismatch,
  duplicateDefinition,
} from './diagnostic';

export type {
  CreateGenerationMetadataOptions,
  GenerationMetadataContextReference,
  GenerationMetadataContextReferenceIndexSelector,
  GenerationMetadataContextReferenceRandomSelector,
  GenerationMetadataContextReferenceSelector,
  GenerationMetadata,
  GenerationMetadataFormat,
  GenerationMetadataLineageEntry,
  GenerationMetadataLineageInput,
  GenerationMetadataLineageType,
  GenerationMetadataPlatformReserved,
} from './generationMetadata';
export {
  createGenerationMetadata,
  decodeGenerationMetadataComment,
  encodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
  isGenerationMetadata,
} from './generationMetadata';
