---
project_name: 'testdata-ai'
user_name: 'Tobi'
date: '2025-12-21'
sections_completed: ['technology_stack', 'language_rules', 'architecture_testing', 'critical_rules']
status: 'complete'
rule_count: 45
optimized_for_llm: true
---

# Project Context: testdata-ai

> Critical implementation rules for AI agents. Follow these exactly.

## Technology Stack & Versions

**Runtime & Language:**
- **Bun 1.x** - Primary runtime (NOT Node.js)
  - Use `bun` commands, not `npm` or `node`
  - Built-in TypeScript support, no ts-node needed
- **TypeScript 5.x** with strict mode enabled
  - `strict: true` - all strict checks enabled
  - `target: "ESNext"` - use latest features
  - `module: "ESNext"` - ESM modules only, no CommonJS

**CLI Framework:**
- **Commander.js v14.0.2** - For CLI argument parsing

**Testing:**
- **Bun's built-in test runner** - NOT Jest, NOT Mocha
  - Use `bun test` to run tests
  - Use `describe`, `test`, `expect` from Bun (no imports needed)

**Code Quality:**
- **Prettier** - Single quotes, trailing commas
- **ESLint** - TypeScript plugin with strict rules

**Critical Version Constraint:**
⚠️ NO Faker.js dependency - use custom Xoshiro256** PRNG implementation

## Language-Specific Rules (TypeScript)

### TypeScript Strict Mode Requirements
- **MUST use strict mode** - `strict: true` in tsconfig.json
- **No `any` types** - strict mode prevents this
- **Explicit return types** for all public functions
- **Non-null assertions forbidden** - use proper null checks

### Import/Export Conventions
- **ESM modules only** - use `import/export`, NEVER `require()`
- **Module boundaries enforced** - all exports through `index.ts`
  ```typescript
  // ✅ Correct - export through index.ts
  export { scan } from './scanner';

  // ❌ Wrong - direct import bypassing index
  import { Scanner } from '../scanner/scanner';
  ```
- **Use relative paths** for internal imports
- **Named exports preferred** over default exports

### Error Handling Patterns
- **Result<T, E> type for expected errors** - NEVER throw exceptions
  ```typescript
  type Result<T, E> =
    | { ok: true; value: T }
    | { ok: false; error: E };

  // ✅ Correct
  function parse(tokens: Token[]): Result<Program, Diagnostic[]> {
    if (error) return { ok: false, error: diagnostics };
    return { ok: true, value: program };
  }

  // ❌ Wrong - throwing for expected errors
  function parse(tokens: Token[]): Program {
    if (error) throw new Error('Parse failed');
  }
  ```
- **Diagnostic type for errors** with source location
  ```typescript
  interface Diagnostic {
    kind: 'error' | 'warning';
    message: string;
    location: SourceLocation;
  }
  ```

### Type Patterns
- **Discriminated unions for tokens/AST**
  ```typescript
  type Token =
    | { kind: 'number'; value: number; location: SourceLocation }
    | { kind: 'string'; value: string; location: SourceLocation }
    | { kind: 'identifier'; value: string; location: SourceLocation };
  ```
- **Immutable data structures** - use `readonly` for AST nodes
  ```typescript
  interface SchemaNode {
    readonly kind: 'schema';
    readonly name: string;
    readonly fields: readonly FieldNode[];
  }
  ```
- **Pure functions** that return new objects, never mutate
  ```typescript
  // ✅ Correct - returns new object
  function addField(schema: SchemaNode, field: FieldNode): SchemaNode {
    return { ...schema, fields: [...schema.fields, field] };
  }

  // ❌ Wrong - mutates input
  function addField(schema: SchemaNode, field: FieldNode): void {
    schema.fields.push(field);
  }
  ```

### Async Patterns
- **Use AsyncIterable for streaming**
  ```typescript
  async function* generate(program: ValidatedProgram): AsyncIterable<Record> {
    for (const schema of program.schemas) {
      yield generateRecord(schema);
    }
  }
  ```
- **Prefer async/await** over Promise chains

## Architecture & Project Structure Rules

### Monorepo Structure
- **2-package monorepo** using Bun workspaces
  - `packages/core/` - @testdata-ai/core (library)
  - `packages/cli/` - @testdata-ai/cli (CLI tool)
- **Core must NOT import from CLI** - one-way dependency only

### Multi-Pass Compilation Pipeline
- **Sequential stages** with clear boundaries:
  ```
  Scanner → Parser → Analyzer → Generator
  ```
- **Stage contracts:**
  - Scanner: `string → Result<Token[]>`
  - Parser: `Token[] → Result<Program>`
  - Analyzer: `Program → Result<ValidatedProgram>`
  - Generator: `ValidatedProgram → AsyncIterable<Record>`
- **Never skip stages** or combine responsibilities

### Module Organization
- **Every module has index.ts** - single export point
  ```typescript
  // packages/core/src/scanner/index.ts
  export { scan } from './scanner';
  export type { Token, TokenKind } from './tokens';
  ```
- **Clear module boundaries:**
  - `scanner/` - Lexical analysis only
  - `parser/` - Syntax analysis only
  - `analyzer/` - Semantic validation only
  - `generator/` - Data generation only
  - `context/` - Context loading/saving only
  - `adapters/` - Output formatting only
  - `common/` - Shared utilities (Result, Diagnostic, etc.)

### File Naming Conventions
- **camelCase.ts** for ALL files and directories
  ```
  ✅ packages/core/src/scanner/scanner.ts
  ✅ packages/core/src/parser/ast.ts
  ✅ packages/cli/src/commands/generate.ts

  ❌ packages/core/src/scanner/Scanner.ts (PascalCase)
  ❌ packages/core/src/parser/ast-nodes.ts (kebab-case)
  ❌ packages/cli/src/commands/generate_command.ts (snake_case)
  ```

