# Story 3.3: Generator Engine - Record Creation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **an engine that generates complete records from validated schemas**,
So that **all fields are populated according to their generator definitions**.

## Acceptance Criteria

**Given** I have a validated schema with field definitions
**When** I implement the generator engine in `packages/core/src/generator/generator.ts`
**Then** a `generateRecord(schema: ValidatedSchema, rng: RNG): Record` function exists
**And** the function iterates through all fields in the schema
**And** for each field, the appropriate generator is invoked based on field type
**And** generator parameters from the schema are passed to the generator function
**And** generated values are assigned to the corresponding field in the output record
**And** the record is a plain JavaScript object with field names as keys
**And** all fields in the schema are present in the generated record
**And** the function handles generator errors gracefully with clear messages
**And** the module exports through `packages/core/src/generator/index.ts`
**And** unit tests verify record structure matches schema
**And** Gherkin tests verify field values are generated correctly

## Tasks / Subtasks

- [ ] Implement core generateRecord function (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] Create `packages/core/src/generator/generator.ts` file
  - [ ] Define `Record` type as `Record<string, unknown>` or custom type
  - [ ] Implement `generateRecord(schema: ValidatedSchema, rng: RNG): Record` function
  - [ ] Import ValidatedSchema type from `../analyzer/types`
  - [ ] Import RNG type and primitive generators from existing modules
  - [ ] Iterate through schema.fields array
  - [ ] For each field, lookup generator from GENERATOR_REGISTRY by field type
  - [ ] Extract generator parameters from field (min, max, length, etc.)
  - [ ] Invoke generator with (rng, ...params) to produce field value
  - [ ] Assign generated value to output record using field name as key
  - [ ] Return complete record object

- [ ] Implement error handling (AC: 8)
  - [ ] Wrap generator invocation in try-catch
  - [ ] Handle unknown generator names gracefully
  - [ ] Handle invalid generator parameters
  - [ ] Provide clear error messages with field name and generator context
  - [ ] Consider using Result type pattern if appropriate

- [ ] Export through module indices (AC: 9)
  - [ ] Export `generateRecord` from `packages/core/src/generator/generator.ts`
  - [ ] Update `packages/core/src/generator/index.ts` to re-export
  - [ ] Export Record type if custom type definition used

- [ ] Write comprehensive unit tests (AC: 10)
  - [ ] Create `packages/core/src/generator/generator.test.ts`
  - [ ] Test: Simple schema with single field generates correct record
  - [ ] Test: Multi-field schema generates record with all fields
  - [ ] Test: Record structure matches schema field names
  - [ ] Test: Generated values match expected types (int, float, string, bool)
  - [ ] Test: Same seed produces identical records (determinism)
  - [ ] Test: Different seeds produce different records
  - [ ] Test: Generator parameters (min, max, length) are respected
  - [ ] Test: Unknown generator type throws clear error
  - [ ] Test: Invalid generator parameters throw clear errors
  - [ ] Test: Empty schema produces empty record

- [ ] Write Gherkin BDD tests (AC: 11)
  - [ ] Create or extend `packages/core/features/data-generation.feature`
  - [ ] Scenario: Generate single record from simple schema
  - [ ] Scenario: Generate record with all primitive field types
  - [ ] Scenario: Deterministic generation with same seed
  - [ ] Scenario: Field values respect generator parameters
  - [ ] Scenario: Error handling for invalid generators
  - [ ] Implement step definitions using Screenplay pattern
  - [ ] Create appropriate Abilities/Tasks/Questions components

## Dev Notes

### 🎯 Ultimate Context - Critical Success Factors

**This Story Continues Epic 3: Basic Data Generation**

Story 3.3 is the **heart of the generation system** - it connects validated schemas with primitive generators to produce actual test data records. This is where everything comes together.

**Critical Mission:**
- Implement the record generation engine that powers all data output
- Connect ValidatedSchema (from Epic 2) with primitive generators (from Story 3.2)
- Handle field-to-generator mapping dynamically using the registry
- Extract and pass generator parameters correctly from schema definitions
- Ensure perfect determinism by using RNG consistently
- Build the foundation for streaming generation (Story 3.4)

