import { describe, expect, test } from 'bun:test';
import {
  createGenerationMetadata,
  decodeGenerationMetadataComment,
  encodeGenerationMetadataComment,
} from './generationMetadata';

describe('generation metadata', () => {
  test('creates a deterministic pattern hash from sorted lineage inputs', () => {
    const metadataA = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'workspace-generator', identifier: 'sharedEmail', content: '{"type":"template"}' },
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number }' },
      ],
    });

    const metadataB = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number }' },
        { type: 'workspace-generator', identifier: 'sharedEmail', content: '{"type":"template"}' },
      ],
    });

    expect(metadataA.patternHash).toBe(metadataB.patternHash);
    expect(metadataA.lineage).toEqual(metadataB.lineage);
  });

  test('encodes and decodes metadata comments losslessly', () => {
    const metadata = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'csv',
      seed: 42,
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number }' },
      ],
    });

    const encoded = encodeGenerationMetadataComment(metadata);

    expect(decodeGenerationMetadataComment(encoded)).toEqual(metadata);
  });
});