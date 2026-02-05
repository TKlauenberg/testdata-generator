/**
 * Tasks for Record Generation scenarios
 */

import { Interaction, type UsesAbilities } from '@serenity-js/core';
import { UseRecordGeneration } from '../abilities/UseRecordGeneration';
import { generateRecord } from '../../../src/generator/generator';
import type { ValidatedSchema, ValidatedField } from '../../../src/analyzer/types';
import type { FieldNode, SchemaNode, GeneratorParameter } from '../../../src/parser/ast';
import type { SourceLocation } from '../../../src/common/diagnostic';

// Mock location for testing
const mockLocation: SourceLocation = {
  file: 'test.td',
  line: 1,
  column: 1,
  length: 10,
};

/**
 * Parse table row into field parameters
 */
function parseFieldParams(params: string): Array<{ name: string; value: unknown }> {
  if (!params || params.trim() === '') return [];

  return params.split(',').map((param) => {
    const [name, value] = param.trim().split('=');
    // Try to parse as number first
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return { name, value: numValue };
    }
    return { name, value };
  });
}

/**
 * Create ValidatedSchema from table data
 */
export class CreateSchema {
  public static fromTable(table: string[][]): Interaction {
    return Interaction.where(
      `#actor creates schema from table`,
      async (actor) => {
        const ability = UseRecordGeneration.as(actor);

        // Skip header row
        const fieldRows = table.slice(1);

        const fieldNodes: FieldNode[] = fieldRows.map((row) => {
          const [name, type, ...paramCols] = row;

          // Parse parameters from table columns
          const params: Array<{ name: string; value: unknown }> = [];

          // Handle both explicit params column and named columns (min, max, etc.)
          if (table[0].includes('params')) {
            const paramsIdx = table[0].indexOf('params');
            if (paramCols[paramsIdx - 2]) {
              params.push(...parseFieldParams(paramCols[paramsIdx - 2]));
            }
          } else {
            // Named parameter columns (min, max, length, etc.)
            for (let i = 2; i < table[0].length; i++) {
              const paramName = table[0][i];
              const paramValue = row[i];
              if (paramValue && paramValue.trim() !== '') {
                const numValue = parseFloat(paramValue);
                params.push({
                  name: paramName,
                  value: isNaN(numValue) ? paramValue : numValue,
                });
              }
            }
          }

          return {
            kind: 'field' as const,
            name,
            type,
            generator: {
              name: type,
              parameters: params as GeneratorParameter[],
            },
            location: mockLocation,
          };
        });

        const schemaNode: SchemaNode = {
          kind: 'schema',
          name: 'TestSchema',
          fields: fieldNodes,
          location: mockLocation,
        };

        const validatedFields: ValidatedField[] = fieldNodes.map(
          (node): ValidatedField => ({
            node,
            resolvedType: node.type,
            resolvedGenerator: node.type,
            templateReferences: [],
          })
        );

        const schema: ValidatedSchema = {
          node: schemaNode,
          fields: validatedFields,
          dependencies: new Set(),
          sortOrder: 0,
        };

        ability.setSchema(schema);
      }
    );
  }

  public static empty(): Interaction {
    return Interaction.where(`#actor creates empty schema`,  (actor: UsesAbilities) => {
      const ability = UseRecordGeneration.as(actor);

      const schemaNode: SchemaNode = {
        kind: 'schema',
        name: 'EmptySchema',
        fields: [],
        location: mockLocation,
      };

      const schema: ValidatedSchema = {
        node: schemaNode,
        fields: [],
        dependencies: new Set(),
        sortOrder: 0,
      };

      ability.setSchema(schema);
    });
  }
}

/**
 * Create ValidatedSchema with single field (fluent builder)
 */
export class CreateSchemaWithField {
  private constructor(
    private readonly fieldName: string,
    private readonly fieldType: string,
    private readonly params: Array<{ name: string; value: unknown }>
  ) {}

  public static named(fieldName: string): CreateSchemaWithField {
    return new CreateSchemaWithField(fieldName, '', []);
  }

