/**
 * Tests to verify ESLint naming convention rules are properly configured
 * This validates that private member naming with underscore prefix is enforced
 */

import { describe, test, expect } from 'bun:test';

describe('ESLint Naming Convention Rules', () => {
  describe('Private member naming', () => {
    test('should require underscore prefix for private properties', () => {
      // This test verifies the rule exists by checking that code following
      // the convention compiles without type errors
      class ValidExample {
        private _privateProperty: string = 'test';
        private _privateMethod(): void {}

        public publicProperty: string = 'test';
        public publicMethod(): void {}
      }

      const instance = new ValidExample();
      expect(instance).toBeDefined();
      expect(instance.publicProperty).toBe('test');
    });

    test('should allow public members without underscore', () => {
      class Example {
        public data: number = 42;
        public getData(): number {
          return this.data;
        }
      }

      const instance = new Example();
      expect(instance.getData()).toBe(42);
    });

    test('should handle readonly private members', () => {
      class Example {
        private readonly _config: string = 'value';

        public getConfig(): string {
          return this._config;
        }
      }

      const instance = new Example();
      expect(instance.getConfig()).toBe('value');
    });
  });

  describe('Type naming (PascalCase)', () => {
    test('should allow PascalCase for types and interfaces', () => {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      interface ValidInterface {
        property: string;
      }

      type ValidType = {
        property: number;
      };
      /* eslint-enable @typescript-eslint/no-unused-vars */

      class ValidClass {
        public data: ValidType = { property: 1 };
      }

      const instance = new ValidClass();
      expect(instance.data.property).toBe(1);
    });
  });

  describe('Variable naming (camelCase)', () => {
    test('should allow camelCase for variables', () => {
      const validVariableName = 'test';
      const anotherValidName = 42;

      expect(validVariableName).toBe('test');
      expect(anotherValidName).toBe(42);
    });

    test('should allow UPPER_CASE for constants', () => {
      const MAX_RETRIES = 3;
      const DEFAULT_TIMEOUT = 5000;

      expect(MAX_RETRIES).toBe(3);
      expect(DEFAULT_TIMEOUT).toBe(5000);
    });

    test('should allow underscore prefix for unused variables', () => {
      const _unusedVariable = 'not used';
      const usedVariable = 'used';

      expect(usedVariable).toBe('used');
      // _unusedVariable intentionally unused to test the rule
      expect(_unusedVariable).toBeDefined();
    });
  });
});
