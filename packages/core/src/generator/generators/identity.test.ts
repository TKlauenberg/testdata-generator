import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { uuid, sequential, nanoid } from './identity';

describe('identity generators', () => {
  describe('uuid()', () => {
    it('should generate valid RFC4122 v4 UUID format', () => {
      const rng = createRNG(12345);
      const result = uuid(rng);

      // Test format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result).toMatch(uuidRegex);
    });

    it('should set version bits to 4', () => {
      const rng = createRNG(12345);
      const result = uuid(rng);

      // Version is in 3rd group, first character (0-indexed position 14)
      expect(result[14]).toBe('4');
    });

    it('should set variant bits to 10xx', () => {
      const rng = createRNG(12345);
      const result = uuid(rng);

      // Variant is in 4th group, first character (0-indexed position 19)
      const variantChar = result[19].toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should generate deterministic UUIDs with same seed', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(42);

      expect(uuid(rng1)).toBe(uuid(rng2));
    });

    it('should generate different UUIDs with different seeds', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(999);

      expect(uuid(rng1)).not.toBe(uuid(rng2));
    });

    it('should generate unique UUIDs on consecutive calls', () => {
      const rng = createRNG(12345);
      const uuid1 = uuid(rng);
      const uuid2 = uuid(rng);
      const uuid3 = uuid(rng);

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should have correct string length (36 chars with hyphens)', () => {
      const rng = createRNG(12345);
      const result = uuid(rng);

      expect(result.length).toBe(36);
    });

    it('should have hyphens at correct positions', () => {
      const rng = createRNG(12345);
      const result = uuid(rng);

      expect(result[8]).toBe('-');
      expect(result[13]).toBe('-');
      expect(result[18]).toBe('-');
      expect(result[23]).toBe('-');
    });
  });

  describe('sequential()', () => {
    it('should start from specified value', () => {
      const gen = sequential(100);
      expect(gen()).toBe(100);
    });

    it('should increment on each call', () => {
      const gen = sequential(1);
      expect(gen()).toBe(1);
      expect(gen()).toBe(2);
      expect(gen()).toBe(3);
    });

    it('should default to starting at 1', () => {
      const gen = sequential();
      expect(gen()).toBe(1);
    });

    it('should maintain independent state across instances', () => {
      const gen1 = sequential(10);
      const gen2 = sequential(100);

      expect(gen1()).toBe(10);
      expect(gen2()).toBe(100);
      expect(gen1()).toBe(11);
      expect(gen2()).toBe(101);
    });

    it('should throw on non-integer start value', () => {
      expect(() => sequential(1.5)).toThrow('must be an integer');
    });

    it('should throw on unsafe integer start value', () => {
      expect(() => sequential(Number.MAX_SAFE_INTEGER + 1)).toThrow(
        'must be a safe integer',
      );
    });

    it('should start from negative values', () => {
      const gen = sequential(-5);
      expect(gen()).toBe(-5);
      expect(gen()).toBe(-4);
      expect(gen()).toBe(-3);
    });

    it('should start from zero', () => {
      const gen = sequential(0);
      expect(gen()).toBe(0);
      expect(gen()).toBe(1);
      expect(gen()).toBe(2);
    });

    it('should handle large sequences', () => {
      const gen = sequential(1);
      for (let i = 0; i < 1000; i++) {
        gen();
      }
      expect(gen()).toBe(1001);
    });

    it('should throw when exceeding safe integer range', () => {
      const gen = sequential(Number.MAX_SAFE_INTEGER);
      gen(); // First call returns MAX_SAFE_INTEGER
      expect(() => gen()).toThrow('exceeded safe integer range'); // Second call overflows
    });
  });

  describe('nanoid()', () => {
    it('should generate default length of 21 characters', () => {
      const rng = createRNG(12345);
      const result = nanoid(rng);
      expect(result.length).toBe(21);
    });

    it('should generate custom length', () => {
      const rng = createRNG(12345);
      expect(nanoid(rng, 10).length).toBe(10);
      expect(nanoid(rng, 32).length).toBe(32);
    });

    it('should use only URL-safe characters', () => {
      const rng = createRNG(12345);
      const result = nanoid(rng, 100); // Large sample

      // All characters must be in: A-Za-z0-9_-
      const urlSafeRegex = /^[A-Za-z0-9_-]+$/;
      expect(result).toMatch(urlSafeRegex);
    });

    it('should generate deterministic IDs with same seed', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(42);

      expect(nanoid(rng1, 15)).toBe(nanoid(rng2, 15));
    });

    it('should generate different IDs with different seeds', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(999);

      expect(nanoid(rng1, 15)).not.toBe(nanoid(rng2, 15));
    });

    it('should throw on invalid length (zero)', () => {
      const rng = createRNG(12345);
      expect(() => nanoid(rng, 0)).toThrow('positive integer');
    });

    it('should throw on invalid length (negative)', () => {
      const rng = createRNG(12345);
      expect(() => nanoid(rng, -5)).toThrow('positive integer');
    });

    it('should throw on invalid length (non-integer)', () => {
      const rng = createRNG(12345);
      expect(() => nanoid(rng, 1.5)).toThrow('positive integer');
    });

    it('should generate length 1 nanoid', () => {
      const rng = createRNG(12345);
      const result = nanoid(rng, 1);
      expect(result.length).toBe(1);
      expect(/^[A-Za-z0-9_-]$/.test(result)).toBe(true);
    });

    it('should generate unique IDs on consecutive calls', () => {
      const rng = createRNG(12345);
      const id1 = nanoid(rng, 21);
      const id2 = nanoid(rng, 21);
      const id3 = nanoid(rng, 21);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should use all character types (uppercase, lowercase, digits, symbols)', () => {
      const rng = createRNG(12345);
      // Generate many IDs to ensure we see variety
      const ids = Array.from({ length: 100 }, () => nanoid(rng, 50));
      const combined = ids.join('');

      // Check for presence of different character types
      expect(/[A-Z]/.test(combined)).toBe(true); // Uppercase
      expect(/[a-z]/.test(combined)).toBe(true); // Lowercase
      expect(/[0-9]/.test(combined)).toBe(true); // Digits
      expect(/[_-]/.test(combined)).toBe(true); // Symbols
    });
  });
});
