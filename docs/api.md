# Programmatic API

The canonical programmatic surface is the package root:

```typescript
import {
  generateData,
  appendGenerationHistoryEntry,
  comparePatternVersions,
  createGenerationHistoryEntry,
  queryGenerationHistory,
  readGenerationHistory,
  createPatternVersionSnapshot,
  persistPatternVersionSnapshot,
  readPatternVersionSnapshot,
  ValidationError,
  JsonAdapter,
  CsvAdapter,
  SqlAdapter,
  type GenerateOptions,
  type DefaultSpec,
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
  defaultGenerators?: readonly DefaultSpec[];
};
```

Notes:

- `count` is the number of records per schema.
- `seed` preserves deterministic output across runs.
- `context` passes preloaded context collections into generation.
- `defaultGenerators` accepts additive configured generator defaults using the exported `DefaultSpec` shape.
- There is no `format` flag on `GenerateOptions`; formatting stays in adapters.

### Schema Extension Syntax

The DSL supports single-schema inheritance with `extends`.

```typescript
const source = `
  schema User {
    id: string generator=pick(array=["base-id"])
    email: string generator=pick(array=["base@example.com"])
  }

  schema ExtendedUser extends User {
    email: string generator=pick(array=["extended@example.com"])
    slug: string generator=pick(array=["{{id}}-qa"])
  }
`;
```

Derived schemas inherit base fields, can add new fields, and can override inherited field definitions without mutating the base schema.

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

`createGenerationMetadata()` builds the canonical generation metadata contract used across JSON, CSV, and SQL output. The shared contract includes:

- `timestamp`
- `sourcePattern`
- `count`
- `format`
- optional `seed`
- package `version`
- deterministic `patternHash`
- optional `lineage` entries for imported patterns and workspace generators

### JSON

```typescript
import { createGenerationMetadata, generateData, JsonAdapter } from '@testdata-ai/core';

const adapter = new JsonAdapter({
  outputPath: 'artifacts/users.json',
  format: 'array',
  metadata: createGenerationMetadata({
    sourcePattern: 'inline-schema.td',
    count: 100,
    format: 'json',
    seed: 42,
    lineageInputs: [
      {
        type: 'root-pattern',
        identifier: 'inline-schema.td',
        content: source,
      },
    ],
  }),
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

Array JSON output remains `{"metadata": ..., "data": [...]}`. JSONL output continues to emit the metadata record first as `{"_metadata": ...}`.

## Generation History API

The core package now exposes the append-only generation history helpers used by the CLI.

```typescript
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  createGenerationMetadata,
  queryGenerationHistory,
} from '@testdata-ai/core';

const metadata = createGenerationMetadata({
  sourcePattern: 'schemas/users.td',
  count: 25,
  format: 'json',
  seed: 42,
});

await appendGenerationHistoryEntry(
  '.td-history.jsonl',
  createGenerationHistoryEntry({
    metadata,
    status: 'success',
    durationMs: 123.45,
    recordsPerSecond: 202.51,
    outputPath: 'artifacts/users.json',
  }),
);

const latestRuns = await queryGenerationHistory('.td-history.jsonl', { last: 10 });
```

History entries reuse the canonical `GenerationMetadata` contract under `entry.metadata` and add outcome fields such as `status`, `errorMessage`, `durationMs`, `recordsPerSecond`, optional `outputPath`, and optional `savedContextName`.

## Pattern Version API

The core package also exposes immutable pattern-version helpers keyed by the canonical `patternHash`. These helpers are intended for local audit tooling such as comparing historical pattern versions without rereading the current filesystem.

```typescript
import {
  comparePatternVersions,
  createGenerationMetadata,
  createPatternVersionSnapshot,
  persistPatternVersionSnapshot,
  readPatternVersionSnapshot,
} from '@testdata-ai/core';

const lineageInputs = [
  {
    type: 'root-pattern' as const,
    identifier: 'schemas/users.td',
    content: 'schema User { id: number }',
  },
];

const metadata = createGenerationMetadata({
  sourcePattern: 'schemas/users.td',
  count: 10,
  format: 'json',
  lineageInputs,
});

const snapshot = createPatternVersionSnapshot({
  metadata,
  lineageInputs,
});

if (snapshot) {
  await persistPatternVersionSnapshot('.td-pattern-versions', snapshot);
  const stored = await readPatternVersionSnapshot('.td-pattern-versions', snapshot.patternHash);

  if (stored) {
    const diff = comparePatternVersions(stored, stored);
    console.log(diff.identical);
  }
}
```

Pattern-version snapshots preserve the lineage components that contribute to `patternHash`, including root pattern source, imported pattern source, and workspace-generator definitions. `comparePatternVersions()` returns deterministic added, removed, and modified lineage components, plus a conservative `potentiallyBreaking` classification for removed lineage or modified root and imported patterns.

### CSV

```typescript
import { createGenerationMetadata, generateData, CsvAdapter } from '@testdata-ai/core';

const adapter = new CsvAdapter({
  outputPath: 'artifacts/users.csv',
  delimiter: ',',
  metadata: createGenerationMetadata({
    sourcePattern: 'inline-schema.td',
    count: 100,
    format: 'csv',
    seed: 42,
    lineageInputs: [
      {
        type: 'root-pattern',
        identifier: 'inline-schema.td',
        content: source,
      },
    ],
  }),
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

CSV output now starts with a machine-readable metadata comment line before the header row.

### SQL

```typescript
import { createGenerationMetadata, generateData, SqlAdapter } from '@testdata-ai/core';

const adapter = new SqlAdapter({
  outputPath: 'artifacts/users.sql',
  tableName: 'public.users',
  dialect: 'postgres',
  batchSize: 100,
  metadata: createGenerationMetadata({
    sourcePattern: 'inline-schema.td',
    count: 100,
    format: 'sql',
    seed: 42,
    lineageInputs: [
      {
        type: 'root-pattern',
        identifier: 'inline-schema.td',
        content: source,
      },
    ],
  }),
});

await adapter.write(generateData(source, { count: 100, seed: 42 }));
```

SQL output now starts with a metadata comment block using leading `--` comment lines.

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
  metadata?: Partial<AdapterMetadata>;
};

type SqlAdapterOptions = {
  outputPath: string;
  tableName: string;
  dialect?: 'postgres' | 'mysql';
  batchSize?: number;
  metadata?: Partial<AdapterMetadata>;
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