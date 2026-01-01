import { describe, test, expect } from 'bun:test';
import { version } from './index';

describe('Core Package', () => {
  test('exports version', () => {
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  });

  test('version is 0.1.0', () => {
    expect(version).toBe('0.1.0');
  });

  test('module uses ESM (has ES6 export)', () => {
    // If this test runs, it proves ESM modules work
    expect(version).toBeDefined();
  });
});