**🚨 Common LLM Mistakes to Prevent:**
- ❌ Creating new RNG instances per field (breaks determinism)
- ❌ Not handling missing/unknown generators gracefully
- ❌ Hardcoding generator names instead of using registry
- ❌ Ignoring generator parameters from schema
- ❌ Not validating record completeness (all fields present)
- ❌ Using Math.random() or any non-deterministic sources
- ❌ Not preserving field order from schema
- ❌ Returning undefined/null fields instead of erroring

### Previous Story Intelligence

**From Story 3.2 (Primitive Field Generators) - COMPLETED:**

✅ **Primitive Generators Available:**
```typescript
// All generators follow (rng: RNG, ...params) => T pattern
import {
  randomInt,       // (rng, min, max) => number
  randomFloat,     // (rng, min, max) => number
  randomString,    // (rng, length, charset?) => string
  randomBoolean,   // (rng) => boolean
  GENERATOR_REGISTRY  // Map<string, GeneratorFunction>
} from './generators';
```

✅ **Generator Registry Available:**
```typescript
// Maps generator names to functions
const GENERATOR_REGISTRY: Map<string, GeneratorFunction> = new Map([
  ['int', randomInt],
  ['integer', randomInt],
  ['float', randomFloat],
  ['double', randomFloat],
  ['number', randomFloat],
  ['string', randomString],
  ['text', randomString],
  ['bool', randomBoolean],
  ['boolean', randomBoolean],
]);

// Usage pattern:
const generator = GENERATOR_REGISTRY.get(fieldType);
if (!generator) {
  throw new Error(`Unknown generator: ${fieldType}`);
}
const value = generator(rng, ...params);
```

✅ **Determinism Pattern Established:**
- Pass same RNG instance to all generators
- Same seed + same schema = identical output always
- RNG state advances with each call automatically

**From Story 3.1 (Custom PRNG) - COMPLETED:**

✅ **RNG Interface:**
```typescript
interface RNG {
  nextInt(): number;
  nextFloat(): number;
  nextIntRange(min: number, max: number): number;
  nextFloatRange(min: number, max: number): number;
}

// Create with seed
const rng = createRNG(12345);
```

**From Story 2.5 (Semantic Analyzer - Type Checking) - COMPLETED:**

✅ **ValidatedSchema Structure:**
```typescript
interface ValidatedSchema {
  readonly node: SchemaNode;           // Original AST
  readonly fields: ValidatedField[];   // Enriched field info
  readonly dependencies: ReadonlySet<string>;
  readonly sortOrder: number;
}

interface ValidatedField {
  readonly node: FieldNode;            // Original field AST
  readonly resolvedType: string;       // "int", "float", "string", "bool"
  readonly resolvedGenerator: string | undefined;
  readonly templateReferences: readonly string[];
}

// Field node structure (from parser AST):
interface FieldNode {
  kind: 'field';
  name: string;                        // Field name for record key
  type: TypeNode;                      // Contains generator name
  parameters?: ParameterNode[];        // Generator params (min, max, etc.)
  location: SourceLocation;
}
```

✅ **How to Access Field Information:**
```typescript
// Get field name for record key
const fieldName = validatedField.node.name;

// Get generator type
const generatorType = validatedField.resolvedType;

// Get generator parameters (if any)
const params = validatedField.node.parameters;
// params is array of { name: string, value: LiteralNode }
```

**From Epic 2 Retrospective - Key Patterns:**

✅ **Pure Functions Pattern:**
- generateRecord should be pure function
- No side effects or state mutation
- Deterministic output based on inputs
- Easy to test and reason about

✅ **Error Handling:**
- Use clear, descriptive error messages
- Include context (field name, generator type)
- Consider using Result type for fallible operations
- Don't silently ignore errors

### Architecture Compliance Requirements

**From Core Architectural Decisions - Generator Architecture:**

**Decision:** Generator Engine Uses Pure Function Pattern

**Critical Implementation Requirements:**

1. **Function Signature:**
```typescript
/**
 * Generate a single record from validated schema
 *
 * CRITICAL: Pure function - same inputs = same output
 * CRITICAL: Use provided RNG instance - do NOT create new RNG
 *
 * @param schema - Validated schema with field definitions
 * @param rng - RNG instance for deterministic generation
 * @returns Plain JavaScript object with all fields populated
 */
export function generateRecord(
  schema: ValidatedSchema,
  rng: RNG
): Record<string, unknown> {
  // Implementation
}
```

