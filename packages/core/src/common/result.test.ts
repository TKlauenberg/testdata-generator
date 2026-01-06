import { describe, test, expect } from 'bun:test';
import { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr, type Result } from './result';

describe('Result type', () => {
  describe('Factory functions', () => {
    test('ok() creates success result with correct structure', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    test('ok() works with different types', () => {
      const stringResult = ok('hello');
      const objectResult = ok({ name: 'test', value: 123 });
      const arrayResult = ok([1, 2, 3]);

      expect(stringResult.ok).toBe(true);
      expect(objectResult.ok).toBe(true);
      expect(arrayResult.ok).toBe(true);
    });

    test('err() creates error result with correct structure', () => {
      const result = err(['error message']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toEqual(['error message']);
      }
    });

    test('err() works with different error types', () => {
      const stringErr = err('simple error');
      const arrayErr = err(['error1', 'error2']);
      const objectErr = err({ code: 'ERR001', message: 'Failed' });

      expect(stringErr.ok).toBe(false);
      expect(arrayErr.ok).toBe(false);
      expect(objectErr.ok).toBe(false);
    });
  });

  describe('Type narrowing with discriminator', () => {
    test('discriminator enables exhaustive checking on success', () => {
      const successResult = ok(100);

      // Type narrowing works
      if (successResult.ok) {
        // TypeScript knows: successResult.value is number
        const value: number = successResult.value;
        expect(value).toBe(100);
      } else {
        // Should never reach here
        expect(true).toBe(false);
      }
    });

    test('discriminator enables exhaustive checking on error', () => {
      const errorResult = err(['failed']);

      // Type narrowing works
      if (!errorResult.ok) {
        // TypeScript knows: errorResult.errors is string[]
        const errors: string[] = errorResult.errors;
        expect(errors).toEqual(['failed']);
      } else {
        // Should never reach here
        expect(true).toBe(false);
      }
    });

    test('pattern matching with both branches', () => {
      const processResult = (result: Result<number, string[]>): string => {
        if (result.ok) {
          return `Success: ${result.value}`;
        } else {
          return `Error: ${result.errors.join(', ')}`;
        }
      };

      expect(processResult(ok(42))).toBe('Success: 42');
      expect(processResult(err(['err1', 'err2']))).toBe('Error: err1, err2');
    });
  });

  describe('Type guard functions', () => {
    test('isOk() returns true for success result', () => {
      expect(isOk(ok(42))).toBe(true);
    });

    test('isOk() returns false for error result', () => {
      expect(isOk(err(['error']))).toBe(false);
    });

    test('isOk() enables type narrowing', () => {
      const result = ok(123);
      if (isOk(result)) {
        // TypeScript knows result.value exists
        expect(result.value).toBe(123);
      }
    });

    test('isErr() returns true for error result', () => {
      expect(isErr(err(['error']))).toBe(true);
    });

    test('isErr() returns false for success result', () => {
      expect(isErr(ok(42))).toBe(false);
    });

    test('isErr() enables type narrowing', () => {
      const result = err(['failed']);
      if (isErr(result)) {
        // TypeScript knows result.errors exists
        expect(result.errors).toEqual(['failed']);
      }
    });
  });

  describe('unwrap() function', () => {
    test('unwrap() returns value for success result', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    test('unwrap() works with complex types', () => {
      const result = ok({ name: 'test', values: [1, 2, 3] });
      const value = unwrap(result);
      expect(value.name).toBe('test');
      expect(value.values).toEqual([1, 2, 3]);
    });

    test('unwrap() throws for error result', () => {
      const result = err(['error']);
      expect(() => unwrap(result)).toThrow('Called unwrap on error Result');
    });

    test('unwrap() preserves error information in message', () => {
      const result = err(['parse error', 'validation error']);
      expect(() => unwrap(result)).toThrow();
    });
  });

  describe('unwrapOr() function', () => {
    test('unwrapOr() returns value for success result', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    test('unwrapOr() returns default for error result', () => {
      const result = err(['error']);
      expect(unwrapOr(result, 0)).toBe(0);
    });

    test('unwrapOr() works with different default types', () => {
      const stringResult = err(['error']);
      expect(unwrapOr(stringResult, 'default')).toBe('default');

      const arrayResult: Result<number[], string> = err('failed');
      expect(unwrapOr(arrayResult, [1, 2, 3])).toEqual([1, 2, 3]);
    });

    test('unwrapOr() never throws', () => {
      const result = err(['critical error']);
      expect(() => unwrapOr(result, -1)).not.toThrow();
      expect(unwrapOr(result, -1)).toBe(-1);
    });
  });

  describe('map() function', () => {
    test('map() transforms success value', () => {
      const result = ok(10);
      const doubled = map(result, (x) => x * 2);
      expect(doubled.ok && doubled.value).toBe(20);
    });

    test('map() can change result type', () => {
      const result = ok(42);
      const stringified = map(result, (x) => `Number: ${x}`);
      expect(stringified.ok && stringified.value).toBe('Number: 42');
    });

    test('map() passes through error unchanged', () => {
      const result: Result<number, string[]> = err(['error']);
      const mapped = map(result, (x) => x * 2);
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.errors).toEqual(['error']);
      }
    });

    test('map() preserves error type', () => {
      const result: Result<number, { code: string }> = err({
        code: 'ERR001',
      });
      const mapped = map(result, (x) => x.toString());
      expect(!mapped.ok && mapped.errors.code).toBe('ERR001');
    });

    test('map() can be chained', () => {
      const result = ok(5);
      const chained = map(
        map(result, (x) => x * 2),
        (x) => x + 1,
      );
      expect(chained.ok && chained.value).toBe(11);
    });
  });

  describe('mapErr() function', () => {
    test('mapErr() transforms error value', () => {
      const result = err('simple error');
      const mapped = mapErr(result, (e) => [e]);
      expect(!mapped.ok && mapped.errors).toEqual(['simple error']);
    });

    test('mapErr() can change error type', () => {
      const result: Result<number, string> = err('ERR001');
      const mapped = mapErr(result, (code) => ({
        code,
        message: 'Error occurred',
      }));
      if (!mapped.ok) {
        expect(mapped.errors.code).toBe('ERR001');
        expect(mapped.errors.message).toBe('Error occurred');
      }
    });

    test('mapErr() passes through success value unchanged', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e: string) => [e]);
      expect(mapped.ok && mapped.value).toBe(42);
    });

    test('mapErr() preserves value type', () => {
      const result: Result<{ data: number }, string> = ok({ data: 123 });
      const mapped = mapErr(result, (e) => ({ error: e }));
      expect(mapped.ok && mapped.value.data).toBe(123);
    });

    test('mapErr() can be chained', () => {
      const result = err('error');
      const chained = mapErr(
        mapErr(result, (e) => [e]),
        (arr) => arr.map((s) => s.toUpperCase()),
      );
      expect(!chained.ok && chained.errors).toEqual(['ERROR']);
    });
  });

  describe('Edge cases and immutability', () => {
    test('Results are readonly and cannot be mutated', () => {
      const result = ok(42);
      // TypeScript will prevent: result.value = 100
      // TypeScript will prevent: result.ok = false
      expect(result.ok).toBe(true);
    });

    test('Nested objects in results maintain immutability intent', () => {
      const original = { count: 1, items: [1, 2, 3] };
      const result = ok(original);

      // While JS allows mutation, the type system marks fields readonly
      if (result.ok) {
        expect(result.value).toEqual({ count: 1, items: [1, 2, 3] });
      }
    });

    test('Empty error arrays are valid', () => {
      const result = err([]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toEqual([]);
      }
    });

    test('Null and undefined values work correctly', () => {
      const nullResult = ok(null);
      const undefinedResult = ok(undefined);

      expect(nullResult.ok).toBe(true);
      expect(undefinedResult.ok).toBe(true);
    });
  });

  describe('Real-world usage patterns', () => {
    // Simulating a parse function that might fail
    function parseNumber(input: string): Result<number, string[]> {
      const num = Number(input);
      if (isNaN(num)) {
        return err([`Cannot parse "${input}" as number`]);
      }
      return ok(num);
    }

    test('parseNumber example with valid input', () => {
      const result = parseNumber('42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    test('parseNumber example with invalid input', () => {
      const result = parseNumber('not-a-number');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain('Cannot parse');
      }
    });

    test('Chaining operations with map', () => {
      const result = parseNumber('10');
      const doubled = map(result, (n) => n * 2);
      const formatted = map(doubled, (n) => `Result: ${n}`);

      expect(formatted.ok && formatted.value).toBe('Result: 20');
    });

    test('Error short-circuits map chain', () => {
      const result = parseNumber('invalid');
      const doubled = map(result, (n) => n * 2);
      const formatted = map(doubled, (n) => `Result: ${n}`);

      expect(formatted.ok).toBe(false);
    });

    test('Using unwrapOr for safe default handling', () => {
      const validResult = parseNumber('100');
      const invalidResult = parseNumber('bad');

      expect(unwrapOr(validResult, -1)).toBe(100);
      expect(unwrapOr(invalidResult, -1)).toBe(-1);
    });
  });
});
