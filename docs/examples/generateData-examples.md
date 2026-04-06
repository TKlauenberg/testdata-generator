# generateData() API Examples

Complete usage examples for the `generateData()` public API function.

For the canonical reference, see [Programmatic API](../api.md).

## Table of Contents

- [Basic Usage](#basic-usage)
- [Deterministic Generation (Seeded)](#deterministic-generation-seeded)
- [Error Handling](#error-handling)
- [Streaming Large Datasets](#streaming-large-datasets)
- [Using with JSON Adapter](#using-with-json-adapter)
- [Multi-Schema Generation](#multi-schema-generation)
- [Performance Tips](#performance-tips)

---

## Basic Usage

Generate a small dataset from a simple DSL schema:

```typescript
import { generateData } from '@testdata-generator/core';

const schema = `
  schema User {
    id: number
    name: string
    email: string
    active: boolean
  }
`;

// Generate 10 user records
for await (const record of generateData(schema, { count: 10 })) {
  console.log(record);
  // { id: 0.703..., name: "abc...", email: "xyz...", active: true }
}
```

**Key Points:**
- Use `for await...of` to consume the AsyncIterable
- Records are generated lazily (one at a time)
- Memory usage remains constant regardless of count

---

## Deterministic Generation (Seeded)

Generate the same data across multiple runs using a seed:

```typescript
import { generateData } from '@testdata-generator/core';

const schema = `
  schema User {
    id: number
    name: string
  }
`;

const seed = 42;

// First run
const run1 = [];
for await (const record of generateData(schema, { count: 5, seed })) {
  run1.push(record);
}

// Second run with same seed
const run2 = [];
for await (const record of generateData(schema, { count: 5, seed })) {
  run2.push(record);
}

console.log(run1);  // [ {...}, {...}, ... ]
console.log(run2);  // Identical to run1!
console.assert(JSON.stringify(run1) === JSON.stringify(run2));
```

**Use Cases:**
- Reproducible test data for CI/CD
- Debugging with consistent data
- Sharing test datasets with team members

---

## Error Handling

Handle validation errors gracefully:

```typescript
import { generateData, ValidationError } from '@testdata-generator/core';

const invalidSchema = `
  schema User {
    id: unknownType
    name: string
  }
`;

try {
  for await (const record of generateData(invalidSchema, { count: 10 })) {
    console.log(record);
  }
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Schema validation failed:');
    console.error(`  ${error.message}`);

    // Access detailed diagnostics
    error.diagnostics.forEach(diagnostic => {
      console.error(
        `  ${diagnostic.severity}: ${diagnostic.message} ` +
        `at ${diagnostic.location?.line}:${diagnostic.location?.column}`
      );
    });
  } else {
    throw error;  // Unexpected error
  }
}
```

**Error Types:**
- **Syntax errors**: Malformed DSL syntax (missing colons, brackets, etc.)
- **Semantic errors**: Unknown types, invalid parameters, undefined references

**Validation is Fast:**
- Errors are thrown immediately BEFORE generation starts
- No wasted CPU time generating invalid data

---

## Streaming Large Datasets

Generate 100k+ records without running out of memory:

```typescript
import { generateData } from '@testdata-generator/core';
import { writeFile } from 'fs/promises';

const schema = `
  schema Transaction {
    id: number
    amount: number
    timestamp: string
  }
`;

let count = 0;
const startTime = Date.now();

// Generate 100k records - streaming keeps memory constant
for await (const record of generateData(schema, { count: 100000, seed: 999 })) {
  // Process each record individually
  // DO NOT accumulate in array - defeats streaming purpose!
  count++;

  if (count % 10000 === 0) {
    console.log(`Generated ${count} records...`);
  }
}

const duration = (Date.now() - startTime) / 1000;
console.log(`✓ Generated ${count} records in ${duration.toFixed(2)}s`);
console.log(`  Rate: ${(count / duration).toFixed(0)} records/sec`);
```

**Performance:**
- 10k records/sec typical on modern hardware
- Memory usage: ~constant (5-10 MB)
- 1000 records: < 1 minute (NFR1 requirement ✓)

---

## Using with JSON Adapter

Generate data and write to JSON file in one pipeline:

```typescript
import { generateData, JsonAdapter } from '@testdata-generator/core';

const schema = `
  schema User {
    id: number
    name: string
    email: string
    active: boolean
  }
`;

// Create adapter with output configuration
const adapter = new JsonAdapter({
  outputPath: 'users.json',
  format: 'array',  // or 'jsonl' for line-delimited
  metadata: {
    sourcePattern: 'User.td',
    count: 1000,
    seed: 42
  }
});

// Generate and write in streaming fashion
await adapter.write(
  generateData(schema, { count: 1000, seed: 42 })
);

console.log('✓ Generated 1000 users to users.json');
```

---

## Using with CSV Adapter

Generate data and write it to CSV using the published package-root surface:

```typescript
import { generateData, CsvAdapter } from '@testdata-generator/core';

const adapter = new CsvAdapter({
  outputPath: 'users.csv',
  delimiter: ',',
});

await adapter.write(generateData(schema, { count: 1000, seed: 42 }));
```

---

## Using with SQL Adapter

Generate data and emit batched SQL `INSERT` statements:

```typescript
import { generateData, SqlAdapter } from '@testdata-generator/core';

const adapter = new SqlAdapter({
  outputPath: 'users.sql',
  tableName: 'public.users',
  dialect: 'postgres',
  batchSize: 250,
});

await adapter.write(generateData(schema, { count: 1000, seed: 42 }));
```

**Output Format (array):**
```json
{
  "metadata": {
    "timestamp": "2026-02-07T12:34:56.789Z",
    "sourcePattern": "User.td",
    "count": 1000,
    "seed": 42,
    "version": "0.1.0"
  },
  "data": [
    { "id": 0.703..., "name": "abc...", "email": "xyz...", "active": true },
    ...
  ]
}
```

**Output Format (jsonl):**
```jsonl
{"_metadata":{"timestamp":"...","sourcePattern":"User.td","count":1000,"seed":42}}
{"id":0.703...,"name":"abc...","email":"xyz...","active":true}
{"id":0.456...,"name":"def...","email":"uvw...","active":false}
...
```

---

## Multi-Schema Generation

Generate data for multiple schemas in one source:

```typescript
import { generateData } from '@testdata-generator/core';

const schema = `
  schema User {
    id: number
    name: string
  }

  schema Product {
    sku: string
    price: number
  }

  schema Order {
    orderId: number
    total: number
  }
`;

// Generates records for ALL schemas
// Output: count records PER schema
const allRecords = [];
for await (const record of generateData(schema, { count: 5, seed: 12345 })) {
  allRecords.push(record);
}

console.log(allRecords.length);  // 15 records total (5 per schema)

// Separate by schema using field presence
const users = allRecords.filter(r => 'name' in r);
const products = allRecords.filter(r => 'sku' in r);
const orders = allRecords.filter(r => 'orderId' in r);

console.log(`Users: ${users.length}`);      // 5
console.log(`Products: ${products.length}`);  // 5
console.log(`Orders: ${orders.length}`);    // 5
```

**Note:** Records are yielded in schema-definition order:
1. All User records (count: 5)
2. All Product records (count: 5)
3. All Order records (count: 5)

---

## Performance Tips

### 1. Use Streaming - Don't Buffer

**❌ DON'T DO THIS:**
```typescript
// Buffers all records in memory - defeats streaming!
const records = [];
for await (const record of generateData(schema, { count: 100000 })) {
  records.push(record);
}
// Now you have 100k records in memory
return records;
```

**✅ DO THIS:**
```typescript
// Process each record as it's generated
for await (const record of generateData(schema, { count: 100000 })) {
  await processRecord(record);  // e.g., insert to DB, write to file
  // Record is garbage collected after processing
}
```

### 2. Use Seeds for Consistency

```TypeScript
// Development/testing: Use fixed seed
const devData = generateData(schema, { count: 100, seed: 42 });

// Production: Use different seed per run
const prodData = generateData(schema, { count: 10000, seed: Date.now() });
```

### 3. Validate Schema Once, Generate Many Times

**❌ SLOW:**
```typescript
// Validates schema 10 times!
for (let i = 0; i < 10; i++) {
  for await (const record of generateData(schema, { count: 1000 })) {
    // process...
  }
}
```

**✅ FAST:**
```typescript
// Validate once, generate once (larger count)
for await (const record of generateData(schema, { count: 10000 })) {
  // process...
}
```

### 4. Memory Profiling

```typescript
// Track memory usage for large generations
const before = process.memoryUsage().heapUsed / 1024 / 1024;

let count = 0;
for await (const record of generateData(schema, { count: 100000 })) {
  count++;
}

const after = process.memoryUsage().heapUsed / 1024 / 1024;
const growth = after - before;

console.log(`Memory growth: ${growth.toFixed(2)} MB`);
console.log(`Per-record: ${(growth / count * 1000).toFixed(2)} KB`);
// Expected: < 1 KB per record (streaming efficiency)
```

---

## API Reference

### `generateData(source, options)`

Generate test data from DSL schema source code.

**Parameters:**
- `source: string` - DSL schema source code
- `options: GenerateOptions`
  - `count: number` - Number of records to generate per schema
  - `seed?: number` - Optional seed for deterministic generation

**Returns:**
- `AsyncIterable<Record<string, unknown>>` - Async iterator yielding records

**Throws:**
- `ValidationError` - If schema validation fails (syntax or semantic errors)

**Example:**
```typescript
const data = generateData(source, { count: 100, seed: 42 });
for await (const record of data) {
  // Process each record
}
```

---

## Support

- **Docs**: [Project README](../../README.md)
- **API Reference**: [Programmatic API](../api.md)
- **Examples**: This file
- **Issues**: [GitHub Issues](https://github.com/testdata-generator/testdata-generator/issues)

---

## Version

Examples for `@testdata-generator/core` v0.1.0
