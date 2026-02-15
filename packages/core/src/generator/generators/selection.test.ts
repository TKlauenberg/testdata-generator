import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { pick, weightedPick, type WeightedOption } from './selection';

describe('Selection Generators', () => {
  describe('pick()', () => {
    it('returns element from array with deterministic seed', () => {
      const rng = createRNG(42);
      const array = ['apple', 'banana', 'cherry', 'date'];
      const value = pick(rng, array);

      expect(array).toContain(value);
      expect(typeof value).toBe('string');
    });

    it('is deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);
      const array = ['a', 'b', 'c', 'd', 'e'];

      expect(pick(rng1, array)).toBe(pick(rng2, array));
    });

    it('throws error for empty array', () => {
      const rng = createRNG(100);

      expect(() => pick(rng, [])).toThrow('Cannot pick from an empty array');
    });

    it('distribution test - uniform across elements', () => {
      const rng = createRNG(9999);
      const array = ['A', 'B', 'C', 'D'];
      const counts = { A: 0, B: 0, C: 0, D: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = pick(rng, array);
        counts[value as keyof typeof counts]++;
      }

      // Each element should be selected approximately 25% of the time (±5% tolerance)
      const expectedCount = iterations / array.length;
      const tolerance = expectedCount * 0.1; // 10% tolerance for statistical variation

      for (const key in counts) {
        expect(Math.abs(counts[key as keyof typeof counts] - expectedCount)).toBeLessThan(tolerance);
      }
    });

    it('handles single-element array', () => {
      const rng = createRNG(777);
      const array = ['only'];

      expect(pick(rng, array)).toBe('only');
    });

    it('works with different data types', () => {
      const rng1 = createRNG(111);
      const rng2 = createRNG(222);
      const rng3 = createRNG(333);

      const numbers = [1, 2, 3, 4, 5];
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const mixed = [42, 'text', true, null];

      expect(numbers).toContain(pick(rng1, numbers));
      expect(objects).toContain(pick(rng2, objects));
      expect(mixed).toContain(pick(rng3, mixed));
    });
  });

  describe('weightedPick()', () => {
    it('returns value from options with deterministic seed', () => {
      const rng = createRNG(50);
      const options: WeightedOption<string>[] = [
        { value: 'rare', weight: 10 },
        { value: 'common', weight: 50 },
        { value: 'uncommon', weight: 40 },
      ];

      const value = weightedPick(rng, options);
      const values = options.map((opt) => opt.value);

      expect(values).toContain(value);
      expect(typeof value).toBe('string');
    });

    it('is deterministic with same seed', () => {
      const rng1 = createRNG(54321);
      const rng2 = createRNG(54321);
      const options: WeightedOption<string>[] = [
        { value: 'a', weight: 1 },
        { value: 'b', weight: 2 },
        { value: 'c', weight: 3 },
      ];

      expect(weightedPick(rng1, options)).toBe(weightedPick(rng2, options));
    });

    it('throws error for empty options array', () => {
      const rng = createRNG(200);

      expect(() => weightedPick(rng, [])).toThrow('Cannot pick from an empty options array');
    });

    it('throws error for negative weight', () => {
      const rng = createRNG(201);
      const options: WeightedOption<string>[] = [
        { value: 'valid', weight: 10 },
        { value: 'invalid', weight: -5 },
      ];

      expect(() => weightedPick(rng, options)).toThrow('All weights must be positive numbers');
    });

    it('throws error for zero weight', () => {
      const rng = createRNG(202);
      const options: WeightedOption<string>[] = [
        { value: 'valid', weight: 10 },
        { value: 'invalid', weight: 0 },
      ];

      expect(() => weightedPick(rng, options)).toThrow('All weights must be positive numbers');
    });

    it('throws error for non-numeric weight', () => {
      const rng = createRNG(203);
      const options = [
        { value: 'valid', weight: 10 },
        { value: 'invalid', weight: NaN },
      ];

      expect(() => weightedPick(rng, options)).toThrow('All weights must be positive numbers');
    });

    it('throws error for infinite weight', () => {
      const rng = createRNG(204);
      const options = [
        { value: 'valid', weight: 10 },
        { value: 'invalid', weight: Infinity },
      ];

      expect(() => weightedPick(rng, options)).toThrow('All weights must be positive numbers');
    });

    it('respects weight probability - statistical verification', () => {
      const rng = createRNG(88888);
      const options: WeightedOption<string>[] = [
        { value: 'high', weight: 70 },
        { value: 'medium', weight: 20 },
        { value: 'low', weight: 10 },
      ];

      const counts = { high: 0, medium: 0, low: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = weightedPick(rng, options);
        counts[value as keyof typeof counts]++;
      }

      // Expected: high 70%, medium 20%, low 10%
      const highExpected = iterations * 0.7;
      const mediumExpected = iterations * 0.2;
      const lowExpected = iterations * 0.1;

      // Allow ±10% tolerance for statistical variation
      const highTolerance = highExpected * 0.1;
      const mediumTolerance = mediumExpected * 0.15; // Slightly higher tolerance for smaller percentages
      const lowTolerance = lowExpected * 0.2; // Even more tolerance for smallest percentage

      expect(Math.abs(counts.high - highExpected)).toBeLessThan(highTolerance);
      expect(Math.abs(counts.medium - mediumExpected)).toBeLessThan(mediumTolerance);
      expect(Math.abs(counts.low - lowExpected)).toBeLessThan(lowTolerance);
    });

    it('handles equal weights (should behave like uniform distribution)', () => {
      const rng = createRNG(55555);
      const options: WeightedOption<string>[] = [
        { value: 'A', weight: 25 },
        { value: 'B', weight: 25 },
        { value: 'C', weight: 25 },
        { value: 'D', weight: 25 },
      ];

      const counts = { A: 0, B: 0, C: 0, D: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = weightedPick(rng, options);
        counts[value as keyof typeof counts]++;
      }

      // Each should be approximately 25% (±10% tolerance)
      const expectedCount = iterations / options.length;
      const tolerance = expectedCount * 0.1;

      for (const key in counts) {
        expect(Math.abs(counts[key as keyof typeof counts] - expectedCount)).toBeLessThan(tolerance);
      }
    });

    it('handles extreme weight ratios', () => {
      const rng = createRNG(66666);
      const options: WeightedOption<string>[] = [
        { value: 'very-rare', weight: 1 },
        { value: 'very-common', weight: 999 },
      ];

      const counts = { 'very-rare': 0, 'very-common': 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = weightedPick(rng, options);
        counts[value as keyof typeof counts]++;
      }

      // very-common should be ~99.9%, very-rare ~0.1%
      const commonExpected = iterations * 0.999;
      const rareExpected = iterations * 0.001;

      // Use percentage-based tolerance for very small values
      expect(counts['very-common']).toBeGreaterThan(commonExpected * 0.95);
      expect(counts['very-rare']).toBeLessThan(rareExpected * 5); // Allow 5x variance for tiny percentages
    });

    it('handles single option', () => {
      const rng = createRNG(777);
      const options: WeightedOption<string>[] = [{ value: 'only', weight: 1 }];

      expect(weightedPick(rng, options)).toBe('only');
    });

    it('works with different data types', () => {
      const rng1 = createRNG(1111);
      const rng2 = createRNG(2222);

      const numberOptions: WeightedOption<number>[] = [
        { value: 1, weight: 50 },
        { value: 2, weight: 50 },
      ];

      const objectOptions: WeightedOption<{ id: number }>[] = [
        { value: { id: 1 }, weight: 30 },
        { value: { id: 2 }, weight: 70 },
      ];

      expect([1, 2]).toContain(weightedPick(rng1, numberOptions));
      const objResult = weightedPick(rng2, objectOptions);
      expect([1, 2]).toContain(objResult.id);
    });

    it('determinism test - same seed produces same sequence', () => {
      const seed = 99999;
      const options: WeightedOption<string>[] = [
        { value: 'X', weight: 40 },
        { value: 'Y', weight: 30 },
        { value: 'Z', weight: 30 },
      ];

      const rng1 = createRNG(seed);
      const sequence1 = Array.from({ length: 10 }, () => weightedPick(rng1, options));

      const rng2 = createRNG(seed);
      const sequence2 = Array.from({ length: 10 }, () => weightedPick(rng2, options));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('determinism tests for both generators', () => {
    it('pick produces same output for same seed', () => {
      const array = ['red', 'green', 'blue', 'yellow'];
      const seed = 123456;

      const rng1 = createRNG(seed);
      const results1 = Array.from({ length: 20 }, () => pick(rng1, array));

      const rng2 = createRNG(seed);
      const results2 = Array.from({ length: 20 }, () => pick(rng2, array));

      expect(results1).toEqual(results2);
    });

    it('weightedPick produces same output for same seed', () => {
      const options: WeightedOption<string>[] = [
        { value: 'active', weight: 70 },
        { value: 'inactive', weight: 20 },
        { value: 'suspended', weight: 10 },
      ];
      const seed = 654321;

      const rng1 = createRNG(seed);
      const results1 = Array.from({ length: 20 }, () => weightedPick(rng1, options));

      const rng2 = createRNG(seed);
      const results2 = Array.from({ length: 20 }, () => weightedPick(rng2, options));

      expect(results1).toEqual(results2);
    });
  });
});
