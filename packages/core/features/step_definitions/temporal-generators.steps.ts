/**
 * Step definitions for Temporal Generators feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import {
  date,
  timestamp,
  dateRange,
  time,
  datetime,
} from '../../src/generator/generators';

type TemporalField = {
  name: string;
  type: 'date' | 'timestamp' | 'dateRange' | 'time' | 'datetime';
  start?: string;
  end?: string;
  duration?: number;
};

const TEMPORAL_ACTOR = 'QA Tester';

function generatorAbility(actorName: string): UseGenerators {
  return UseGenerators.as(actorCalled(actorName));
}

function generateTemporalRecords(actorName: string, count: number, seed: number): Record<string, unknown>[] {
  const generators = generatorAbility(actorName);
  const fields = generators.getSequence('temporalFields') as TemporalField[];
  const rng = generators.createRNG(seed);

  const records: Record<string, unknown>[] = [];
  for (let index = 0; index < count; index++) {
    const record: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.type === 'date') {
        record[field.name] = date(rng, field.start, field.end);
      } else if (field.type === 'timestamp') {
        record[field.name] = timestamp(rng, field.start, field.end);
      } else if (field.type === 'dateRange') {
        record[field.name] = dateRange(rng, field.duration ?? 86_400_000);
      } else if (field.type === 'time') {
        record[field.name] = time(rng);
      } else {
        record[field.name] = datetime(rng, field.start, field.end);
      }
    }

    records.push(record);
  }

  return records;
}

function recordsFrom(actorName: string, sequenceName: string): Record<string, unknown>[] {
  const values = generatorAbility(actorName).getSequence(sequenceName);
  return values as Record<string, unknown>[];
}

function assertAllRecordsHaveField(records: Record<string, unknown>[], fieldName: string): boolean {
  return records.length > 0 && records.every((record) => fieldName in record);
}

// Background step
Given(
  '{actor} is working with the testdata-ai system',
  (actorName: string) => {
    generatorAbility(actorName);
  },
);

// Schema setup steps
Given(
  '{actor} has a schema with date field:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'eventDate', type: 'date' },
    ]);
  },
);

Given(
  '{actor} has a schema with timestamp field:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'timestamp', type: 'timestamp' },
    ]);
  },
);

Given(
  '{actor} has a schema with dateRange field:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'dateRange', type: 'dateRange', duration: 86_400_000 },
    ]);
  },
);

Given(
  '{actor} has a schema with time field:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'time', type: 'time' },
    ]);
  },
);

Given(
  '{actor} has a schema with datetime field:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'datetime', type: 'datetime' },
    ]);
  },
);

Given(
  '{actor} has a schema with custom date range:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      {
        name: 'occurredOn',
        type: 'date',
        start: '2024-01-01',
        end: '2024-01-31',
      },
    ]);
  },
);

Given(
  '{actor} has a schema with multiple temporal fields:',
  (actorName: string, _schemaSource: string) => {
    generatorAbility(actorName).storeSequence('temporalFields', [
      { name: 'createdDate', type: 'date' },
      { name: 'createdTimestamp', type: 'timestamp' },
      { name: 'scheduledTime', type: 'time' },
      { name: 'lastModified', type: 'datetime' },
    ]);
  },
);

Given(
  '{actor} has a schema with constrained date range:',
  (actorName: string, _schemaSource: string) => {
    const generators = generatorAbility(actorName);
    generators.storeSequence('temporalFields', [
      {
        name: 'reportDate',
        type: 'date',
        start: '2024-07-01',
        end: '2024-09-30',
      },
    ]);
    generators.storeSequence('reportRange', ['2024-07-01', '2024-09-30']);
  },
);

// Generation steps
When(
  '{actor} generates {int} records with seed {int}',
  (actorName: string, count: number, seed: number) => {
    const records = generateTemporalRecords(actorName, count, seed);
    generatorAbility(actorName).storeSequence('records', records);
  },
);

When(
  '{actor} generates another {int} records with seed {int}',
  (actorName: string, count: number, seed: number) => {
    const records = generateTemporalRecords(actorName, count, seed);
    generatorAbility(actorName).storeSequence('records2', records);
  },
);

// Assertion steps - Date field
Then(
  'all records should have eventDate field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'eventDate'), isTrue()),
    );
  },
);

Then(
  'all eventDate values should be between {int} year ago and now',
  async (years: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const now = new Date();
    const lower = new Date(now);
    lower.setFullYear(now.getFullYear() - years);

    const allInRange = records.every((record) => {
      const value = record.eventDate;
      if (!(value instanceof Date)) {
        return false;
      }
      const timestampValue = value.getTime();
      return timestampValue >= lower.getTime() && timestampValue <= now.getTime();
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(allInRange, isTrue()),
    );
  },
);

Then(
  'repeated generation with seed {int} produces identical dates',
  async (_seed: number) => {
    const records1 = recordsFrom(TEMPORAL_ACTOR, 'records');
    const records2 = recordsFrom(TEMPORAL_ACTOR, 'records2');

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(JSON.stringify(records1), equals(JSON.stringify(records2))),
    );
  },
);

// Assertion steps - Timestamp field
Then(
  'all records should have timestamp field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'timestamp'), isTrue()),
    );
  },
);

Then(
  'all timestamp values should be valid Unix timestamps',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const allValid = records.every((record) => {
      const value = record.timestamp;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return false;
      }
      return !Number.isNaN(new Date(value).getTime());
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(allValid, isTrue()),
    );
  },
);

Then(
  'timestamps should be within default range',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const now = Date.now();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const allInRange = records.every((record) => {
      const value = record.timestamp;
      return typeof value === 'number' && value >= oneYearAgo.getTime() && value <= now;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(allInRange, isTrue()),
    );
  },
);

// Assertion steps - DateRange field
Then(
  'all records should have dateRange field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'dateRange'), isTrue()),
    );
  },
);

Then(
  'all dateRange values should have start and end properties',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const validShape = records.every((record) => {
      const value = record.dateRange as { start?: unknown; end?: unknown };
      return (
        value
        && value.start instanceof Date
        && value.end instanceof Date
      );
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(validShape, isTrue()),
    );
  },
);

Then(
  'each dateRange end should equal start plus {int} milliseconds',
  async (duration: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const validDuration = records.every((record) => {
      const value = record.dateRange as { start: Date; end: Date };
      return value.end.getTime() === value.start.getTime() + duration;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(validDuration, isTrue()),
    );
  },
);

// Assertion steps - Time field
Then(
  'all records should have time field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'time'), isTrue()),
    );
  },
);

Then(
  'all time values should match HH:MM:SS format',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const allValid = records.every((record) => {
      const value = record.time;
      return typeof value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(value);
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(allValid, isTrue()),
    );
  },
);

Then(
  'hours should be between {int} and {int}',
  async (min: number, max: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const inRange = records.every((record) => {
      const value = record.time;
      if (typeof value !== 'string') {
        return false;
      }
      const [hours] = value.split(':').map(Number);
      return hours >= min && hours <= max;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(inRange, isTrue()),
    );
  },
);

Then(
  'minutes should be between {int} and {int}',
  async (min: number, max: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const inRange = records.every((record) => {
      const value = record.time;
      if (typeof value !== 'string') {
        return false;
      }
      const [, minutes] = value.split(':').map(Number);
      return minutes >= min && minutes <= max;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(inRange, isTrue()),
    );
  },
);

Then(
  'seconds should be between {int} and {int}',
  async (min: number, max: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const inRange = records.every((record) => {
      const value = record.time;
      if (typeof value !== 'string') {
        return false;
      }
      const [, , seconds] = value.split(':').map(Number);
      return seconds >= min && seconds <= max;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(inRange, isTrue()),
    );
  },
);

// Assertion steps - Datetime field
Then(
  'all records should have datetime field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'datetime'), isTrue()),
    );
  },
);

Then(
  'all datetime values should be valid ISO 8601 format',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const valid = records.every((record) => {
      const value = record.datetime;
      return typeof value === 'string' && isoRegex.test(value);
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

Then(
  'datetime values should be parseable as Date objects',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const parseable = records.every((record) => {
      const value = record.datetime;
      return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(parseable, isTrue()),
    );
  },
);

// Assertion steps - Custom range
Then(
  'all records should have occurredOn field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'occurredOn'), isTrue()),
    );
  },
);

Then(
  'all occurredOn values should be in January {int}',
  async (year: number) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const inJanuary = records.every((record) => {
      const value = record.occurredOn;
      return value instanceof Date && value.getUTCFullYear() === year && value.getUTCMonth() === 0;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(inJanuary, isTrue()),
    );
  },
);

// Assertion steps - Determinism
Then(
  'both generations should produce identical temporal data',
  async () => {
    const records1 = recordsFrom(TEMPORAL_ACTOR, 'records');
    const records2 = recordsFrom(TEMPORAL_ACTOR, 'records2');

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(JSON.stringify(records1), equals(JSON.stringify(records2))),
    );
  },
);

// Assertion steps - Range validation
Then(
  'all records should have reportDate field',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(assertAllRecordsHaveField(records, 'reportDate'), isTrue()),
    );
  },
);

Then(
  'all reportDate values should be between {word} and {word}',
  async (startDate: string, endDate: string) => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const inRange = records.every((record) => {
      const value = record.reportDate;
      return value instanceof Date && value.getTime() >= start && value.getTime() <= end;
    });

    generatorAbility(TEMPORAL_ACTOR).storeSequence('reportRange', [startDate, endDate]);

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(inRange, isTrue()),
    );
  },
);

Then(
  'no reportDate should be outside the specified range',
  async () => {
    const records = recordsFrom(TEMPORAL_ACTOR, 'records');
    const [startDate, endDate] = generatorAbility(TEMPORAL_ACTOR).getSequence('reportRange') as string[];
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const noneOutside = records.every((record) => {
      const value = record.reportDate;
      return value instanceof Date && value.getTime() >= start && value.getTime() <= end;
    });

    await actorCalled(TEMPORAL_ACTOR).attemptsTo(
      Ensure.that(noneOutside, isTrue()),
    );
  },
);
