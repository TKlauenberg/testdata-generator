import { Ability } from '@serenity-js/core';
import type { ASTNode, Program, SchemaNode, FieldNode, ProfileNode } from '../../../src/parser/ast';
import type { SourceLocation } from '../../../src/common/diagnostic';

/**
 * Ability to construct AST nodes for testing.
 * Stores constructed nodes for later verification.
 */
export class ConstructASTNodes extends Ability {
  private _currentNode: ASTNode | null = null;
  private _originalNode: ASTNode | null = null;
  private _newNode: ASTNode | null = null;

  static asQATester(): ConstructASTNodes {
    return new ConstructASTNodes();
  }

  getCurrentNode(): ASTNode | null {
    return this._currentNode;
  }

  setCurrentNode(node: ASTNode): void {
    this._currentNode = node;
  }

  getOriginalNode(): ASTNode | null {
    return this._originalNode;
  }

  setOriginalNode(node: ASTNode): void {
    this._originalNode = node;
  }

  getNewNode(): ASTNode | null {
    return this._newNode;
  }

  setNewNode(node: ASTNode): void {
    this._newNode = node;
  }

  createLocation(file = 'test.td', line = 1, column = 1, length = 10): SourceLocation {
    return { file, line, column, length };
  }

  constructProgramNode(_declarationsCount: number): Program {
    const node: Program = {
      kind: 'program',
      declarations: [],
      location: this.createLocation(),
    };
    this.setCurrentNode(node);
    return node;
  }

  constructSchemaNode(name: string, _fieldsCount: number): SchemaNode {
    const node: SchemaNode = {
      kind: 'schema',
      name,
      fields: [],
      location: this.createLocation(),
    };
    this.setCurrentNode(node);
    return node;
  }

  constructSchemaNodeWithFields(name: string, fields: FieldNode[]): SchemaNode {
    const node: SchemaNode = {
      kind: 'schema',
      name,
      fields,
      location: this.createLocation(),
    };
    this.setCurrentNode(node);
    return node;
  }

  constructFieldNode(
    name: string,
    type: string,
    generatorName?: string,
    unique?: boolean,
  ): FieldNode {
    const node: FieldNode = {
      kind: 'field',
      name,
      type,
      generator: generatorName ? { name: generatorName, parameters: [] } : undefined,
      constraints: unique !== undefined ? { unique } : undefined,
      location: this.createLocation(),
    };
    this.setCurrentNode(node);
    return node;
  }

  constructProfileNode(name: string, _defaultsCount: number): ProfileNode {
    const node: ProfileNode = {
      kind: 'profile',
      name,
      defaults: [],
      location: this.createLocation(),
    };
    this.setCurrentNode(node);
    return node;
  }

  addFieldImmutably(schema: SchemaNode, newField: FieldNode): SchemaNode {
    const updatedSchema: SchemaNode = {
      ...schema,
      fields: [...schema.fields, newField],
    };
    return updatedSchema;
  }
}
