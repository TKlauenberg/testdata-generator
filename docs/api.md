# Programmatic API

The canonical programmatic surface is the package root:

```typescript
import {
  generateData,
  ValidationError,
  JsonAdapter,
  CsvAdapter,
  SqlAdapter,
  type GenerateOptions,
  type JsonAdapterOptions,
  type CsvAdapterOptions,
  type SqlAdapterOptions,
  type ContextData,
  type ContextCollectionInput,
} from '@testdata-ai/core';
```

Do not rely on undocumented deep imports or unpublished subpaths such as `@testdata-ai/core/adapters`.

## `generateData(source, options)`

`generateData()` validates inline DSL source and returns an `AsyncIterable<Record<string, unknown>>`.

```typescript
import { generateData } from '@testdata-ai/core';

const source = `
  schema User {
    id: number
    email: string
    active: boolean
  }
`;

for await (const record of generateData(source, { count: 3, seed: 42 })) {
  console.log(record);
}
```

### GenerateOptions

```typescript
type GenerateOptions = {
  count: number;
  seed?: number;
  maxRelationshipDepth?: number;
  context?: Record<string, ContextCollectionInput>;
  defaultGenerators?: Record<string, string>;
};
```

Notes:

- `count` is the number of records per schema.
- `seed` preserves deterministic output across runs.
- `context` passes preloaded context collections into generation.
- There is no `format` flag on `GenerateOptions`; formatting stays in adapters.

## Validation Errors

Validation failures preserve the existing exception-based public contract.

```typescript
import { generateData, ValidationError } from '@testdata-ai/core';

try {
  await Array.fromAsync(generateData('schema User { id: whoops }', { count: 1 }));
} catch (error) {
  if (error instanceof ValidationError) {
    for (const diagnostic of error.diagnostics) {
      console.error(`${diagnostic.severity}: ${diagnostic.message}`);
    }
  } else {
    throw error;
  }
}
```

`ValidationError.diagnostics` is the stable typed diagnostics payload for programmatic consumers.

## Adapter-Based Formatting

Programmatic formatting reuses the core adapters instead of CLI code.

### JSON

```typescript
import { generateData, JsonAdapter } from '@testdata-ai/core';

const adapter = new JsonAdapter({
  outputPath: 'artifacts/users.json',
  format: 'array',
  metadata: {
    sourcePattern: 'inline-schema.td',
    count: 100,
    seed: 42,
  },
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

### CSV

```typescript
import { generateData, CsvAdapter } from '@testdata-ai/core';

const adapter = new CsvAdapter({
  outputPath: 'artifacts/users.csv',
  delimiter: ',',
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

### SQL

```typescript
import { generateData, SqlAdapter } from '@testdata-ai/core';

const adapter = new SqlAdapter({
  outputPath: 'artifacts/users.sql',
  tableName: 'public.users',
  dialect: 'postgres',
  batchSize: 100,
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

### Adapter Option Types

```typescript
type JsonAdapterOptions = {
  outputPath: string;
  format?: 'array' | 'jsonl';
  metadata?: Partial<AdapterMetadata>;
};

type CsvAdapterOptions = {
  outputPath: string;
  delimiter?: string;
};

type SqlAdapterOptions = {
  outputPath: string;
  tableName: string;
  dialect?: 'postgres' | 'mysql';
  batchSize?: number;
};
```

## Context-Aware Generation

```typescript
import {
  generateData,
  type ContextData,
  type ContextCollectionInput,
} from '@testdata-ai/core';

const users: ContextData = {
  records: [{ email: 'qa@example.com' }],
  metadata: {
    source: 'users.json',
    format: 'json',
    loadedAt: '2026-04-01T00:00:00.000Z',
    recordCount: 1,
    tags: ['qa'],
  },
};

const context: Record<string, ContextCollectionInput> = {
  users,
};

for await (const record of generateData(source, { count: 5, context, seed: 17 })) {
  console.log(record);
}
```

## Test Integration Snippets

### Bun Test

```typescript
import { describe, test, expect } from 'bun:test';
import { generateData } from '@testdata-ai/core';

describe('seeded user generation', () => {
  test('creates deterministic records for assertions', async () => {
    const source = `
      schema User {
        id: number
        email: string
      }
    `;

    const records = await Array.fromAsync(generateData(source, { count: 2, seed: 42 }));

    expect(records).toHaveLength(2);
    expect(records[0]).toHaveProperty('email');
  });
});
```

### Playwright-Style Test Setup

```typescript
import { test, expect } from '@playwright/test';
import { generateData } from '@testdata-ai/core';

test('provisions inline data for a browser flow', async ({ page }) => {
  const source = `
    schema User {
      email: string
      active: boolean
    }
  `;

  const [user] = await Array.fromAsync(generateData(source, { count: 1, seed: 9 }));

  await page.goto('/signup');
  await page.getByLabel('Email').fill(String(user.email));
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText(String(user.email))).toBeVisible();
});
```

The Playwright snippet is documentation only. The repository does not add Playwright as a runtime dependency for this story.

## See Also

- `docs/examples/generateData-examples.md` for expanded end-to-end examples.
- `packages/core/src/generateData.test.ts` for live unit coverage of the public API path.
- `packages/core/features/generateData-public-api.feature` for executed Gherkin acceptance coverage.