2. **Record Type Definition:**
```typescript
/**
 * Generated record is a plain JavaScript object
 * Keys are field names, values are generated data
 *
 * Option A: Use built-in Record utility type
 * type GeneratedRecord = Record<string, unknown>;
 *
 * Option B: Define custom type for clarity
 * export type GeneratedRecord = { [fieldName: string]: unknown };
 *
 * Either approach is acceptable
 */
```

3. **Field Iteration Pattern:**
```typescript
/**
 * CRITICAL: Iterate through fields in schema order
 * This ensures consistent field ordering in output
 */
function generateRecord(schema: ValidatedSchema, rng: RNG): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  // Process each field in order
  for (const field of schema.fields) {
    const fieldName = field.node.name;
    const generatorType = field.resolvedType;

    // Generate value for this field
    const value = generateFieldValue(field, rng);

    // Assign to record
    record[fieldName] = value;
  }

  return record;
}
```

4. **Generator Lookup Pattern:**
```typescript
/**
 * Use registry for dynamic generator lookup
 * This allows schema-driven generation without hardcoding
 */
function generateFieldValue(field: ValidatedField, rng: RNG): unknown {
  const generatorType = field.resolvedType;

  // Lookup generator by type
  const generator = GENERATOR_REGISTRY.get(generatorType);

  if (!generator) {
    throw new Error(
      `Unknown generator type '${generatorType}' for field '${field.node.name}'`
    );
  }

  // Extract parameters and invoke
  const params = extractParameters(field);
  return generator(rng, ...params);
}
```

5. **Parameter Extraction Pattern:**
```typescript
/**
 * Extract generator parameters from field definition
 *
 * Example DSL:
 *   age: int(min=18, max=65)
 *
 * Parameters:
 *   [{ name: "min", value: 18 }, { name: "max", value: 65 }]
 *
 * Need to convert to positional args for generator:
 *   randomInt(rng, 18, 65)
 */
function extractParameters(field: ValidatedField): unknown[] {
  const params = field.node.parameters || [];

  // Different generators expect different parameter patterns
  switch (field.resolvedType) {
    case 'int':
    case 'integer': {
      // randomInt(rng, min, max)
      const min = findParam(params, 'min')?.value ?? 0;
      const max = findParam(params, 'max')?.value ?? 100;
      return [min, max];
    }

    case 'float':
    case 'double':
    case 'number': {
      // randomFloat(rng, min, max)
      const min = findParam(params, 'min')?.value ?? 0.0;
      const max = findParam(params, 'max')?.value ?? 1.0;
      return [min, max];
    }

    case 'string':
    case 'text': {
      // randomString(rng, length, charset?)
      const length = findParam(params, 'length')?.value ?? 10;
      const charset = findParam(params, 'charset')?.value;
      return charset ? [length, charset] : [length];
    }

    case 'bool':
    case 'boolean': {
      // randomBoolean(rng) - no parameters
      return [];
    }

    default:
      throw new Error(`Unsupported generator type: ${field.resolvedType}`);
  }
}

function findParam(
  params: ParameterNode[],
  name: string
): ParameterNode | undefined {
  return params.find(p => p.name === name);
}
```

6. **Error Handling Pattern:**
```typescript
/**
 * Provide clear, actionable error messages
 * Include field context to help debugging
 */
try {
  const value = generator(rng, ...params);
  record[fieldName] = value;
} catch (error) {
  throw new Error(
    `Failed to generate value for field '${fieldName}' ` +
    `using generator '${generatorType}': ${error.message}`
  );
}
```

**From Implementation Patterns & Consistency Rules:**

**File Structure:**
```
packages/core/src/generator/
├── index.ts                   # UPDATE: Add generateRecord export
├── rng.ts                     # ✅ COMPLETED Story 3.1
├── rng.test.ts                # ✅ COMPLETED Story 3.1
├── generator.ts               # ⬅️ CREATE: Record generation engine
├── generator.test.ts          # ⬅️ CREATE: Co-located unit tests
└── generators/                # ✅ COMPLETED Story 3.2
    ├── index.ts
    ├── primitives.ts
    └── primitives.test.ts
```

