/**
 * Tasks for Record Generation scenarios
 */

import { Interaction, Task, Actor, type UsesAbilities } from '@serenity-js/core';
import { UseRecordGeneration } from '../abilities/UseRecordGeneration';
import { generateRecord, generate } from '../../../src/generator/generator';
import type { ValidatedSchema, ValidatedField, ValidatedProgram } from '../../../src/analyzer/types';
import type { FieldNode, SchemaNode, GeneratorParameter } from '../../../src/parser/ast';
import type { SourceLocation } from '../../../src/common/diagnostic';
import { SymbolTable } from '../../../src/analyzer/symbolTable';

// Type for interactions that can be chained with builder methods
type InteractionWithBuilder = Interaction & {
  withFieldsFromTable: (dataTable: string[][]) => Interaction;
};

// Mock location for testing
const mockLocation: SourceLocation = {
  file: 'test.td',
  line: 1,
  column: 1,
  length: 10,
};

/**
 * Helper to create mock ValidatedSchema for testing
 */
function createMockSchema(
  fields: Array<{
    name: string;
    type: string;
    params?: Array<{ name: string; value: unknown }>;
  }>
): ValidatedSchema {
  const fieldNodes: FieldNode[] = fields.map(
    (f): FieldNode => ({
      kind: 'field',
      name: f.name,
      type: f.type,
      generator: {
        name: f.type,
        parameters: (f.params ?? []) as GeneratorParameter[],
      },
      location: mockLocation,
    })
  );

  const schemaNode: SchemaNode = {
    kind: 'schema',
    name: 'TestSchema',
    fields: fieldNodes,
    location: mockLocation,
  };

  const validatedFields: ValidatedField[] = fields.map(
    (f, idx): ValidatedField => ({
      node: fieldNodes[idx],
      resolvedType: f.type,
      resolvedGenerator: f.type,
      templateReferences: [],
    })
  );

  return {
    node: schemaNode,
    fields: validatedFields,
    dependencies: new Set(),
    sortOrder: 0,
  };
}


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
      (actor) => {
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

  public static forRecordType(recordType: string): Interaction {
    return Interaction.where(`#actor creates schema for record type "${recordType}"`, (actor:  UsesAbilities) => {
      // Stub implementation
      throw new Error('forRecordType is not yet implemented');
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

/**
 * Create ValidatedProgram with schema(s) for streaming tests
 */
export class CreateProgramWithSchema {
  public static named(schemaName: string): InteractionWithBuilder {
    const interaction = Interaction.where(
      `#actor creates program with schema "${schemaName}"`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);

        // Create a simple schema with id and name fields
        const schema = createMockSchema([
          { name: 'id', type: 'int', params: [{ name: 'min', value: 1 }, { name: 'max', value: 1000 }] },
          { name: 'name', type: 'string', params: [{ name: 'length', value: 10 }] },
        ]);

        const mockLocation: SourceLocation = {
          file: 'test.td',
          line: 1,
          column: 1,
          length: 10,
        };

        const program: ValidatedProgram = {
          ast: {
            kind: 'program',
            declarations: [],
            location: mockLocation,
          },
          symbolTable: new SymbolTable(),
          schemas: new Map([[schemaName, schema]]),
          metadata: {
            analyzedAt: new Date(),
            schemaCount: 1,
            totalFields: 2,
          },
        };

        ability.setProgram(program);
      },
    );

    // Add builder method for step definitions
    (interaction as any).withFieldsFromTable = (dataTable: string[][]) => {
      return Interaction.where(
        `#actor creates program with schema "${schemaName}" with custom fields`,
        (actor) => {
          const ability = UseRecordGeneration.as(actor);

          const mockLocation: SourceLocation = {
            file: 'test.td',
            line: 1,
            column: 1,
            length: 10,
          };

          const fieldNodes: FieldNode[] = dataTable.slice(1).map((row) => {
            const name = row[0];
            const type = row[1];
            const params: { name: string; value: string | number }[] = [];

            for (let i = 2; i < row.length; i++) {
              const headerRow = dataTable[0];
              const paramName = headerRow[i];
              if (paramName) {
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
            name: schemaName,
            fields: fieldNodes,
            location: mockLocation,
          };

          const validatedFields: ValidatedField[] = fieldNodes.map(
            (fieldNode): ValidatedField => ({
              node: fieldNode,
              resolvedType: fieldNode.type,
              resolvedGenerator: fieldNode.type,
              templateReferences: [],
            })
          );

          const schema: ValidatedSchema = {
            node: schemaNode,
            fields: validatedFields,
            dependencies: new Set(),
            sortOrder: 0,
          };

          const program: ValidatedProgram = {
            ast: {
              kind: 'program',
              declarations: [schemaNode],
              location: mockLocation,
            },
            symbolTable: new SymbolTable(),
            schemas: new Map([[schemaName, schema]]),
            metadata: {
              analyzedAt: new Date(),
              schemaCount: 1,
              totalFields: fieldNodes.length,
            },
          };

          ability.setProgram(program);
        },
      );
    };

    return interaction as InteractionWithBuilder;
  }

  public static withMultipleSchemas(count: number): Interaction {
    return this.withCount(count);
  }

  public static withCount(count: number): Interaction {
    return Interaction.where(
      `#actor creates program with ${count} schemas`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);

        const schemas = new Map<string, ValidatedSchema>();

        if (count >= 1) {
          const userSchema = createMockSchema([
            { name: 'id', type: 'int', params: [] },
          ]);
          schemas.set('User', userSchema);
        }

        if (count >= 2) {
          const orderSchema = createMockSchema([
            { name: 'orderId', type: 'int', params: [] },
            { name: 'total', type: 'float', params: [] },
          ]);
          schemas.set('Order', orderSchema);
        }

        const mockLocation: SourceLocation = {
          file: 'test.td',
          line: 1,
          column: 1,
          length: 10,
        };

        const program: ValidatedProgram = {
          ast: {
            kind: 'program',
            declarations: [],
            location: mockLocation,
          },
          symbolTable: new SymbolTable(),
          schemas,
          metadata: {
            analyzedAt: new Date(),
            schemaCount: count,
            totalFields: count === 1 ? 1 : 3,
          },
        };

        ability.setProgram(program);
      },
    );
  }
}

/**
 * Generate records using streaming (AsyncIterable)
 */
export class GenerateRecordsStreaming {
  public static withCount(count: number): Interaction {
    return Interaction.where(
      `#actor generates ${count} records using streaming`,
      async (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const program = ability.getProgram();

        if (!program) throw new Error('No program set');

        const records = [];
        for await (const record of generate(program, { count })) {
          records.push(record);
        }

        ability.storeStreamingRecords(records);
      },
    );
  }
}

/**
 * Generate records with seed using streaming
 */
export class GenerateRecordsStreamingWithSeed extends Task {
  private constructor(
    private readonly count?: number,
    private readonly seed?: number,
    private readonly storeName: string = 'records1'
  ) {
    super(`Generate ${count} records with seed ${seed} using streaming`);
  }

  public static withCount(count: number): GenerateRecordsStreamingWithSeed {
    return new GenerateRecordsStreamingWithSeed(count);
  }

  public andSeed(seed: number): GenerateRecordsStreamingWithSeed {
    return new GenerateRecordsStreamingWithSeed(this.count, seed, this.storeName);
  }

  // Implement performAs from Task
  public async performAs(actor: Actor): Promise<void> {
    const ability = UseRecordGeneration.as(actor);
    const program = ability.getProgram();

    if (!program) throw new Error('No program set');
    if (this.count === undefined || this.seed === undefined) {
      throw new Error('Count and seed must be set');
    }

    const records = [];
    for await (const record of generate(program, { count: this.count, seed: this.seed })) {
      records.push(record);
    }

    ability.storeStreamingRecordsNamed(this.storeName, records);
  }

  public asSecondSequence(): Interaction {
    return Interaction.where(
      `#actor generates ${this.count} records with seed ${this.seed} as second sequence`,
      async (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const program = ability.getProgram();

        if (!program) throw new Error('No program set');
        if (this.count === undefined || this.seed === undefined) {
          throw new Error('Count and seed must be set');
        }

        const records = [];
        for await (const record of generate(program, { count: this.count, seed: this.seed })) {
          records.push(record);
        }

        ability.storeStreamingRecordsNamed('records2', records);
      },
    );
  }

  public static withCountAndSeed(
    count: number,
    seed: number,
    storeName: string = 'records1'
  ): Interaction {
    return Interaction.where(
      `#actor generates ${count} records with seed ${seed}`,
      async (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const program = ability.getProgram();

        if (!program) throw new Error('No program set');

        const records = [];
        for await (const record of generate(program, { count, seed })) {
          records.push(record);
        }

        ability.storeStreamingRecordsNamed(storeName, records);
      },
    );
  }
}

/**
 * Start streaming generation (for early termination test)
 */
export class StartStreamingGeneration {
  public static withCount(count: number): Interaction {
    return Interaction.where(
      `#actor starts generating ${count} records`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const program = ability.getProgram();

        if (!program) throw new Error('No program set');

        // Store the generator for later use
        ability.storeGenerator(generate(program, { count }));
      },
    );
  }
}

/**
 * Stop streaming after N records (test early termination)
 */
export class StopStreamingAfter {
  public static recordCount(stopCount: number): Interaction {
    return this.count(stopCount);
  }

  public static count(stopCount: number): Interaction {
    return Interaction.where(
      `#actor stops after ${stopCount} records`,
      async (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const generator = ability.getGenerator();

        if (!generator) throw new Error('No generator stored');

        const records = [];
        let count = 0;
        for await (const record of generator) {
          records.push(record);
          count++;
          if (count >= stopCount) break;
        }

        ability.storeStreamingRecords(records);
      },
    );
  }
}
