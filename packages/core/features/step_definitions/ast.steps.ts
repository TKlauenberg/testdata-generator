import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { ConstructASTNodes } from '../support/abilities/ConstructASTNodes';
import {
  ConstructProgramNode,
  ConstructSchemaNode,
  ConstructFieldNode,
  ConstructProfileNode,
  AddFieldImmutably,
} from '../support/tasks/ASTTasks';
import {
  ASTNodeKind,
  ASTNodeName,
  ASTNodeType,
  ASTNodeGenerator,
  ASTNodeUniqueConstraint,
  ASTNodeDeclarationsArray,
  ASTNodeFieldsArray,
  ASTNodeDefaultsArray,
  IsSchemaNodeType,
  IsFieldNodeType,
  ASTNodeLocation,
  OriginalSchemaFieldsCount,
  NewSchemaFieldsCount,
} from '../support/questions/ASTQuestions';

Given('{actor} can construct AST nodes', (actorName: string) => {
  actorCalled(actorName).whoCan(ConstructASTNodes.asQATester());
});

When(
  '{actor} constructs a Program node with {int} declarations',
  async (actorName: string, count: number) => {
    await actorCalled(actorName).attemptsTo(ConstructProgramNode.with(count));
  },
);

When(
  '{actor} constructs a SchemaNode named {string} with {int} fields',
  async (actorName: string, name: string, count: number) => {
    await actorCalled(actorName).attemptsTo(ConstructSchemaNode.named(name).withFields(count));
  },
);

When(
  '{actor} constructs a FieldNode named {string} with type {string} and generator {string}',
  async (actorName: string, name: string, type: string, generator: string) => {
    await actorCalled(actorName).attemptsTo(
      ConstructFieldNode.named(name).withType(type).andGenerator(generator),
    );
  },
);

When(
  '{actor} constructs a FieldNode named {string} with uniqueness constraint',
  async (actorName: string, name: string) => {
    await actorCalled(actorName).attemptsTo(ConstructFieldNode.named(name).withUniqueness());
  },
);

When(
  '{actor} constructs a SchemaNode named {string} with fields:',
  async (actorName: string, schemaName: string, dataTable: DataTable) => {
    const actor = actorCalled(actorName);
    const ability = ConstructASTNodes.as(actor);
    const rows = dataTable.hashes();

    const fields = rows.map((row) => {
      return ability.constructFieldNode(row.name, row.type, row.generator);
    });

    await actor.attemptsTo(ConstructSchemaNode.named(schemaName).withFieldsList(fields));
  },
);

When(
  '{actor} constructs a ProfileNode named {string} with {int} defaults',
  async (actorName: string, name: string, count: number) => {
    await actorCalled(actorName).attemptsTo(ConstructProfileNode.named(name).withDefaults(count));
  },
);

Given(
  '{actor} has constructed a SchemaNode named {string}',
  async (actorName: string, name: string) => {
    await actorCalled(actorName)
      .whoCan(ConstructASTNodes.asQATester())
      .attemptsTo(ConstructSchemaNode.named(name).withFields(0));
  },
);

Given(
  '{actor} has constructed a FieldNode named {string}',
  async (actorName: string, name: string) => {
    await actorCalled(actorName)
      .whoCan(ConstructASTNodes.asQATester())
      .attemptsTo(ConstructFieldNode.named(name).withType('string').withoutGenerator());
  },
);

Given(
  '{actor} has constructed a SchemaNode named {string} with {int} field',
  async (actorName: string, name: string, _count: number) => {
    const actor = actorCalled(actorName).whoCan(ConstructASTNodes.asQATester());
    const ability = ConstructASTNodes.as(actor);
    const field = ability.constructFieldNode('id', 'string', 'uuid');
    await actor.attemptsTo(ConstructSchemaNode.named(name).withFieldsList([field]));
  },
);

When('{actor} checks if the node is a SchemaNode', async (_actorName: string) => {
  // The actual type guard check happens in the Then step
});

When('{actor} checks if the node is a FieldNode', async (_actorName: string) => {
  // The actual type guard check happens in the Then step
});

When('{actor} constructs a SchemaNode named {string}', async (actorName: string, name: string) => {
  await actorCalled(actorName).attemptsTo(ConstructSchemaNode.named(name).withFields(0));
});

When('{actor} creates a new schema by adding a field immutably', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(AddFieldImmutably.toSchema());
});

Then(
  '{actor} should see the node has kind {string}',
  async (actorName: string, expectedKind: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeKind.value(), equals(expectedKind)),
    );
  },
);

Then(
  '{actor} should see the node has name {string}',
  async (actorName: string, expectedName: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeName.value(), equals(expectedName)),
    );
  },
);

Then(
  '{actor} should see the node has type {string}',
  async (actorName: string, expectedType: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeType.value(), equals(expectedType)),
    );
  },
);

Then(
  '{actor} should see the node has generator {string}',
  async (actorName: string, expectedGenerator: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeGenerator.value(), equals(expectedGenerator)),
    );
  },
);

Then('{actor} should see the node has unique constraint set to true', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(ASTNodeUniqueConstraint.value(), equals(true)),
  );
});

Then('{actor} should see the node has an empty declarations array', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(ASTNodeDeclarationsArray.isEmpty(), equals(true)),
  );
});

Then('{actor} should see the node has an empty fields array', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(ASTNodeFieldsArray.isEmpty(), equals(true)),
  );
});

Then('{actor} should see the node has an empty defaults array', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(ASTNodeDefaultsArray.isEmpty(), equals(true)),
  );
});

Then(
  '{actor} should see the node has {int} fields',
  async (actorName: string, expectedCount: number) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeFieldsArray.count(), equals(expectedCount)),
    );
  },
);

Then(
  '{actor} should see field {int} has name {string}',
  async (actorName: string, index: number, expectedName: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeFieldsArray.fieldAt(index).name(), equals(expectedName)),
    );
  },
);

Then('{actor} should see the SchemaNode type guard returns true', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(IsSchemaNodeType.value(), equals(true)),
  );
});

Then('{actor} should see the SchemaNode type guard returns false', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(IsSchemaNodeType.value(), equals(false)),
  );
});

Then('{actor} should see the FieldNode type guard returns true', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(Ensure.eventually(IsFieldNodeType.value(), equals(true)));
});

Then('{actor} should see the node has a location property', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Ensure.eventually(ASTNodeLocation.exists(), equals(true)),
  );
});

Then(
  '{actor} should see the location has file {string}',
  async (actorName: string, expectedFile: string) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeLocation.file(), equals(expectedFile)),
    );
  },
);

Then(
  '{actor} should see the location has line {int}',
  async (actorName: string, expectedLine: number) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(ASTNodeLocation.line(), equals(expectedLine)),
    );
  },
);

Then(
  '{actor} should see the original schema still has {int} field',
  async (actorName: string, expectedCount: number) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(OriginalSchemaFieldsCount.value(), equals(expectedCount)),
    );
  },
);

Then(
  '{actor} should see the new schema has {int} fields',
  async (actorName: string, expectedCount: number) => {
    await actorCalled(actorName).attemptsTo(
      Ensure.eventually(NewSchemaFieldsCount.value(), equals(expectedCount)),
    );
  },
);