**Module Export Updates:**
```typescript
// packages/core/src/generator/index.ts (UPDATE)
export { createRNG, type RNG } from './rng';
export {
  randomInt,
  randomFloat,
  randomString,
  randomBoolean,
  CHARSET_ALPHA,
  CHARSET_NUMERIC,
  CHARSET_ALPHANUMERIC,
  GENERATOR_REGISTRY,
  type GeneratorFunction
} from './generators';

// ⬅️ ADD NEW EXPORTS
export { generateRecord } from './generator';
export type { GeneratedRecord } from './generator';  // If custom type defined
```

**Naming Conventions:**
- File: `generator.ts` (singular, camelCase)
- Function: `generateRecord` (camelCase, verb + noun)
- Types: `GeneratedRecord` (PascalCase if custom type)
- Test file: `generator.test.ts` (matches source file)

### Integration Points

**Consumes From:**
- **Story 2.4/2.5**: ValidatedSchema, ValidatedField types from `../analyzer/types`
- **Story 3.1**: RNG interface and createRNG from `./rng`
- **Story 3.2**: GENERATOR_REGISTRY and primitive generators from `./generators`
- **Parser**: FieldNode, ParameterNode types from `../parser/ast`

**Used By:**
- **Story 3.4**: Streaming generator will call generateRecord in a loop
- **Story 3.6**: End-to-end API will expose generateRecord
- **Future stories**: All higher-level generation features build on this

**Import Dependencies:**
```typescript
// generator.ts imports
import type { RNG } from './rng';
import type { ValidatedSchema, ValidatedField } from '../analyzer/types';
import type { ParameterNode } from '../parser/ast';
import { GENERATOR_REGISTRY } from './generators';
```

### Testing Standards Summary

**Unit Test Requirements (Bun Test):**

```typescript
// packages/core/src/generator/generator.test.ts

import { describe, it, expect } from 'bun:test';
import { createRNG } from './rng';
import { generateRecord } from './generator';
import type { ValidatedSchema, ValidatedField } from '../analyzer/types';

describe('generateRecord', () => {
  it('should generate record with all fields from schema', () => {
    // Create mock ValidatedSchema with 3 fields
    const schema: ValidatedSchema = createMockSchema([
      { name: 'id', type: 'int', params: [{ name: 'min', value: 1 }, { name: 'max', value: 100 }] },
      { name: 'name', type: 'string', params: [{ name: 'length', value: 10 }] },
      { name: 'active', type: 'boolean', params: [] }
    ]);

    const rng = createRNG(12345);
    const record = generateRecord(schema, rng);

    // Verify structure
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('name');
    expect(record).toHaveProperty('active');

    // Verify types
    expect(typeof record.id).toBe('number');
    expect(typeof record.name).toBe('string');
    expect(typeof record.active).toBe('boolean');
  });

  it('should produce identical records with same seed', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'value', type: 'int', params: [{ name: 'min', value: 0 }, { name: 'max', value: 10 }] }
    ]);

    const rng1 = createRNG(99999);
    const rng2 = createRNG(99999);

    const record1 = generateRecord(schema, rng1);
    const record2 = generateRecord(schema, rng2);

    expect(record1).toEqual(record2);
  });

  it('should respect generator parameters from schema', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'age', type: 'int', params: [{ name: 'min', value: 18 }, { name: 'max', value: 65 }] }
    ]);

    const rng = createRNG(777);
    const record = generateRecord(schema, rng);

    expect(record.age).toBeGreaterThanOrEqual(18);
    expect(record.age).toBeLessThanOrEqual(65);
  });

  it('should throw clear error for unknown generator type', () => {
    const schema: ValidatedSchema = createMockSchema([
      { name: 'weird', type: 'unknown-type', params: [] }
    ]);

    const rng = createRNG(123);

    expect(() => generateRecord(schema, rng)).toThrow(/unknown generator/i);
    expect(() => generateRecord(schema, rng)).toThrow(/weird/); // Field name in error
  });

  it('should handle empty schema', () => {
    const schema: ValidatedSchema = createMockSchema([]);
    const rng = createRNG(123);

    const record = generateRecord(schema, rng);

    expect(record).toEqual({});
  });
});

// Helper to create mock ValidatedSchema for testing
function createMockSchema(fields: Array<{
  name: string;
  type: string;
  params: Array<{ name: string; value: unknown }>;
}>): ValidatedSchema {
  // Create minimal ValidatedSchema structure for testing
  // This should match the actual ValidatedSchema interface
  // ...implementation...
}
```

