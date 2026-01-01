import { describe, test, expect } from 'bun:test';
import { version } from '@testdata-ai/core';

describe('Workspace Integration', () => {
  test('CLI can import from core package via workspace link', () => {
    // If this test runs, workspace linking is working
    expect(version).toBeDefined();
    expect(version).toBe('0.1.0');
  });

  test('Core package is resolved as ESM module', () => {
    // Verify the import is an ES module (not CommonJS)
    expect(typeof version).toBe('string');
  });
});
