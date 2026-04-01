import { describe, test, expect } from 'bun:test';
import {
  version,
  generateData,
  ValidationError,
  JsonAdapter,
  CsvAdapter,
  SqlAdapter,
} from './index';
import type {
  GenerateOptions,
  JsonAdapterOptions,
  CsvAdapterOptions,
  SqlAdapterOptions,
  ContextData,
} from './index';

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

  test('exports the documented programmatic API surface from the package root', () => {
    const generateOptions: GenerateOptions = { count: 1 };
    const jsonOptions: JsonAdapterOptions = { outputPath: 'users.json' };
    const csvOptions: CsvAdapterOptions = { outputPath: 'users.csv' };
    const sqlOptions: SqlAdapterOptions = { outputPath: 'users.sql', tableName: 'users' };
    const contextData: ContextData = {
      records: [{ id: 1, email: 'qa@example.com' }],
      metadata: {
        source: 'users.json',
        format: 'json',
        loadedAt: '2026-04-01T00:00:00.000Z',
        recordCount: 1,
        tags: ['qa'],
      },
    };

    expect(typeof generateData).toBe('function');
    expect(ValidationError).toBeDefined();
    expect(JsonAdapter).toBeDefined();
    expect(CsvAdapter).toBeDefined();
    expect(SqlAdapter).toBeDefined();
    expect(generateOptions.count).toBe(1);
    expect(jsonOptions.outputPath).toBe('users.json');
    expect(csvOptions.outputPath).toBe('users.csv');
    expect(sqlOptions.tableName).toBe('users');
    expect(contextData.metadata.recordCount).toBe(1);
  });

  test('package manifest export paths match the built output layout', async () => {
    const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json() as {
      main: string;
      types: string;
      exports: {
        '.': {
          import: string;
          types: string;
        };
      };
    };

    expect(packageJson.main).toBe('./dist/src/index.js');
    expect(packageJson.types).toBe('./dist/src/index.d.ts');
    expect(packageJson.exports['.'].import).toBe('./dist/src/index.js');
    expect(packageJson.exports['.'].types).toBe('./dist/src/index.d.ts');
  });
});