**Gherkin Test Requirements:**

```gherkin
# packages/core/features/data-generation.feature

Feature: Record Generation from Validated Schema
  As a developer
  I want to generate complete test data records from schemas
  So that all fields are populated according to their definitions

  Scenario: Generate single record from simple schema
    Given a validated schema with fields:
      | name   | type   | min | max |
      | id     | int    | 1   | 100 |
      | score  | float  | 0.0 | 1.0 |
    And a seeded RNG with seed 12345
    When I generate a record from the schema
    Then the record should have field "id" of type number
    And the record should have field "score" of type number
    And the "id" value should be between 1 and 100
    And the "score" value should be between 0.0 and 1.0

  Scenario: Deterministic generation with same seed
    Given a validated schema with field "value" of type "int"
    And a seeded RNG with seed 99999
    When I generate a record from the schema
    And I create a new RNG with the same seed 99999
    And I generate another record from the same schema
    Then both records should be identical

  Scenario: All primitive field types
    Given a validated schema with fields:
      | name      | type    | params              |
      | id        | int     | min=1, max=1000     |
      | price     | float   | min=0.0, max=100.0  |
      | name      | string  | length=10           |
      | active    | boolean |                     |
    When I generate a record from the schema
    Then all fields should be present in the record
    And all field values should match their expected types

  Scenario: Error handling for unknown generator
    Given a validated schema with field "weird" of type "invalid-type"
    When I attempt to generate a record from the schema
    Then a clear error should be thrown
    And the error message should mention "invalid-type"
    And the error message should mention field name "weird"
```

### Performance Considerations

**Current Story Scope:**
- Single record generation is lightweight (microseconds)
- No performance optimization needed yet
- Focus on correctness and clarity

**Story 3.4 Considerations:**
- generateRecord will be called in tight loop (1M+ times)
- Keep function pure and stateless for easy optimization
- Avoid allocations inside hot loops
- Parameter extraction might be memoized later

**Not in Scope for This Story:**
- Caching or memoization
- Batch optimization
- Memory pooling
- Performance profiling

### Definition of Done Checklist

**Before marking story as done, verify:**

- [ ] `generateRecord` function implemented and exported
- [ ] Function accepts ValidatedSchema and RNG parameters
- [ ] All fields from schema are present in generated record
- [ ] Field values match expected types (int, float, string, boolean)
- [ ] Generator parameters (min, max, length) are extracted and used correctly
- [ ] Same seed produces identical records (determinism verified)
- [ ] Unknown generator types throw clear errors with field context
- [ ] Empty schemas produce empty records
- [ ] All unit tests pass (`bun test generator.test.ts`)
- [ ] All Gherkin tests pass (`bun test --test-name-pattern="Record Generation"`)
- [ ] Code follows project style (passes `bun run lint`)
- [ ] Exports added to `packages/core/src/generator/index.ts`
- [ ] No external dependencies added (builds on existing RNG and primitives)
- [ ] Documentation comments complete (JSDoc for public API)

### References

**Source Documents:**
- [Epic 3: Basic Data Generation](_bmad-output/planning-artifacts/epics/epic-3-basic-data-generation.md#story-33)
- [Core Architectural Decisions - Generator Architecture](_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#generator-architecture)
- [Story 3.1: Custom PRNG](_bmad-output/implementation-artifacts/3-1-custom-prng-xoshiro256-implementation.md)
- [Story 3.2: Primitive Generators](_bmad-output/implementation-artifacts/3-2-primitive-field-generators.md)
- [Story 2.5: Semantic Analyzer - Type Checking](_bmad-output/implementation-artifacts/2-5-semantic-analyzer-type-checking-and-validation.md)

**Key Implementation Files:**
- RNG: [packages/core/src/generator/rng.ts](packages/core/src/generator/rng.ts)
- Primitives: [packages/core/src/generator/generators/primitives.ts](packages/core/src/generator/generators/primitives.ts)
- ValidatedSchema: [packages/core/src/analyzer/types.ts](packages/core/src/analyzer/types.ts)
- AST Types: [packages/core/src/parser/ast.ts](packages/core/src/parser/ast.ts)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
