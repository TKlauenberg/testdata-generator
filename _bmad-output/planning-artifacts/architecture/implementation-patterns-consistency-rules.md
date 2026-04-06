# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Addressed:** 12 areas where AI agents could make inconsistent choices

All AI agents working on this project MUST follow these patterns to ensure code consistency and compatibility.

## Naming Patterns

### File & Directory Naming

| Element               | Convention               | Example                                          |
| --------------------- | ------------------------ | ------------------------------------------------ |
| Source files          | `camelCase.ts`           | `scanner.ts`, `astNodes.ts`, `errorFormatter.ts` |
| Directories           | `camelCase/`             | `scanner/`, `parser/`, `generator/`              |
| Test files            | `*.test.ts` (co-located) | `scanner.test.ts`, `parser.test.ts`              |
| Type definition files | `camelCase.ts`           | `types.ts`, `tokens.ts`                          |
| Index exports         | `index.ts`               | `index.ts`                                       |

### TypeScript Code Naming

| Element            | Convention                     | Example                                            |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| Types/Interfaces   | PascalCase                     | `SchemaNode`, `Token`, `Diagnostic`                |
| Type discriminants | lowercase string literals      | `kind: 'schema'`, `kind: 'identifier'`             |
| Classes            | PascalCase                     | `Scanner`, `Parser`, `Generator`                   |
| Functions          | camelCase                      | `parseSchema()`, `generateRecord()`                |
| Variables          | camelCase                      | `tokenList`, `currentIndex`                        |
| Constants          | UPPER_SNAKE_CASE               | `MAX_ERRORS`, `DEFAULT_SEED`                       |
| Private members    | `private` keyword + underscore | `private _consumeToken()`, `private _currentIndex` |
| Enum values        | PascalCase                     | `TokenKind.Identifier`, `Severity.Error`           |

### DSL Element Naming

| Element         | Convention                 | Example                                                     |
| --------------- | -------------------------- | ----------------------------------------------------------- |
| AST node types  | PascalCase + "Node" suffix | `SchemaNode`, `FieldNode`, `ProfileNode`                    |
| Token kinds     | lowercase string literals  | `'schema'`, `'profile'`, `'identifier'`                     |
| Error codes     | dot-separated strings      | `'parser.unexpectedToken'`, `'analyzer.undefinedReference'` |
| Generator names | camelCase                  | `randomInt`, `firstName`, `emailTemplate`                   |

## Structure Patterns

### Module Organization

Each module follows this structure:

```
moduleName/
├── index.ts           # Public exports only
├── moduleName.ts      # Main implementation
├── types.ts           # Type definitions (if needed)
├── errors.ts          # Error factories (if needed)
├── moduleName.test.ts # Tests co-located
└── internal/          # Internal helpers (not exported)
```

### Core Package Structure

```
packages/core/src/
├── scanner/
│   ├── index.ts         # export { scan } from './scanner'
│   ├── scanner.ts       # Scanner class
│   ├── tokens.ts        # Token type definitions
│   ├── keywords.ts      # Keyword mapping
│   └── scanner.test.ts
├── parser/
│   ├── index.ts
│   ├── parser.ts        # Recursive descent parser
│   ├── ast.ts           # AST node type definitions
│   ├── errors.ts        # Parser error factories
│   └── parser.test.ts
├── analyzer/
│   ├── index.ts
│   ├── analyzer.ts      # Semantic analysis
│   ├── symbolTable.ts   # Symbol table implementation
│   ├── typeChecker.ts   # Type checking logic
│   └── analyzer.test.ts
├── generator/
│   ├── index.ts
│   ├── generator.ts     # Generation orchestration
│   ├── rng.ts           # Custom PRNG (Xoshiro256**)
│   ├── generators/      # Built-in field generators
│   │   ├── primitives.ts
│   │   ├── identity.ts
│   │   ├── personal.ts
│   │   └── temporal.ts
│   └── generator.test.ts
├── context/
│   ├── index.ts
│   ├── contextManager.ts
│   ├── loaders.ts       # JSON/CSV loaders
│   └── context.test.ts
├── adapters/
│   ├── index.ts
│   ├── jsonAdapter.ts
│   ├── csvAdapter.ts
│   ├── sqlAdapter.ts
│   └── adapters.test.ts
├── common/
│   ├── result.ts        # Result<T, E> type utilities
│   ├── diagnostic.ts    # Diagnostic type and factories
│   └── location.ts      # SourceLocation type
└── index.ts             # Public API exports
```

## Format Patterns

### Result Type Format

```typescript
// Always use this exact shape
type Result<T, E = Diagnostic[]> = { ok: true; value: T } | { ok: false; errors: E };

// Helper factories
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = <E>(errors: E): Result<never, E> => ({ ok: false, errors });
```

### Diagnostic Format

