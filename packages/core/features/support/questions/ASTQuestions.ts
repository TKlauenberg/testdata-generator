import { Question, type UsesAbilities } from '@serenity-js/core';
import { ConstructASTNodes } from '../abilities/ConstructASTNodes';
import { isSchemaNode, isFieldNode, isProfileNode, isProgramNode } from '../../../src/parser/ast';

export class ASTNodeKind {
  static value(): Question<Promise<string>> {
    return Question.about<string>('the node kind', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return node.kind;
    });
  }
}

export class ASTNodeName {
  static value(): Question<Promise<string>> {
    return Question.about<string>('the node name', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      if ('name' in node) {
        return node.name as string;
      }
      throw new Error('Node does not have a name property');
    });
  }
}

export class ASTNodeType {
  static value(): Question<Promise<string>> {
    return Question.about<string>('the node type', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) {
        throw new Error('No current node');
      }
      if (!isFieldNode(node)) {
        throw new Error('Node is not a FieldNode');
      }
      return node.type;
    });
  }
}

export class ASTNodeGenerator {
  static value(): Question<Promise<string | undefined>> {
    return Question.about<string | undefined>('the node generator', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) {
        throw new Error('No current node');
      }
      if (!isFieldNode(node)) {
        throw new Error('Node is not a FieldNode');
      }
      return node.generator?.name;
    });
  }
}

export class ASTNodeUniqueConstraint {
  static value(): Question<Promise<boolean | undefined>> {
    return Question.about<boolean | undefined>(
      'the node unique constraint',
      (actor: UsesAbilities) => {
        const ability = ConstructASTNodes.as(actor);
        const node = ability.getCurrentNode();
        if (!node) {
          throw new Error('No current node');
        }
        if (!isFieldNode(node)) {
          throw new Error('Node is not a FieldNode');
        }
        return node.constraints?.unique;
      },
    );
  }
}

export class ASTNodeDeclarationsArray {
  static isEmpty(): Question<Promise<boolean>> {
    return Question.about<boolean>(
      'whether declarations array is empty',
      (actor: UsesAbilities) => {
        const ability = ConstructASTNodes.as(actor);
        const node = ability.getCurrentNode();
        if (!node || !isProgramNode(node)) {
          throw new Error('Node is not a Program');
        }
        return node.declarations.length === 0;
      },
    );
  }
}

export class ASTNodeFieldsArray {
  static isEmpty(): Question<Promise<boolean>> {
    return Question.about<boolean>('whether fields array is empty', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node || !isSchemaNode(node)) {
        throw new Error('Node is not a SchemaNode');
      }
      return node.fields.length === 0;
    });
  }

  static count(): Question<Promise<number>> {
    return Question.about<number>('the fields count', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node || !isSchemaNode(node)) {
        throw new Error('Node is not a SchemaNode');
      }
      return node.fields.length;
    });
  }

  static fieldAt(index: number): {
    name(): Question<Promise<string>>;
  } {
    return {
      name: () =>
        Question.about<string>(`field ${index} name`, (actor: UsesAbilities) => {
          const ability = ConstructASTNodes.as(actor);
          const node = ability.getCurrentNode();
          if (!node || !isSchemaNode(node)) {
            throw new Error('Node is not a SchemaNode');
          }
          const schema = node;
          const field = schema.fields[index];
          if (!field) {
            throw new Error(`Field at index ${index} does not exist`);
          }
          return field.name;
        }),
    };
  }
}

export class ASTNodeDefaultsArray {
  static isEmpty(): Question<Promise<boolean>> {
    return Question.about<boolean>('whether defaults array is empty', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node || !isProfileNode(node)) {
        throw new Error('Node is not a ProfileNode');
      }
      return node.defaults.length === 0;
    });
  }
}

export class IsSchemaNodeType {
  static value(): Question<Promise<boolean>> {
    return Question.about<boolean>('whether the node is a SchemaNode', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return isSchemaNode(node);
    });
  }
}

export class IsFieldNodeType {
  static value(): Question<Promise<boolean>> {
    return Question.about<boolean>('whether the node is a FieldNode', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return isFieldNode(node);
    });
  }
}

export class ASTNodeLocation {
  static exists(): Question<Promise<boolean>> {
    return Question.about<boolean>('whether the node has a location', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return node.location !== undefined;
    });
  }

  static file(): Question<Promise<string>> {
    return Question.about<string>('the location file', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return node.location.file;
    });
  }

  static line(): Question<Promise<number>> {
    return Question.about<number>('the location line', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getCurrentNode();
      if (!node) throw new Error('No current node');
      return node.location.line;
    });
  }
}

export class OriginalSchemaFieldsCount {
  static value(): Question<Promise<number>> {
    return Question.about<number>('the original schema fields count', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getOriginalNode();
      if (!node || !isSchemaNode(node)) {
        throw new Error('Original node is not a SchemaNode');
      }
      return node.fields.length;
    });
  }
}

export class NewSchemaFieldsCount {
  static value(): Question<Promise<number>> {
    return Question.about<number>('the new schema fields count', (actor: UsesAbilities) => {
      const ability = ConstructASTNodes.as(actor);
      const node = ability.getNewNode();
      if (!node || !isSchemaNode(node)) {
        throw new Error('New node is not a SchemaNode');
      }
      return node.fields.length;
    });
  }
}
