import { describe, expect, it } from 'bun:test';
import { createRNG } from '../rng';
import {
  CHARSET_ALPHA,
  CHARSET_ALPHANUMERIC,
  CHARSET_NUMERIC,
  GENERATOR_REGISTRY,
  randomBoolean,
  randomFloat,
  randomInt,
  randomString,
} from './primitives';

describe('randomInt', () => {
  it('should generate integers within specified range', () => {
    const rng = createRNG(12345);
    for (let i = 0; i < 100; i++) {
      const value = randomInt(rng, 10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(20);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const sequence1 = Array.from({ length: 20 }, () => randomInt(rng1, 0, 100));
    const sequence2 = Array.from({ length: 20 }, () => randomInt(rng2, 0, 100));

    expect(sequence1).toEqual(sequence2);
  });

  it('should return same value when min equals max', () => {
    const rng = createRNG(42);
    const value = randomInt(rng, 5, 5);
    expect(value).toBe(5);
  });

  it('should throw error when min > max', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, 10, 5)).toThrow('Invalid range');
  });

  it('should throw error for non-finite bounds', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, NaN, 10)).toThrow('finite numbers');
    expect(() => randomInt(rng, 0, Infinity)).toThrow('finite numbers');
  });

  it('should throw error for non-integer bounds', () => {
    const rng = createRNG(42);
    expect(() => randomInt(rng, 1.5, 10)).toThrow('must be integers');
  });
});

describe('randomFloat', () => {
  it('should generate floats within specified range', () => {
    const rng = createRNG(54321);
    for (let i = 0; i < 100; i++) {
      const value = randomFloat(rng, 0.0, 1.0);
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThan(1.0);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(77777);
    const rng2 = createRNG(77777);

    const sequence1 = Array.from({ length: 20 }, () =>
      randomFloat(rng1, -10.0, 10.0),
    );
    const sequence2 = Array.from({ length: 20 }, () =>
      randomFloat(rng2, -10.0, 10.0),
    );

    expect(sequence1).toEqual(sequence2);
  });

  it('should return min when min equals max', () => {
    // Note: randomFloat uses [min, max) range (exclusive upper bound)
    // When min == max, the only possible value is min
    const rng = createRNG(42);
    const value = randomFloat(rng, 5.0, 5.0);
    expect(value).toBe(5.0);
  });

  it('should throw error when min > max', () => {
    const rng = createRNG(42);
    expect(() => randomFloat(rng, 5.0, 2.0)).toThrow('Invalid range');
  });

  it('should throw error for non-finite bounds', () => {
    const rng = createRNG(42);
    expect(() => randomFloat(rng, NaN, 10.0)).toThrow('finite numbers');
    expect(() => randomFloat(rng, 0.0, Infinity)).toThrow('finite numbers');
  });
});

describe('randomBoolean', () => {
  it('should generate true and false values', () => {
    const rng = createRNG(11111);
    const values = Array.from({ length: 100 }, () => randomBoolean(rng));

    const trueCount = values.filter((v) => v === true).length;
    const falseCount = values.filter((v) => v === false).length;

    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(33333);
    const rng2 = createRNG(33333);

    const sequence1 = Array.from({ length: 50 }, () => randomBoolean(rng1));
    const sequence2 = Array.from({ length: 50 }, () => randomBoolean(rng2));

    expect(sequence1).toEqual(sequence2);
  });

  it('should have approximately 50/50 distribution', () => {
    const rng = createRNG(88888);
    const sampleSize = 10000;
    const values = Array.from({ length: sampleSize }, () => randomBoolean(rng));

    const trueCount = values.filter((v) => v === true).length;
    const ratio = trueCount / sampleSize;

    // Should be close to 0.5 (within 5% for large sample)
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});

describe('randomString', () => {
  it('should generate strings of correct length', () => {
    const rng = createRNG(55555);
    expect(randomString(rng, 0).length).toBe(0);
    expect(randomString(rng, 10).length).toBe(10);
    expect(randomString(rng, 100).length).toBe(100);
  });

  it('should use default alphanumeric charset', () => {
    const rng = createRNG(66666);
    const str = randomString(rng, 100);

    // All characters should be in alphanumeric set
    for (const char of str) {
      expect(CHARSET_ALPHANUMERIC.includes(char)).toBe(true);
    }
  });

  it('should respect custom charset', () => {
    const rng = createRNG(77777);
    const customCharset = 'ABC123';
    const str = randomString(rng, 50, customCharset);

    // All characters should be from custom set
    for (const char of str) {
      expect(customCharset.includes(char)).toBe(true);
    }
  });

  it('should use only alpha characters when specified', () => {
    const rng = createRNG(88888);
    const str = randomString(rng, 50, CHARSET_ALPHA);

    for (const char of str) {
      expect(CHARSET_ALPHA.includes(char)).toBe(true);
      expect(CHARSET_NUMERIC.includes(char)).toBe(false);
    }
  });

  it('should produce identical sequences with same seed', () => {
    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const sequence1 = Array.from({ length: 10 }, () => randomString(rng1, 20));
    const sequence2 = Array.from({ length: 10 }, () => randomString(rng2, 20));

    expect(sequence1).toEqual(sequence2);
  });

  it('should throw error for negative length', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, -1)).toThrow(
      'must be a non-negative integer',
    );
  });

  it('should throw error for non-integer length', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, 5.5)).toThrow(
      'must be a non-negative integer',
    );
  });

  it('should throw error for empty charset', () => {
    const rng = createRNG(42);
    expect(() => randomString(rng, 10, '')).toThrow(
      'Character set cannot be empty',
    );
  });
});

describe('GENERATOR_REGISTRY', () => {
  it('should map all generator names to functions', () => {
    expect(GENERATOR_REGISTRY.get('int')).toBe(randomInt);
    expect(GENERATOR_REGISTRY.get('integer')).toBe(randomInt);
    expect(GENERATOR_REGISTRY.get('float')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('double')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('number')).toBe(randomFloat);
    expect(GENERATOR_REGISTRY.get('string')).toBe(randomString);
    expect(GENERATOR_REGISTRY.get('text')).toBe(randomString);
    expect(GENERATOR_REGISTRY.get('bool')).toBe(randomBoolean);
    expect(GENERATOR_REGISTRY.get('boolean')).toBe(randomBoolean);
  });

  it('should have all expected entries', () => {
    const expectedNames = [
      'int',
      'integer',
      'float',
      'double',
      'number',
      'string',
      'text',
      'bool',
      'boolean',
    ];

    for (const name of expectedNames) {
      expect(GENERATOR_REGISTRY.has(name)).toBe(true);
    }
  });
});
