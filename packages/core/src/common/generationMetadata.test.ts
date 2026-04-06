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

  test('changes the pattern hash when the root pattern content changes', () => {
    const original = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number }' },
      ],
    });

    const updated = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { id: number email: string }' },
      ],
    });

    expect(original.patternHash).not.toBe(updated.patternHash);
  });

  test('changes the pattern hash when imported pattern content changes', () => {
    const original = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: '@import "./shared.td"\nschema User { profile: SharedProfile }' },
        { type: 'imported-pattern', identifier: 'schemas/shared.td', content: 'schema SharedProfile { id: uuid }' },
      ],
    });

    const updated = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: '@import "./shared.td"\nschema User { profile: SharedProfile }' },
        { type: 'imported-pattern', identifier: 'schemas/shared.td', content: 'schema SharedProfile { id: uuid email: string }' },
      ],
    });

    expect(original.patternHash).not.toBe(updated.patternHash);
  });

  test('changes the pattern hash when workspace generator definitions change', () => {
    const original = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { email: string generator=@workspace.generators.sharedEmail }' },
        { type: 'workspace-generator', identifier: 'sharedEmail', content: '{"type":"template","template":"{{localPart}}@example.com"}' },
      ],
    });

    const updated = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { email: string generator=@workspace.generators.sharedEmail }' },
        { type: 'workspace-generator', identifier: 'sharedEmail', content: '{"type":"template","template":"{{localPart}}@qa.example.com"}' },
      ],
    });

    expect(original.patternHash).not.toBe(updated.patternHash);
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

  test('normalizes platform-reserved context references deterministically', () => {
    const metadata = createGenerationMetadata({
      timestamp: '2026-04-05T10:00:00.000Z',
      sourcePattern: 'schemas/users.td',
      count: 2,
      format: 'json',
      version: '0.1.0',
      lineageInputs: [
        { type: 'root-pattern', identifier: 'schemas/users.td', content: 'schema User { email: string }' },
      ],
      platformReserved: {
        contextReferences: [
          {
            raw: '@context.users@staging AND @region-us.random.email',
            collection: 'users',
            tags: ['region-us', 'staging'],
            selector: { kind: 'random' },
            fieldPath: ['email'],
          },
          {
            raw: '@context.users[0].email',
            collection: 'users',
            tags: [],
            selector: { kind: 'index', index: 0 },
            fieldPath: ['email'],
          },
        ],
      },
    });

    expect(metadata.platformReserved?.contextReferences).toEqual([
      {
        raw: '@context.users[0].email',
        collection: 'users',
        tags: [],
        selector: { kind: 'index', index: 0 },
        fieldPath: ['email'],
      },
      {
        raw: '@context.users@staging AND @region-us.random.email',
        collection: 'users',
        tags: ['region-us', 'staging'],
        selector: { kind: 'random' },
        fieldPath: ['email'],
      },
    ]);
  });
});