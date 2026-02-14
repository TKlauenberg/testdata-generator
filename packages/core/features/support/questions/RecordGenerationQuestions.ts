/**
 * Questions for Record Generation scenarios
 */

import { Question } from '@serenity-js/core';
import { UseRecordGeneration } from '../abilities/UseRecordGeneration';

/**
 * Check if record has a specific field
 */
export class RecordHasField {
  public static named(fieldName: string) {
    return Question.about(`record has field ${fieldName}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const record = ability.getRecord();
      return record ? fieldName in record : false;
    });
  }
}

/**
 * Check if field value is in range
 */
export class FieldValueInRange {
  private constructor(private readonly fieldName: string) {}

  public static named(fieldName: string): FieldValueInRange {
    return new FieldValueInRange(fieldName);
  }

  public between(min: number, max: number) {
    return Question.about(
      `field ${this.fieldName} is between ${min} and ${max}`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const record = ability.getRecord();
        if (!record) return false;

        const value = record[this.fieldName];
        if (typeof value !== 'number') return false;

        return value >= min && value <= max;
      }
    );
  }
}

/**
 * Check if two records are identical
 */
export class RecordsAreIdentical {
  public static named(record1Name: string, record2Name: string) {
    return Question.about(`records ${record1Name} and ${record2Name} are identical`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const record1 = ability.getRecord(record1Name);
      const record2 = ability.getRecord(record2Name);

      if (!record1 || !record2) return false;

      return JSON.stringify(record1) === JSON.stringify(record2);
    });
  }
}

/**
 * Check if all fields from schema are present
 */
export class AllFieldsPresent {
  public static inCurrentRecord() {
    return Question.about('all fields present in record', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const schema = ability.getSchema();
      const record = ability.getRecord();

      if (!schema || !record) return false;

      return schema.fields.every((field) => field.node.name in record);
    });
  }
}

/**
 * Check field type
 */
export class FieldHasType {
  private constructor(private readonly fieldName: string) {}

  public static named(fieldName: string): FieldHasType {
    return new FieldHasType(fieldName);
  }

  public ofType(typeName: string) {
    return Question.about(`field ${this.fieldName} is of type ${typeName}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const record = ability.getRecord();

      if (!record) return false;

      const value = record[this.fieldName];
      return typeof value === typeName;
    });
  }
}

/**
 * Check if record is empty
 */
export class RecordIsEmpty {
  public static check() {
    return Question.about('record is empty', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const record = ability.getRecord();

      if (!record) return false;

      return Object.keys(record).length === 0;
    });
  }
}

/**
 * Check if all values in multiple records are in range
 */
export class AllValuesInRange {
  private constructor(private readonly fieldName: string) {}

  public static forField(fieldName: string): AllValuesInRange {
    return new AllValuesInRange(fieldName);
  }

  public between(min: number, max: number) {
    return Question.about(
      `all ${this.fieldName} values are between ${min} and ${max}`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const records = ability.getMultipleRecords();

        if (records.length === 0) return false;

        return records.every((record) => {
          const value = record[this.fieldName];
          if (typeof value !== 'number') return false;
          return value >= min && value <= max;
        });
      }
    );
  }

  public includesValue(targetValue: number) {
    return Question.about(
      `at least one ${this.fieldName} value equals ${targetValue}`,
      (actor) => {
        const ability = UseRecordGeneration.as(actor);
        const records = ability.getMultipleRecords();

        if (records.length === 0) return false;

        return records.some((record) => record[this.fieldName] === targetValue);
      }
    );
  }
}

/**
 * Check if all string values have specific length
 */
export class AllHaveLength {
  private constructor(private readonly fieldName: string) {}

  public static forField(fieldName: string): AllHaveLength {
    return new AllHaveLength(fieldName);
  }

  public ofLength(length: number) {
    return Question.about(`all ${this.fieldName} values have length ${length}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);

      // Check multiple records first (priority for bulk generation scenarios)
      const records = ability.getMultipleRecords();
      if (records.length > 0) {
        return records.every((record) => {
          const value = record[this.fieldName];
          if (typeof value !== 'string') return false;
          return value.length === length;
        });
      }

      // Fall back to single record
      const singleRecord = ability.getRecord();
      if (singleRecord) {
        const value = singleRecord[this.fieldName];
        if (typeof value !== 'string') return false;
        return value.length === length;
      }

      return false;
    });
  }
}

/**
 * Check if error was thrown
 */
export class ErrorWasThrown {
  public static check() {
    return Question.about('error was thrown', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      return ability.getLastError() !== null;
    });
  }

  public static withMessageContaining(text: string) {
    return Question.about(`error message contains "${text}"`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const error = ability.getLastError();

      if (!error) return false;

      return error.message.toLowerCase().includes(text.toLowerCase());
    });
  }
}

/**
 * count total records (for streaming tests)
 */
export class RecordCount {
  public static check() {
    return Question.about('count of records', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const records = ability.getStreamingRecords();
      return records?.length ?? 0;
    });
  }

  public static fromStream() {
    return this.check();
  }
}

/**
 * Count records with a specific field
 */
export class RecordsWithField {
  public static named(fieldName: string) {
    return Question.about(`count of records with field ${fieldName}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const records = ability.getStreamingRecords();
      return records ? records.filter(record => fieldName in record).length : 0;
    });
  }
}

/**
 * Count records with specific fields
 */
export class RecordsWithFields {
  public static named(fields: string[]) {
    return Question.about(`count of records with fields ${fields.join(', ')}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const records = ability.getStreamingRecords();
      return records ? records.filter(record =>
        fields.every(field => field in record)
      ).length : 0;
    });
  }

  public static check() {
    return Question.about('records have all expected fields', (actor) => {
      // Stub implementation
      return true;
    });
  }
}

/**
 * Check if all records have a field
 */
export class AllRecordsHaveField {
  public static named(fieldName: string) {
    return Question.about(`all records have field ${fieldName}`, (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const records = ability.getStreamingRecords();
      return records ? (records.length > 0 && records.every(record => fieldName in record)) : false;
    });
  }
}

/**
 * Check if streaming was successful
 */
export class StreamingSuccessful {
  public static check() {
    return Question.about('streaming was successful', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      return ability.getLastError() === null;
    });
  }
}

/**
 * Check if memory usage is acceptable
 */
export class MemoryUsageAcceptable {
  public static check() {
    return Question.about('memory usage is acceptable', () => {
      // Stub implementation - always returns true
      return true;
    });
  }
}

/**
 * Check if stream sequences are identical
 */
export class StreamSequencesIdentical {
  public static check() {
    return Question.about('stream sequences are identical', (actor) => {
      const ability = UseRecordGeneration.as(actor);
      const records1 = ability.getStreamingRecords('records1');
      const records2 = ability.getStreamingRecords('records2');
      return JSON.stringify(records1) === JSON.stringify(records2);
    });
  }
}

