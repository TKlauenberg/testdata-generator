import { describe, it, expect } from 'bun:test';
import { createRNG } from '../rng';
import { date, timestamp, dateRange, time, datetime, parseDate } from './temporal';

describe('Temporal Generators', () => {
  describe('parseDate()', () => {
    it('should return Date objects unchanged', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      const result = parseDate(now);
      expect(result).toBe(now);
    });

    it('should parse string dates correctly', () => {
      const result = parseDate('2024-03-15');
      expect(result instanceof Date).toBe(true);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // 0-indexed, March = 2
      expect(result.getDate()).toBe(15);
    });

    it('should throw on invalid dates', () => {
      expect(() => parseDate('invalid-date')).toThrow();
      expect(() => parseDate('')).toThrow();
    });
  });

  describe('date()', () => {
    it('should generate date within default range (last year to now)', () => {
      const rng = createRNG(42);
      const result = date(rng);

      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      expect(result instanceof Date).toBe(true);
      expect(result.getTime()).toBeGreaterThanOrEqual(oneYearAgo.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('should respect custom start and end parameters', () => {
      const rng = createRNG(42);
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = date(rng, start, end);

      expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('should accept string date parameters', () => {
      const rng = createRNG(42);
      const result = date(rng, '2024-01-01', '2024-01-31');

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      const date1 = date(rng1);
      const date2 = date(rng2);

      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should validate start < end (throws error)', () => {
      const rng = createRNG(42);
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');

      expect(() => date(rng, start, end)).toThrow('start date must be before end date');
    });

    it('should generate different dates with different seeds', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(999);

      const date1 = date(rng1);
      const date2 = date(rng2);

      expect(date1.getTime()).not.toBe(date2.getTime());
    });
  });

  describe('timestamp()', () => {
    it('should generate Unix timestamp within default range', () => {
      const rng = createRNG(42);
      const result = timestamp(rng);

      const now = Date.now();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(oneYearAgo.getTime());
      expect(result).toBeLessThanOrEqual(now);
    });

    it('should respect custom start and end parameters', () => {
      const rng = createRNG(42);
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = timestamp(rng, start, end);

      expect(result).toBeGreaterThanOrEqual(start.getTime());
      expect(result).toBeLessThanOrEqual(end.getTime());
    });

    it('should return number (milliseconds)', () => {
      const rng = createRNG(42);
      const result = timestamp(rng);

      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      expect(timestamp(rng1)).toBe(timestamp(rng2));
    });

    it('should correspond to valid date', () => {
      const rng = createRNG(42);
      const ts = timestamp(rng);
      const dateObj = new Date(ts);

      expect(isNaN(dateObj.getTime())).toBe(false);
    });

    it('should validate start < end (throws error)', () => {
      const rng = createRNG(42);
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');

      expect(() => timestamp(rng, start, end)).toThrow('start date must be before end date');
    });
  });

  describe('dateRange()', () => {
    it('should return object with start and end properties', () => {
      const rng = createRNG(42);
      const duration = 86400000; // 1 day in milliseconds
      const result = dateRange(rng, duration);

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start instanceof Date).toBe(true);
      expect(result.end instanceof Date).toBe(true);
    });

    it('should apply duration correctly: end = start + duration', () => {
      const rng = createRNG(42);
      const duration = 3600000; // 1 hour in milliseconds
      const result = dateRange(rng, duration);

      const expectedEnd = result.start.getTime() + duration;
      expect(result.end.getTime()).toBe(expectedEnd);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      const range1 = dateRange(rng1, 86400000);
      const range2 = dateRange(rng2, 86400000);

      expect(range1.start.getTime()).toBe(range2.start.getTime());
      expect(range1.end.getTime()).toBe(range2.end.getTime());
    });

    it('should validate positive duration', () => {
      const rng = createRNG(42);

      expect(() => dateRange(rng, -1000)).toThrow('duration must be positive');
      expect(() => dateRange(rng, 0)).toThrow('duration must be positive');
    });
  });

  describe('time()', () => {
    it('should return string in HH:MM:SS format', () => {
      const rng = createRNG(42);
      const result = time(rng);

      expect(typeof result).toBe('string');
      expect(/^\d{2}:\d{2}:\d{2}$/.test(result)).toBe(true);
    });

    it('should have hours between 00-23', () => {
      const rng = createRNG(42);
      for (let i = 0; i < 100; i++) {
        const result = time(rng);
        const [hours] = result.split(':').map(Number);
        expect(hours).toBeGreaterThanOrEqual(0);
        expect(hours).toBeLessThanOrEqual(23);
      }
    });

    it('should have minutes between 00-59', () => {
      const rng = createRNG(42);
      for (let i = 0; i < 100; i++) {
        const result = time(rng);
        const [, minutes] = result.split(':').map(Number);
        expect(minutes).toBeGreaterThanOrEqual(0);
        expect(minutes).toBeLessThanOrEqual(59);
      }
    });

    it('should have seconds between 00-59', () => {
      const rng = createRNG(42);
      for (let i = 0; i < 100; i++) {
        const result = time(rng);
        const [, , seconds] = result.split(':').map(Number);
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThanOrEqual(59);
      }
    });

    it('should use zero-padding correctly', () => {
      // Generate many times to catch edge cases
      const rng = createRNG(999);
      const times = new Set<string>();
      
      for (let i = 0; i < 1000; i++) {
        times.add(time(rng));
      }

      // Should find some times with zero-padding
      const withZeroPadding = Array.from(times).some(t => 
        t.startsWith('0') || t.includes(':0')
      );
      expect(withZeroPadding).toBe(true);

      // All should match format
      Array.from(times).forEach(t => {
        expect(/^\d{2}:\d{2}:\d{2}$/.test(t)).toBe(true);
      });
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      expect(time(rng1)).toBe(time(rng2));
    });
  });

  describe('datetime()', () => {
    it('should return ISO 8601 formatted string', () => {
      const rng = createRNG(42);
      const result = datetime(rng);

      expect(typeof result).toBe('string');
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result)).toBe(true);
    });

    it('should contain date and time components', () => {
      const rng = createRNG(42);
      const result = datetime(rng);

      expect(result).toContain('T'); // Date-time separator
      expect(result).toContain('Z'); // UTC indicator
      expect(result).toContain('-'); // Date separator
      expect(result).toContain(':'); // Time separator
      expect(result).toContain('.'); // Millisecond separator
    });

    it('should respect custom date range parameters', () => {
      const rng = createRNG(42);
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = datetime(rng, start, end);

      const resultDate = new Date(result);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('should be deterministic with same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      expect(datetime(rng1)).toBe(datetime(rng2));
    });

    it('should be parseable as valid Date', () => {
      const rng = createRNG(42);
      const result = datetime(rng);
      const parsed = new Date(result);

      expect(isNaN(parsed.getTime())).toBe(false);
    });
  });
});
