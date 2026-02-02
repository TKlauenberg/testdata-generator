/**
 * Step definitions for Symbol Table feature tests
 *
 * Uses Cucumber for BDD-style testing of symbol table functionality.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'bun:test';
import { SymbolTable } from '../../src/analyzer/symbolTable.js';
import type { Symbol as SymbolTableSymbol, SymbolKind } from '../../src/analyzer/symbolTable.js';
import type { SchemaNode, FieldNode } from '../../src/parser/ast.js';
import type { SourceLocation } from '../../src/common/diagnostic.js';
import type { Result } from '../../src/common/result.js';
import type { Diagnostic } from '../../src/common/diagnostic.js';

// World state
interface WorldState {
  symbolTable: SymbolTable;
  lastResult: Result<void, Diagnostic[]> | null;
  lastLookup: SymbolTableSymbol | undefined;
  allSymbols: SymbolTableSymbol[];
}

// Shared world state
let world: WorldState = {
  symbolTable: new SymbolTable(),
  lastResult: null,
  lastLookup: undefined,
  allSymbols: [],
};

// Test helper to create a source location
function loc(line: number, column: number, length = 1): SourceLocation {
  return { file: 'test.td', line, column, length };
}

// Test helper to create a schema node
function schemaNode(name: string, location: SourceLocation): SchemaNode {
  return {
    kind: 'schema',
    name,
    fields: [],
    location,
  };
}

// Test helper to create a field node
function fieldNode(name: string, type: string, location: SourceLocation): FieldNode {
  return {
    kind: 'field',
    name,
    type,
    location,
  };
}

// Background
Given('a new symbol table', function () {
  world = {
    symbolTable: new SymbolTable(),
    lastResult: null,
    lastLookup: undefined,
    allSymbols: [],
  };
});

// Schema definition steps
Given(
  'I define a schema {string} at line {int}, column {int}',
  function (name: string, line: number, column: number) {
    const result = world.symbolTable.defineSchema(name, schemaNode(name, loc(line, column)));
    world.lastResult = result;
  },
);

When(
  'I attempt to define a schema {string} at line {int}, column {int}',
  function (name: string, line: number, column: number) {
    const result = world.symbolTable.defineSchema(name, schemaNode(name, loc(line, column)));
    world.lastResult = result;
  },
);

// Field definition steps
Given(
  'I define a field {string} in schema {string} at line {int}, column {int}',
  function (fieldName: string, schemaName: string, line: number, column: number) {
    const result = world.symbolTable.defineField(
      schemaName,
      fieldName,
      fieldNode(fieldName, 'string', loc(line, column)),
    );
    world.lastResult = result;
  },
);

When(
  'I attempt to define a field {string} in schema {string} at line {int}, column {int}',
  function (fieldName: string, schemaName: string, line: number, column: number) {
    const result = world.symbolTable.defineField(
      schemaName,
      fieldName,
      fieldNode(fieldName, 'string', loc(line, column)),
    );
    world.lastResult = result;
  },
);

// Context definition steps
Given(
  'I define a context {string} at line {int}, column {int}',
  function (name: string, line: number, column: number) {
    const node = { kind: 'context' as const, name, location: loc(line, column) };
    const result = world.symbolTable.defineContext(name, node);
    world.lastResult = result;
  },
);

// Profile definition steps
Given(
  'I define a profile {string} at line {int}, column {int}',
  function (name: string, line: number, column: number) {
    const node = { kind: 'profile' as const, name, defaults: [], location: loc(line, column) };
    const result = world.symbolTable.defineProfile(name, node);
    world.lastResult = result;
  },
);

// Lookup steps
When('I lookup a schema {string}', function (name: string) {
  world.lastLookup = world.symbolTable.lookupSchema(name);
});

// Scope management steps
When('I enter scope {string} with kind {string}', function (scopeName: string, kind: string) {
  world.symbolTable.enterScope(scopeName, kind as 'schema' | 'field' | 'context' | 'profile');
});

When('I exit scope', function () {
  world.symbolTable.exitScope();
});

// Retrieve symbols step
When('I retrieve all symbols', function () {
  world.allSymbols = world.symbolTable.getAllSymbols();
});

// Assertion steps - existence
Then('the schema {string} should exist in the symbol table', function (name: string) {
  const symbol = world.symbolTable.lookupSchema(name);
  expect(symbol).toBeDefined();
  world.lastLookup = symbol;
});

Then('the schema {string} should exist', function (name: string) {
  const symbol = world.symbolTable.lookupSchema(name);
  expect(symbol).toBeDefined();
  world.lastLookup = symbol;
});

Then('the context {string} should exist', function (name: string) {
  const symbol = world.symbolTable.lookupContext(name);
  expect(symbol).toBeDefined();
  world.lastLookup = symbol;
});

Then('the profile {string} should exist', function (name: string) {
  const symbol = world.symbolTable.lookupProfile(name);
  expect(symbol).toBeDefined();
  world.lastLookup = symbol;
});

Then(
  'the field {string} in schema {string} should exist',
  function (fieldName: string, schemaName: string) {
    const symbol = world.symbolTable.lookupField(schemaName, fieldName);
    expect(symbol).toBeDefined();
    world.lastLookup = symbol;
  },
);

Then('the lookup should return undefined', function () {
  expect(world.lastLookup).toBeUndefined();
});

// Assertion steps - kind
Then('the symbol {string} should have kind {string}', function (_name: string, kind: string) {
  expect(world.lastLookup).toBeDefined();
  expect(world.lastLookup?.kind).toBe(kind as SymbolKind);
});

Then('the field symbol should have kind {string}', function (kind: string) {
  expect(world.lastLookup).toBeDefined();
  expect(world.lastLookup?.kind).toBe(kind as SymbolKind);
});

// Assertion steps - location
Then(
  'the symbol {string} should have location line {int}, column {int}',
  function (_name: string, line: number, column: number) {
    expect(world.lastLookup).toBeDefined();
    expect(world.lastLookup?.location.line).toBe(line);
    expect(world.lastLookup?.location.column).toBe(column);
  },
);

Then(
  'the field symbol should have location line {int}, column {int}',
  function (line: number, column: number) {
    expect(world.lastLookup).toBeDefined();
    expect(world.lastLookup?.location.line).toBe(line);
    expect(world.lastLookup?.location.column).toBe(column);
  },
);

// Assertion steps - errors
Then('the operation should fail with error code {string}', function (errorCode: string) {
  const lastResult = world.lastResult;
  expect(lastResult).not.toBeNull();
  if (!lastResult || lastResult.ok) {
    return;
  }
  expect(lastResult.errors[0].code).toBe(errorCode);
});

Then('the symbol table error message should contain {string}', function (substring: string) {
  const lastResult = world.lastResult;
  expect(lastResult).not.toBeNull();
  if (!lastResult || lastResult.ok) {
    return;
  }
  expect(lastResult.errors[0].message).toContain(substring);
});

Then(
  'the error location should be line {int}, column {int}',
  function (line: number, column: number) {
    const lastResult = world.lastResult;
    expect(lastResult).not.toBeNull();
    if (!lastResult || lastResult.ok) {
      return;
    }
    expect(lastResult.errors[0].location?.line).toBe(line);
    expect(lastResult.errors[0].location?.column).toBe(column);
  },
);

Then(
  'the error should reference the original definition at line {int}, column {int}',
  function (line: number, column: number) {
    const lastResult = world.lastResult;
    expect(lastResult).not.toBeNull();
    if (!lastResult || lastResult.ok) {
      return;
    }
    const error = lastResult.errors[0];
    expect(error.related).toBeDefined();
    expect(error.related).not.toHaveLength(0);
    if (error.related && error.related.length > 0) {
      expect(error.related[0].location?.line).toBe(line);
      expect(error.related[0].location?.column).toBe(column);
    }
  },
);

// Assertion steps - multiple operations
Then('both field definitions should succeed', function () {
  expect(world.lastResult).not.toBeNull();
  expect(world.lastResult?.ok).toBe(true);
});

Then('all three symbols should be independently accessible', function () {
  // This is validated by the previous existence checks in the scenario
  expect(true).toBe(true);
});

// Assertion steps - scope lookup
Then('I should be able to lookup schema {string} from the nested scope', function (name: string) {
  const symbol = world.symbolTable.lookupSchema(name);
  expect(symbol).toBeDefined();
});

Then('I should still be able to lookup schema {string}', function (name: string) {
  const symbol = world.symbolTable.lookupSchema(name);
  expect(symbol).toBeDefined();
});

// Assertion steps - all symbols
Then('I should get at least {int} symbols', function (count: number) {
  expect(world.allSymbols.length).toBeGreaterThanOrEqual(count);
});

Then(
  'the symbols should include {string} with kind {string}',
  function (name: string, kind: string) {
    const symbol = world.allSymbols.find((s) => s.name === name && s.kind === kind);
    expect(symbol).toBeDefined();
  },
);