### Private Member Convention
- **MUST use both `private` keyword AND underscore prefix**
  ```typescript
  class Scanner {
    private _position: number;  // ✅ Correct
    private _source: string;    // ✅ Correct

    private position: number;   // ❌ Wrong - missing underscore
    _tokens: Token[];           // ❌ Wrong - missing private keyword
  }
  ```

## Testing Rules

### Test Organization
- **Co-located tests** - `*.test.ts` files next to implementation
  ```
  ✅ packages/core/src/scanner/scanner.ts
  ✅ packages/core/src/scanner/scanner.test.ts

  ❌ packages/core/src/__tests__/scanner.test.ts
  ❌ packages/core/tests/scanner.test.ts
  ```

### Test Structure
- **Use Bun's built-in test runner**
  ```typescript
  import { describe, test, expect } from 'bun:test';

  describe('Scanner', () => {
    test('scans number tokens', () => {
      const result = scan('42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].kind).toBe('number');
      }
    });
  });
  ```
- **Test Result types properly** - check `.ok` before accessing `.value`
- **Use descriptive test names** - what behavior is being tested

### Test Coverage
- **Every public function needs tests**
- **Test error cases** - verify Result returns `{ ok: false }`
- **Test edge cases** - empty input, boundary conditions, etc.

### Running Tests
- **Use Bun commands:**
  ```bash
  bun test                    # Run all tests
  bun test scanner           # Test specific module
  bun test --coverage        # With coverage report
  ```

## Critical Don't-Miss Rules

### Anti-Patterns (NEVER Do These)

❌ **File Naming Anti-Patterns:**
```
NEVER use kebab-case: ast-nodes.ts, parse-tree.ts
NEVER use snake_case: token_type.ts, error_handler.ts
NEVER use PascalCase: Scanner.ts, Parser.ts
ALWAYS use camelCase: astNodes.ts, parseTree.ts, scanner.ts
```

❌ **Error Handling Anti-Patterns:**
```typescript
// NEVER throw exceptions for expected errors
throw new Error('Parse failed');
throw new SyntaxError('Invalid token');

// ALWAYS use Result type
return { ok: false, error: diagnostic };
```

❌ **Data Mutation Anti-Patterns:**
```typescript
// NEVER mutate AST nodes
astNode.fields.push(newField);
astNode.name = 'updated';

// ALWAYS return new objects
return { ...astNode, fields: [...astNode.fields, newField] };
```

❌ **Module Boundary Anti-Patterns:**
```typescript
// NEVER bypass index.ts exports
import { Scanner } from '../scanner/scanner';
import { Parser } from '../../parser/parser';

// ALWAYS import through index.ts
import { scan } from '../scanner';
import { parse } from '../../parser';
```

❌ **Test Organization Anti-Patterns:**
```
NEVER create __tests__/ directories
NEVER put tests in separate tests/ folder
ALWAYS co-locate: scanner.ts + scanner.test.ts
```

❌ **Private Member Anti-Patterns:**
```typescript
// NEVER use only underscore OR only private keyword
private position: number;   // Missing underscore
_source: string;           // Missing private keyword

// ALWAYS use both
private _position: number;
private _source: string;
```

### Critical Edge Cases

**Input Validation:**
- Always validate external data sources (context files, .td files)
- Handle empty strings, empty arrays gracefully
- Check for null/undefined before accessing properties (strict mode will help)

**Result Type Handling:**
```typescript
// ✅ Always check .ok before accessing .value
const result = parse(tokens);
if (result.ok) {
  const program = result.value;  // Safe
} else {
  const errors = result.error;   // Handle errors
}

// ❌ Never access .value without checking
const program = parse(tokens).value;  // TypeScript error if not checked
```

**PRNG Seeding:**
- Always support seed parameter for reproducibility
- Document that same seed produces same output
- Use custom Xoshiro256** implementation, never Faker.js

**AsyncIterable Handling:**
```typescript
// ✅ Proper streaming with generators
async function* generate(): AsyncIterable<Record> {
  for (const item of items) {
    yield await generateOne(item);
  }
}

// ❌ Don't load everything into memory
async function generate(): Promise<Record[]> {
  return items.map(generateOne);  // Bad for large datasets
}
```

### Security & Performance Considerations

**Security:**
- Validate all user input from CLI arguments
- Sanitize file paths to prevent directory traversal
- Validate JSON/CSV context files before parsing

**Performance:**
- Use streaming (AsyncIterable) for large datasets
- Don't load all generated data into memory
- Custom PRNG is faster than Faker.js

### Quick Reference Checklist

Before submitting code, verify:
- [ ] File names are camelCase.ts
- [ ] All private members use `private _name`
- [ ] Errors use Result<T,E>, not exceptions
- [ ] AST nodes are immutable (readonly)
- [ ] Tests are co-located (*.test.ts)
- [ ] Exports go through index.ts
- [ ] Using Bun commands, not npm/node
- [ ] TypeScript strict mode enabled
- [ ] No Faker.js dependency

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Refer to the architecture document (docs/architecture.md) for detailed design decisions

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes or new patterns emerge
- Review quarterly for outdated rules
- Remove rules that become obvious over time

**Last Updated:** 2025-12-21
- [ ] Tests are co-located (*.test.ts)
- [ ] Exports go through index.ts
- [ ] Using Bun commands, not npm/node
- [ ] TypeScript strict mode enabled
- [ ] No Faker.js dependency
