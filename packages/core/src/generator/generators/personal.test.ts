import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { firstName, lastName, fullName, email, phoneNumber } from './personal';

describe('Personal Generators', () => {
  describe('firstName()', () => {
    it('should return a non-empty string', () => {
      const rng = createRNG(12345);
      const name = firstName(rng);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);
      expect(firstName(rng1)).toBe(firstName(rng2));
    });

    it('should produce different names with different seeds', () => {
      const rng1 = createRNG(11111);
      const rng2 = createRNG(22222);
      const rng3 = createRNG(33333);
      const names = [firstName(rng1), firstName(rng2), firstName(rng3)];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBeGreaterThan(1);
    });
  });

  describe('lastName()', () => {
    it('should return a non-empty string', () => {
      const rng = createRNG(12345);
      const name = lastName(rng);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(54321);
      const rng2 = createRNG(54321);
      expect(lastName(rng1)).toBe(lastName(rng2));
    });

    it('should produce different surnames with different seeds', () => {
      const rng1 = createRNG(11111);
      const rng2 = createRNG(22222);
      const rng3 = createRNG(33333);
      const names = [lastName(rng1), lastName(rng2), lastName(rng3)];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBeGreaterThan(1);
    });
  });

  describe('fullName()', () => {
    it('should return a non-empty string', () => {
      const rng = createRNG(12345);
      const name = fullName(rng);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should combine first and last names with single space', () => {
      const rng = createRNG(99999);
      const full = fullName(rng);
      const parts = full.split(' ');
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(77777);
      const rng2 = createRNG(77777);
      expect(fullName(rng1)).toBe(fullName(rng2));
    });

    it('should produce different full names with different seeds', () => {
      const rng1 = createRNG(11111);
      const rng2 = createRNG(22222);
      const rng3 = createRNG(33333);
      const names = [fullName(rng1), fullName(rng2), fullName(rng3)];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBeGreaterThan(1);
    });
  });

  describe('email()', () => {
    it('should generate email with default domain', () => {
      const rng = createRNG(12345);
      const result = email(rng);
      expect(result).toMatch(/^[a-z0-9.-]+@example\.com$/);
    });

    it('should generate email with custom domain', () => {
      const rng = createRNG(12345);
      const result = email(rng, 'testco.dev');
      expect(result).toMatch(/^[a-z0-9.-]+@testco\.dev$/);
    });

    it('should use firstname.lastname pattern', () => {
      const rng = createRNG(55555);
      const result = email(rng);
      expect(result).toMatch(/^[a-z0-9.-]+\.[a-z0-9.-]+@.+$/);
    });

    it('should normalize to lowercase', () => {
      const rng = createRNG(12345);
      const result = email(rng);
      expect(result).toBe(result.toLowerCase());
    });

    it('should handle special characters in names', () => {
      const rng = createRNG(12345);
      const result = email(rng);
      // Email should not contain uppercase or invalid characters
      expect(result).toMatch(/^[a-z0-9.-]+@[a-z0-9.-]+\.[a-z]{2,}$/);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(88888);
      const rng2 = createRNG(88888);
      expect(email(rng1)).toBe(email(rng2));
    });

    it('should be deterministic with custom domain', () => {
      const rng1 = createRNG(88888);
      const rng2 = createRNG(88888);
      expect(email(rng1, 'acme.com')).toBe(email(rng2, 'acme.com'));
    });
  });

  describe('phoneNumber()', () => {
    it('should generate phone with default US format', () => {
      const rng = createRNG(12345);
      const result = phoneNumber(rng);
      expect(result).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    });

    it('should support custom format patterns', () => {
      const rng1 = createRNG(12345);
      const result1 = phoneNumber(rng1, '###-###-####');
      expect(result1).toMatch(/^\d{3}-\d{3}-\d{4}$/);

      const rng2 = createRNG(12345);
      const result2 = phoneNumber(rng2, '+## ### ### ####');
      expect(result2).toMatch(/^\+\d{2} \d{3} \d{3} \d{4}$/);

      const rng3 = createRNG(12345);
      const result3 = phoneNumber(rng3, '### ### ####');
      expect(result3).toMatch(/^\d{3} \d{3} \d{4}$/);
    });

    it('should contain only digits 0-9 in numeric positions', () => {
      const rng = createRNG(12345);
      const result = phoneNumber(rng);
      const digits = result.replace(/[^\d]/g, '');
      expect(digits).toMatch(/^\d+$/);
      expect(digits.length).toBe(10);
    });

    it('should preserve format structure', () => {
      const rng = createRNG(12345);
      const result = phoneNumber(rng);
      expect(result.charAt(0)).toBe('(');
      expect(result.charAt(4)).toBe(')');
      expect(result.charAt(5)).toBe(' ');
      expect(result.charAt(9)).toBe('-');
    });

    it('should be deterministic with same seed and format', () => {
      const rng1 = createRNG(99999);
      const rng2 = createRNG(99999);
      expect(phoneNumber(rng1)).toBe(phoneNumber(rng2));
    });

    it('should be deterministic with custom format', () => {
      const rng1 = createRNG(99999);
      const rng2 = createRNG(99999);
      const format = '###-###-####';
      expect(phoneNumber(rng1, format)).toBe(phoneNumber(rng2, format));
    });

    it('should throw error if format has no # placeholders', () => {
      const rng = createRNG(12345);
      expect(() => phoneNumber(rng, 'INVALID')).toThrow('Phone number format must contain at least one # placeholder');
    });
  });
});