  public ofType(type: string): CreateSchemaWithField {
    return new CreateSchemaWithField(this.fieldName, type, this.params);
  }

  public withMin(min: number): CreateSchemaWithField {
    return new CreateSchemaWithField(this.fieldName, this.fieldType, [
      ...this.params,
      { name: 'min', value: min },
    ]);
  }

  public withMax(max: number): Interaction {
    const params = [...this.params, { name: 'max', value: max }];
    return this._buildWithParams(params);
  }

  public withLength(length: number): Interaction {
    const params = [...this.params, { name: 'length', value: length }];
    return this._buildWithParams(params);
  }

  public build(): Interaction {
    return this._buildWithParams(this.params);
  }

  private _buildWithParams(params: Array<{ name: string; value: unknown }>): Interaction {
    return Interaction.where(
      `#actor creates schema with field ${this.fieldName}`,
       (actor: UsesAbilities) => {
        const ability = UseRecordGeneration.as(actor);

        const fieldNode: FieldNode = {
          kind: 'field',
          name: this.fieldName,
          type: this.fieldType,
          generator: {
            name: this.fieldType,
            parameters: params as GeneratorParameter[],
          },
          location: mockLocation,
        };

        const schemaNode: SchemaNode = {
          kind: 'schema',
          name: 'TestSchema',
          fields: [fieldNode],
          location: mockLocation,
        };

        const validatedField: ValidatedField = {
          node: fieldNode,
          resolvedType: this.fieldType,
          resolvedGenerator: this.fieldType,
          templateReferences: [],
        };

        const schema: ValidatedSchema = {
          node: schemaNode,
          fields: [validatedField],
          dependencies: new Set(),
          sortOrder: 0,
        };

        ability.setSchema(schema);
      }
    );
  }
}

/**
 * Create RNG with seed
 */
export class CreateRNG {
  public static withSeed(seed: number, name: string = 'default'): Interaction {
    return Interaction.where(`#actor creates RNG with seed ${seed}`,  (actor: UsesAbilities) => {
      const ability = UseRecordGeneration.as(actor);
      ability.createRNG(seed, name);
    });
  }
}

/**
 * Generate record from current schema
 */
export class GenerateRecord {
  public static fromCurrentSchema(
    recordName: string = 'record1',
    rngName: string = 'default'
  ): Interaction {
    return Interaction.where(`#actor generates record`,  (actor: UsesAbilities) => {
      const ability = UseRecordGeneration.as(actor);
      const schema = ability.getSchema();
      const rng = ability.getRNG(rngName);

      if (!schema) throw new Error('No schema set');
      if (!rng) throw new Error('No RNG set');

      const record = generateRecord(schema, rng);
      ability.storeRecord(recordName, record);
    });
  }
}

/**
 * Generate multiple records
 */
export class GenerateMultipleRecords {
  public static count(count: number): Interaction {
    return Interaction.where(`#actor generates ${count} records`,  (actor: UsesAbilities) => {
      const ability = UseRecordGeneration.as(actor);
      const schema = ability.getSchema();
      const rng = ability.getRNG();

      if (!schema) throw new Error('No schema set');
      if (!rng) throw new Error('No RNG set');

      const records = Array.from({ length: count }, () => generateRecord(schema, rng));
      ability.storeMultipleRecords(records);
    });
  }
}

/**
 * Try to generate record (catch errors)
 */
export class TryGenerateRecord {
  public static fromCurrentSchema(): Interaction {
    return Interaction.where(`#actor tries to generate record`,  (actor: UsesAbilities) => {
      const ability = UseRecordGeneration.as(actor);
      const schema = ability.getSchema();
      const rng = ability.getRNG();

      if (!schema) throw new Error('No schema set');
      if (!rng) throw new Error('No RNG set');

      try {
        const record = generateRecord(schema, rng);
        ability.storeRecord('record1', record);
      } catch (error) {
        ability.storeError(error as Error);
      }
    });
  }
}