```typescript
interface Diagnostic {
  code: string; // 'phase.errorType' format
  message: string; // Human-readable, QA-friendly
  severity: 'error' | 'warning' | 'info';
  location: SourceLocation;
  suggestion?: string; // "Did you mean...?"
  related?: Diagnostic[]; // Related context
}

interface SourceLocation {
  file: string;
  line: number; // 1-indexed
  column: number; // 1-indexed
  length: number; // For underline rendering
}
```

### Error Code Format

Error codes follow `phase.errorType` pattern:

- `scanner.unterminatedString`
- `scanner.invalidCharacter`
- `parser.unexpectedToken`
- `parser.missingField`
- `analyzer.undefinedReference`
- `analyzer.duplicateDefinition`
- `analyzer.circularDependency`
- `generator.uniquenessViolation`

## Testing Patterns

### Test File Location

Tests are **co-located** with source files as `*.test.ts`

### Dual Testing Approach

The project uses a **dual testing strategy**:

1. **Unit Tests** (`*.test.ts`): Fast, focused tests for individual functions and edge cases
2. **BDD/Gherkin Tests** (`.feature` files): Behavior-driven tests for acceptance criteria and use case validation

### When to Use Gherkin Tests

**MANDATORY: Gherkin tests MUST be created for:**

- **Acceptance Criteria Testing**: All acceptance criteria defined in stories MUST be verified with Gherkin scenarios
- **Use Case Validation**: Features with special business logic or domain-specific behavior
- **Integration Scenarios**: Multi-module workflows and end-to-end user journeys
- **QA Documentation**: Tests that serve as living documentation for QA and stakeholders

**Pattern Reference**: Complete BDD testing patterns and Screenplay architecture are documented in [packages/core/features/README.md](../../../packages/core/features/README.md)

### Test Structure

```typescript
import { describe, it, expect } from 'bun:test';

describe('Scanner', () => {
  describe('scan()', () => {
    it('should tokenize schema keyword', () => {
      const result = scan('schema');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('keyword');
      }
    });

    it('should report error for unterminated string', () => {
      const result = scan('"unterminated');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].code).toBe('scanner.unterminatedString');
      }
    });
  });
});
```

### Gherkin Feature Structure

```gherkin
Feature: DSL Schema Validation
  As a QA tester
  I want to validate DSL schemas
  So that I can ensure they are correct before generating data

  Background:
    Given the testdata-generator core library is initialized

  @validation @happy-path
  Scenario: Valid schema passes validation
    Given QA Tester has a valid DSL schema:
      """
      schema User {
        id: uuid;
        name: string;
      }
      """
    When QA Tester validates the schema
    Then QA Tester should see validation succeeded
    And the validated schema should contain a "User" schema
```

**Screenplay Pattern Components** (see [packages/core/features/README.md](../../../packages/core/features/README.md) for details):

- **Abilities**: System interaction capabilities (e.g., `ParseSchemas.usingCoreLibrary()`)
- **Tasks**: High-level business actions (e.g., `ValidateSchema.withSource(source)`)
- **Questions**: System state queries (e.g., `ValidationResult.value()`)
- **Step Definitions**: Thin translation layer between Gherkin and Screenplay components

### Snapshot Testing for AST

```typescript
it('should parse simple schema', () => {
  const result = parse(scan('schema User { id: uuid }').value);
  expect(result).toMatchSnapshot();
});
```

### Deterministic Generator Testing

```typescript
it('should generate identical output with same seed', () => {
  const schema = /* validated schema */;
  const result1 = Array.from(generate(schema, { seed: 12345, count: 10 }));
  const result2 = Array.from(generate(schema, { seed: 12345, count: 10 }));
  expect(result1).toEqual(result2);
});
```

## Enforcement Guidelines

**All AI Agents MUST:**

1. Use `camelCase.ts` for all file names
2. Use `camelCase/` for all directory names
3. Co-locate tests as `*.test.ts` files
4. Use `private _name` for private class members (both keyword and underscore)
5. Return `Result<T, Diagnostic[]>` from all fallible operations
6. Use dot-separated error codes (`phase.errorType`)
7. Include `SourceLocation` in all diagnostics
8. Export only through `index.ts` files
9. Keep AST nodes as readonly immutable data
10. Use `AsyncIterable` for streaming generation output
11. **Create Gherkin `.feature` files for all acceptance criteria** - Test user-facing behaviors with BDD scenarios
12. **Use Screenplay pattern for BDD tests** - Follow the patterns in [packages/core/features/README.md](../../../packages/core/features/README.md)

**Anti-Patterns to Avoid:**

- ❌ `kebab-case.ts` or `snake_case.ts` file names
- ❌ Throwing exceptions for expected errors (use Result type)
- ❌ Mutable AST nodes
- ❌ Direct exports bypassing index.ts
- ❌ Tests in separate `__tests__/` directories
- ❌ Private members without both `private` keyword and underscore
- ❌ Numeric error codes (use descriptive strings)
- ❌ **Implementing features without corresponding Gherkin tests for acceptance criteria**
- ❌ **Writing step definitions that contain business logic** (use Screenplay: Tasks, Questions, Abilities)
