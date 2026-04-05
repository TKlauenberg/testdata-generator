import { describe, expect, test } from 'bun:test';
import { comparePatternVersions } from './patternDiff';
import type { PatternVersionSnapshot } from './patternVersionStore';

function createSnapshot(patternHash: string, lineage: PatternVersionSnapshot['lineage']): PatternVersionSnapshot {
  return {
    patternHash,
    lineage,
  };
}

describe('pattern diff', () => {
  test('treats identical hashes as a no-op diff', () => {
    const snapshot = createSnapshot('same-hash', [
      {
        type: 'root-pattern',
        identifier: 'schemas/users.td',
        hash: 'root-a',
        content: 'schema User { id: number }',
      },
    ]);

    const diff = comparePatternVersions(snapshot, snapshot);

    expect(diff).toEqual({
      identical: true,
      potentiallyBreaking: false,
      added: [],
      removed: [],
      modified: [],
    });
  });

  test('reports modified root pattern content with deterministic excerpts', () => {
    const oldSnapshot = createSnapshot('old-hash', [
      {
        type: 'root-pattern',
        identifier: 'schemas/users.td',
        hash: 'root-a',
        content: ['schema User {', '  id: number', '}', ''].join('\n'),
      },
    ]);
    const newSnapshot = createSnapshot('new-hash', [
      {
        type: 'root-pattern',
        identifier: 'schemas/users.td',
        hash: 'root-b',
        content: ['schema User {', '  id: number', '  email: string', '}', ''].join('\n'),
      },
    ]);

    const diff = comparePatternVersions(oldSnapshot, newSnapshot);

    expect(diff.identical).toBe(false);
    expect(diff.potentiallyBreaking).toBe(true);
    expect(diff.modified).toEqual([
      {
        type: 'root-pattern',
        identifier: 'schemas/users.td',
        oldHash: 'root-a',
        newHash: 'root-b',
        excerpt: {
          lineNumber: 3,
          oldLine: '}',
          newLine: 'email: string',
        },
      },
    ]);
  });

  test('reports added, removed, and modified lineage components in stable order', () => {
    const oldSnapshot = createSnapshot('old-hash', [
      {
        type: 'root-pattern',
        identifier: 'apps/main.td',
        hash: 'root-a',
        content: 'schema User { profile: SharedProfile }',
      },
      {
        type: 'imported-pattern',
        identifier: 'shared/common.td',
        hash: 'import-a',
        content: 'schema SharedProfile { id: uuid }',
      },
      {
        type: 'workspace-generator',
        identifier: 'sharedEmail',
        hash: 'generator-a',
        content: '{"type":"template","template":"{{localPart}}@example.com"}',
      },
    ]);
    const newSnapshot = createSnapshot('new-hash', [
      {
        type: 'root-pattern',
        identifier: 'apps/main.td',
        hash: 'root-b',
        content: 'schema User { profile: SharedProfile email: string }',
      },
      {
        type: 'imported-pattern',
        identifier: 'shared/common.td',
        hash: 'import-b',
        content: 'schema SharedProfile { id: uuid email: string }',
      },
      {
        type: 'workspace-generator',
        identifier: 'ticketCode',
        hash: 'generator-b',
        content: '{"type":"composition","compose":[{"type":"literal","value":"QA"}]}',
      },
    ]);

    const diff = comparePatternVersions(oldSnapshot, newSnapshot);

    expect(diff.identical).toBe(false);
    expect(diff.potentiallyBreaking).toBe(true);
    expect(diff.added.map((entry) => `${entry.type}:${entry.identifier}`)).toEqual([
      'workspace-generator:ticketCode',
    ]);
    expect(diff.removed.map((entry) => `${entry.type}:${entry.identifier}`)).toEqual([
      'workspace-generator:sharedEmail',
    ]);
    expect(diff.modified.map((entry) => `${entry.type}:${entry.identifier}`)).toEqual([
      'imported-pattern:shared/common.td',
      'root-pattern:apps/main.td',
    ]);
  });
});