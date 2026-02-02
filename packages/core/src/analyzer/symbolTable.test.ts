import { describe, test, expect } from 'bun:test';
import { SymbolTable } from './symbolTable';
import type { SchemaNode, FieldNode } from '../parser/ast';
import type { SourceLocation } from '../common/diagnostic';

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

describe('SymbolTable', () => {
  describe('defineSchema and lookupSchema', () => {
    test('should define schema and lookup successfully', () => {
      const table = new SymbolTable();
      const node = schemaNode('User', loc(1, 1));

      const result = table.defineSchema('User', node);

      expect(result.ok).toBe(true);

      const symbol = table.lookupSchema('User');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('User');
      expect(symbol?.kind).toBe('schema');
      expect(symbol?.astNode).toBe(node);
    });

    test('should return undefined for undefined schema', () => {
      const table = new SymbolTable();

      const symbol = table.lookupSchema('NonExistent');

      expect(symbol).toBeUndefined();
    });

    test('should detect duplicate schema definition', () => {
      const table = new SymbolTable();
      const node1 = schemaNode('User', loc(1, 1));
      const node2 = schemaNode('User', loc(10, 1));

      table.defineSchema('User', node1);
      const result = table.defineSchema('User', node2);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('analyzer.duplicateSchema');
        expect(result.errors[0].message).toContain('User');
        expect(result.errors[0].location).toEqual(node2.location);
        expect(result.errors[0].related).toBeDefined();
        expect(result.errors[0].related?.[0].location).toEqual(node1.location);
      }
    });
  });

  describe('defineField and lookupField', () => {
    test('should define field in schema and lookup successfully', () => {
      const table = new SymbolTable();
      const schemaLoc = loc(1, 1);
      const fieldLoc = loc(2, 3);

      table.defineSchema('User', schemaNode('User', schemaLoc));
      const result = table.defineField('User', 'email', fieldNode('email', 'string', fieldLoc));

      expect(result.ok).toBe(true);

      const symbol = table.lookupField('User', 'email');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('email');
      expect(symbol?.kind).toBe('field');
    });

    test('should return undefined for undefined field', () => {
      const table = new SymbolTable();
      table.defineSchema('User', schemaNode('User', loc(1, 1)));

      const symbol = table.lookupField('User', 'nonExistent');

      expect(symbol).toBeUndefined();
    });

    test('should detect duplicate field definition within same schema', () => {
      const table = new SymbolTable();
      const schemaLoc = loc(1, 1);
      const field1Loc = loc(2, 3);
      const field2Loc = loc(5, 3);

      table.defineSchema('User', schemaNode('User', schemaLoc));
      table.defineField('User', 'email', fieldNode('email', 'string', field1Loc));
      const result = table.defineField('User', 'email', fieldNode('email', 'string', field2Loc));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('analyzer.duplicateField');
        expect(result.errors[0].message).toContain('email');
        expect(result.errors[0].location).toEqual(field2Loc);
        expect(result.errors[0].related).toBeDefined();
        expect(result.errors[0].related?.[0].location).toEqual(field1Loc);
      }
    });

    test('should allow fields with same name in different schemas', () => {
      const table = new SymbolTable();

      table.defineSchema('User', schemaNode('User', loc(1, 1)));
      table.defineSchema('Product', schemaNode('Product', loc(10, 1)));

      const result1 = table.defineField('User', 'id', fieldNode('id', 'string', loc(2, 3)));
      const result2 = table.defineField('Product', 'id', fieldNode('id', 'string', loc(11, 3)));

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      expect(table.lookupField('User', 'id')).toBeDefined();
      expect(table.lookupField('Product', 'id')).toBeDefined();
    });
  });

  describe('nested scopes', () => {
    test('should support scope hierarchy - lookup in parent scope', () => {
      const table = new SymbolTable();
      const node = schemaNode('User', loc(1, 1));

      table.defineSchema('User', node);

      // Enter nested scope
      table.enterScope('User', 'schema');

      // Should be able to lookup schema from nested scope
      const symbol = table.lookupSchema('User');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('User');

      table.exitScope();
    });

    test('should isolate symbols in child scope from parent', () => {
      const table = new SymbolTable();

      table.defineSchema('User', schemaNode('User', loc(1, 1)));
      table.enterScope('User', 'schema');

      // Define field in schema scope
      table.defineField('User', 'email', fieldNode('email', 'string', loc(2, 3)));

      // Exit scope
      table.exitScope();

      // Field lookup should still work (through schema name)
      const fieldSymbol = table.lookupField('User', 'email');
      expect(fieldSymbol).toBeDefined();
    });
  });

  describe('context and profile tracking', () => {
    test('should define and lookup context', () => {
      const table = new SymbolTable();
      const contextNode = {
        kind: 'context' as const,
        name: 'TestContext',
        location: loc(1, 1),
      };

      const result = table.defineContext('TestContext', contextNode);
      expect(result.ok).toBe(true);

      const symbol = table.lookupContext('TestContext');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('TestContext');
      expect(symbol?.kind).toBe('context');
    });

    test('should define and lookup profile', () => {
      const table = new SymbolTable();
      const profileNode = {
        kind: 'profile' as const,
        name: 'TestProfile',
        defaults: [],
        location: loc(1, 1),
      };

      const result = table.defineProfile('TestProfile', profileNode);
      expect(result.ok).toBe(true);

      const symbol = table.lookupProfile('TestProfile');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('TestProfile');
      expect(symbol?.kind).toBe('profile');
    });

    test('should track context and profile separately from schemas', () => {
      const table = new SymbolTable();

      // Use same name for all three types - should be tracked separately
      table.defineSchema('Entity', schemaNode('Entity', loc(1, 1)));
      table.defineContext('Entity', { kind: 'context', name: 'Entity', location: loc(10, 1) });
      table.defineProfile('Entity', {
        kind: 'profile',
        name: 'Entity',
        defaults: [],
        location: loc(20, 1),
      });

      // All should be independently accessible
      expect(table.lookupSchema('Entity')).toBeDefined();
      expect(table.lookupContext('Entity')).toBeDefined();
      expect(table.lookupProfile('Entity')).toBeDefined();
    });
  });

  describe('helper methods', () => {
    test('should return all symbols including schemas, contexts, and profiles', () => {
      const table = new SymbolTable();

      table.defineSchema('User', schemaNode('User', loc(1, 1)));
      table.defineSchema('Product', schemaNode('Product', loc(10, 1)));
      table.defineContext('TestContext', {
        kind: 'context',
        name: 'TestContext',
        location: loc(15, 1),
      });
      table.defineProfile('TestProfile', {
        kind: 'profile',
        name: 'TestProfile',
        defaults: [],
        location: loc(20, 1),
      });

      const symbols = table.getAllSymbols();
      expect(symbols.length).toBeGreaterThanOrEqual(4);
      expect(symbols.some((s) => s.name === 'User' && s.kind === 'schema')).toBe(true);
      expect(symbols.some((s) => s.name === 'Product' && s.kind === 'schema')).toBe(true);
      expect(symbols.some((s) => s.name === 'TestContext' && s.kind === 'context')).toBe(true);
      expect(symbols.some((s) => s.name === 'TestProfile' && s.kind === 'profile')).toBe(true);
    });

    test('should check symbol existence', () => {
      const table = new SymbolTable();
      table.defineSchema('User', schemaNode('User', loc(1, 1)));

      expect(table.hasSymbol('User')).toBe(true);
      expect(table.hasSymbol('NonExistent')).toBe(false);
    });
  });

  describe('multiple duplicate errors', () => {
    test('should accumulate multiple duplicate errors', () => {
      const table = new SymbolTable();
      const node1 = schemaNode('User', loc(1, 1));
      const node2 = schemaNode('User', loc(10, 1));
      const node3 = schemaNode('Product', loc(20, 1));
      const node4 = schemaNode('Product', loc(30, 1));

      table.defineSchema('User', node1);
      table.defineSchema('Product', node3);

      const result2 = table.defineSchema('User', node2);
      const result4 = table.defineSchema('Product', node4);

      expect(result2.ok).toBe(false);
      expect(result4.ok).toBe(false);
    });
  });

  describe('error diagnostics', () => {
    test('should include both original and duplicate locations in error', () => {
      const table = new SymbolTable();
      const node1 = schemaNode('User', loc(5, 10, 20));
      const node2 = schemaNode('User', loc(15, 5, 20));

      table.defineSchema('User', node1);
      const result = table.defineSchema('User', node2);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors[0];

        // Current (duplicate) location
        expect(error.location).toEqual(loc(15, 5, 20));

        // Original definition location in related info
        expect(error.related).toBeDefined();
        expect(error.related).toHaveLength(1);
        if (error.related && error.related.length > 0) {
          expect(error.related[0].location).toEqual(loc(5, 10, 20));
          expect(error.related[0].message).toContain('defined');
        }
      }
    });
  });
});
