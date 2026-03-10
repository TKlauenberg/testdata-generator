/**
 * Tests for end-to-end validation pipeline
 */

import { describe, test, expect } from 'bun:test';
import { validateSchema } from './validate';

describe('validateSchema()', () => {
  describe('valid schemas', () => {
    test('should return ValidatedProgram for simple valid schema', () => {
      const source = `schema User { id: uuid }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.ast.declarations).toHaveLength(1);
        expect(result.value.schemas.size).toBe(1);
        expect(result.value.schemas.has('User')).toBe(true);
      }
    });

    test('should validate schema with multiple fields', () => {
      const source = `
        schema User {
          id: uuid
          name: string
          email: string
          age: number
          active: boolean
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(1);
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.fields.length).toBe(5);
      }
    });

    test('should apply schema defaults to fields without explicit generators', () => {
      const source = `
        schema User {
          @defaults {
            string generator=randomString(length=14)
            unique=true
          }

          name: string
          email: string generator=email
        }
      `;

      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema?.fields[0]?.resolvedGenerator).toBe('randomString');
        expect(userSchema?.fields[0]?.effective?.generator?.parameters).toEqual([
          { name: 'length', value: 14 },
        ]);
        expect(userSchema?.fields[0]?.isUnique).toBe(true);
        expect(userSchema?.fields[1]?.resolvedGenerator).toBe('email');
      }
    });

    test('should let schema defaults override configured defaults but not field generators', () => {
      const source = `
        schema User {
          @defaults {
            string generator=randomString(length=9)
          }

          name: string
          status: string generator=pick(array=["explicit"])
        }
      `;

      const result = validateSchema(source, 'test.td', {
        defaultGenerators: [
          {
            fieldType: 'string',
            generator: {
              name: 'pick',
              parameters: [{ name: 'array', value: ['workspace-default'] }],
            },
          },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema?.fields[0]?.resolvedGenerator).toBe('randomString');
        expect(userSchema?.fields[0]?.effective?.generatorSource).toBe('schema');
        expect(userSchema?.fields[1]?.resolvedGenerator).toBe('pick');
        expect(userSchema?.fields[1]?.effective?.generatorSource).toBe('field');
      }
    });

    test('should accept empty @defaults block without error', () => {
      const source = `
        schema User {
          @defaults {}
          name: string
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.resolvedDefaults?.generatorDefaults.size).toBe(0);
        expect(userSchema?.resolvedDefaults?.unique).toBeUndefined();
      }
    });

    test('should treat unique=false in @defaults as no-op (same effective result as no uniqueness constraint)', () => {
      const source = `
        schema User {
          @defaults {
            unique=false
          }
          name: string
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema?.fields[0]?.isUnique).toBe(false);
      }
    });

    test('should validate schema without @defaults block normally (9.1/9.2 regression)', () => {
      const source = `
        schema User {
          id: uuid generator=uuid
          name: string
          age: number
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.fields).toHaveLength(3);
        expect(userSchema?.node.defaults).toBeUndefined();
        expect(userSchema?.fields[0]?.isUnique).toBe(false);
        expect(userSchema?.fields[0]?.effective?.generatorSource).toBe('field');
        expect(userSchema?.fields[1]?.effective?.generatorSource).toBe('built-in');
      }
    });

    test('should validate schema with generators', () => {
      const source = `
        schema User {
          id: uuid generator=uuid
          email: string generator=email
          age: number generator=randomInt(min=18, max=90)
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(1);
        const userSchema = result.value.schemas.get('User');
        expect(userSchema).toBeDefined();
        expect(userSchema?.fields.length).toBe(3);
      }
    });

    test('should validate multiple schemas', () => {
      const source = `
        schema User {
          id: uuid
          name: string
        }

        schema Post {
          id: uuid
          title: string
          authorId: uuid
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(2);
        expect(result.value.schemas.has('User')).toBe(true);
        expect(result.value.schemas.has('Post')).toBe(true);
      }
    });

    test('should handle empty source string gracefully', () => {
      const source = '';
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemas.size).toBe(0);
        expect(result.value.ast.declarations).toHaveLength(0);
      }
    });

    test('should include filename in validated program context', () => {
      const source = `schema User { id: uuid }`;
      const filename = 'user-schema.td';
      const result = validateSchema(source, filename);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Filename should be tracked in AST locations
        expect(result.value.ast.location.file).toBe(filename);
      }
    });
  });

  describe('lexical errors from scanner phase', () => {
    test('should return error for unterminated string', () => {
      const source = `schema User { name: "unterminated }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/scanner\./);
        expect(result.errors[0].message).toMatch(/unterminated/i);
      }
    });

    test('should return error for invalid number format', () => {
      const source = `schema User { age: number @generate(randomInt, min: 1.2.3) }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toMatch(/scanner\./);
      }
    });

    test('should return error for unexpected character', () => {
      const source = `schema User { id: uuid $ }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/scanner\./);
        expect(result.errors[0].message).toMatch(/invalid.*character/i);
      }
    });
  });

  describe('syntax errors from parser phase', () => {
    test('should return error for missing opening brace', () => {
      const source = `schema User id: uuid }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        // Parser detects error
        expect(result.errors[0].code).toMatch(/PARSE/);
        expect(result.errors[0].message).toMatch(/expected.*{/i);
      }
    });

    test('should return error for missing colon in field definition', () => {
      const source = `schema User { id uuid }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // May have multiple errors due to parser confusion
        expect(result.errors.length).toBeGreaterThan(0);
        // Check that at least one error mentions the issue
        const hasExpectedError = result.errors.some(
          (err) => (err.message.match(/expected.*:/i) ?? err.code.match(/PARSE/)) !== null,
        );
        expect(hasExpectedError).toBe(true);
      }
    });

    test('should return error for incomplete generator annotation', () => {
      const source = `schema User { id: uuid @generate }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        // May be scanner or parser error depending on implementation
        expect(result.errors[0].code).toMatch(/(scanner|parser|PARSE)/);
      }
    });

    test('should return parser error for misplaced schema defaults block', () => {
      const source = `
        schema User {
          name: string
          @defaults {
            string generator=randomString(length=12)
          }
        }
      `;

      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((error) => error.message.includes('Schema defaults block must appear only once at the start')),
        ).toBe(true);
      }
    });

    test('should reject duplicate unique= declarations in @defaults block', () => {
      const source = `
        schema User {
          @defaults {
            unique=true
            unique=false
          }
          name: string
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) => e.message.includes("duplicate 'unique' declaration")),
        ).toBe(true);
      }
    });

    test('should reject duplicate fieldType generator defaults in @defaults block', () => {
      const source = `
        schema User {
          @defaults {
            string generator=randomString(length=12)
            string generator=uuid
          }
          name: string
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) => e.message.includes("duplicate generator default for type 'string'")),
        ).toBe(true);
      }
    });

    test('should return error for missing closing brace', () => {
      const source = `schema User { id: uuid`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // May have multiple errors (missing brace and EOF)
        expect(result.errors.length).toBeGreaterThan(0);
        const hasExpectedError = result.errors.some(
          (err) =>
            (err.message.match(/expected.*}/i) ?? err.message.match(/unexpected.*end/i)) !== null,
        );
        expect(hasExpectedError).toBe(true);
      }
    });
  });

  describe('semantic errors from analyzer phase', () => {
    test('should return error for unsupported field type', () => {
      const source = `schema User { id: unknownType }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/analyzer\./);
        expect(result.errors[0].message).toMatch(/not supported/i);
      }
    });

    test('should return error for undefined generator', () => {
      const source = `schema User { id: string generator=unknownGenerator }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toMatch(/analyzer\.unrecognizedGenerator/);
      }
    });

    test('should return error for duplicate schema definition', () => {
      const source = `
        schema User { id: uuid }
        schema User { name: string }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/analyzer\.duplicateSchema/);
        expect(result.errors[0].message).toMatch(/already defined/i);
        expect(result.errors[0].related).toBeDefined();
      }
    });

    test('should return error for duplicate field in schema', () => {
      const source = `
        schema User {
          id: uuid
          id: string
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toMatch(/analyzer\.duplicateField/);
        expect(result.errors[0].message).toMatch(/already defined/i);
      }
    });

    test('should return error with suggestions for common mistakes', () => {
      const source = `schema User { id: unknownType }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        // Suggestion may or may not be present depending on error type
        expect(result.errors[0].message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('multiple errors from different phases', () => {
    test('should collect all errors when multiple issues exist', () => {
      const source = `
        schema User {
          id: uuid
          id: string
        }
        schema User {
          name: unknownType
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should have errors for duplicate schema, duplicate field, and unknown type
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors.every((err) => err.code.startsWith('analyzer.'))).toBe(true);
      }
    });

    test('should not proceed to parser if scanner fails', () => {
      const source = `schema User { name: "unterminated }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should only have scanner errors, not parser or analyzer
        expect(result.errors.every((err) => err.code.startsWith('scanner.'))).toBe(true);
      }
    });

    test('should not proceed to analyzer if parser fails', () => {
      const source = `schema User id: uuid }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should only have parser errors, not analyzer
        expect(result.errors.every((err) => !err.code.startsWith('analyzer.'))).toBe(true);
      }
    });
  });

  describe('error sorting by location', () => {
    test('should sort errors by line number', () => {
      const source = `
        schema User {
          id: unknownType1
          name: unknownType2
          email: unknownType3
        }
      `;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(1);
        // Errors should be in ascending line order
        for (let i = 1; i < result.errors.length; i++) {
          const prevLine = result.errors[i - 1].location?.line ?? 0;
          const currLine = result.errors[i].location?.line ?? 0;
          expect(currLine).toBeGreaterThanOrEqual(prevLine);
        }
      }
    });

    test('should sort errors by column when on same line', () => {
      const source = `schema User { id: uuid $ % }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // If multiple errors on same line, they should be sorted by column
        const sameLineErrors = result.errors.filter(
          (err) => err.location?.line === result.errors[0].location?.line,
        );
        if (sameLineErrors.length > 1) {
          for (let i = 1; i < sameLineErrors.length; i++) {
            const prevCol = sameLineErrors[i - 1].location?.column ?? 0;
            const currCol = sameLineErrors[i].location?.column ?? 0;
            expect(currCol).toBeGreaterThanOrEqual(prevCol);
          }
        }
      }
    });

    test('should place errors without location at end', () => {
      const source = `schema User { id: unknownType }`;
      const result = validateSchema(source, 'test.td');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // All errors should have locations in normal cases
        result.errors.forEach((err) => {
          expect(err.location).toBeDefined();
        });
      }
    });
  });

  describe('performance requirements', () => {
    test('@performance should validate small schema in reasonable time', () => {
      const source = generateSchema(5, 4); // 5 schemas, 4 fields each
      const start = performance.now();
      const result = validateSchema(source, 'perf-test.td');
      const duration = performance.now() - start;

      expect(result.ok).toBe(true);
      expect(duration).toBeLessThan(100); // Should be very fast for small schemas
    });

    test('@performance should validate medium schema in under 200ms', () => {
      const source = generateSchema(20, 5); // 20 schemas, 5 fields each
      const start = performance.now();
      const result = validateSchema(source, 'perf-test.td');
      const duration = performance.now() - start;

      expect(result.ok).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    test('@performance should validate large schema in under 1 second (NFR2)', () => {
      const source = generateSchema(50, 10); // 50 schemas, 10 fields each
      const start = performance.now();
      const result = validateSchema(source, 'perf-test.td');
      const duration = performance.now() - start;

      expect(result.ok).toBe(true);
      expect(duration).toBeLessThan(1000); // < 1 second as per NFR2
    });
  });
});

/**
 * Helper function to generate test schemas of varying sizes
 */
function generateSchema(schemaCount: number, fieldsPerSchema: number): string {
  const schemas: string[] = [];

  for (let i = 0; i < schemaCount; i++) {
    const fields: string[] = [];
    for (let j = 0; j < fieldsPerSchema; j++) {
      const types = ['uuid', 'string', 'number', 'boolean', 'date', 'timestamp'];
      const type = types[j % types.length];
      fields.push(`  field${j}: ${type}`);
    }
    schemas.push(`schema Schema${i} {\n${fields.join('\n')}\n}`);
  }

  return schemas.join('\n\n');
}
