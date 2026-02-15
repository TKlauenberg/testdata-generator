import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import { UseGenerateDataAPI } from '../support/abilities/UseGenerateDataAPI';
import { pick, weightedPick, type WeightedOption } from '../../src/generator/generators/selection';

type SelectionSnapshot = {
  pickValue: string;
  weightedValue: string;
};

function generatorAbility(actorName: string): UseGenerators {
  return UseGenerators.as(actorCalled(actorName));
}

function parseArray(arrayString: string): string[] {
  // Parse ["a", "b", "c"] format
  const match = arrayString.match(/\[(.*)\]/);
  if (!match) {
    throw new Error(`Invalid array format: ${arrayString}`);
  }
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^["']|["']$/g, ''));
}

function parseWeightedOptions(table: DataTable): WeightedOption<string>[] {
  const rows = table.hashes();
  return rows.map((row) => ({
    value: row.value,
    weight: Number(row.weight),
  }));
}

Given('QATester uses selection generators', () => {
  generatorAbility('QATester');
});

When(
  '{word} picks from array {string} with seed {int}',
  (actorName: string, arrayString: string, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const array = parseArray(arrayString);
    const values: string[] = [];

    for (let i = 0; i < 20; i++) {
      values.push(pick(rng, array));
    }

    generatorAbility(actorName).storeSequence('pickSequence1', values);
    generatorAbility(actorName).storeSequence('originalArray', array);
  },
);

When(
  '{word} picks from array {string} with seed {int} again',
  (actorName: string, arrayString: string, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const array = parseArray(arrayString);
    const values: string[] = [];

    for (let i = 0; i < 20; i++) {
      values.push(pick(rng, array));
    }

    generatorAbility(actorName).storeSequence('pickSequence2', values);
  },
);

Then('both pick sequences should be identical', async () => {
  const first = generatorAbility('QATester').getSequence('pickSequence1');
  const second = generatorAbility('QATester').getSequence('pickSequence2');

  await actorCalled('QATester').attemptsTo(
    Ensure.that(JSON.stringify(first), equals(JSON.stringify(second))),
  );
});

Then('all picked values should be from the original array', async () => {
  const values = generatorAbility('QATester').getSequence('pickSequence1') as string[];
  const array = generatorAbility('QATester').getSequence('originalArray') as string[];
  const allValid = values.every((value) => array.includes(value));

  await actorCalled('QATester').attemptsTo(Ensure.that(allValid, isTrue()));
});

When(
  '{word} picks from array {string} {int} times with seed {int}',
  (actorName: string, arrayString: string, count: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const array = parseArray(arrayString);
    const values: string[] = [];

    for (let i = 0; i < count; i++) {
      values.push(pick(rng, array));
    }

    generatorAbility(actorName).storeSequence('pickDistribution', values);
    generatorAbility(actorName).storeSequence('distributionArray', array);
  },
);

Then('each element should be selected approximately {int}% of the time', async (expectedPercent: number) => {
  const values = generatorAbility('QATester').getSequence('pickDistribution') as string[];
  const array = generatorAbility('QATester').getSequence('distributionArray') as string[];

  const counts: Record<string, number> = {};
  for (const item of array) {
    counts[item] = 0;
  }
  for (const value of values) {
    counts[value]++;
  }

  const expectedCount = (values.length * expectedPercent) / 100;
  const tolerance = expectedCount * 0.2; // 20% tolerance for statistical variation

  const valid = Object.values(counts).every((count) => Math.abs(count - expectedCount) < tolerance);

  await actorCalled('QATester').attemptsTo(Ensure.that(valid, isTrue()));
});

When('{word} uses weighted options with seed {int}:', (actorName: string, seed: number, table: DataTable) => {
  const rng = generatorAbility(actorName).createRNG(seed);
  const options = parseWeightedOptions(table);
  const values: string[] = [];

  for (let i = 0; i < 20; i++) {
    values.push(weightedPick(rng, options));
  }

  generatorAbility(actorName).storeSequence('weightedSequence1', values);
  generatorAbility(actorName).storeSequence('weightedOptions', options);
});

When(
  '{word} uses weighted options with seed {int} again:',
  (actorName: string, seed: number, table: DataTable) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const options = parseWeightedOptions(table);
    const values: string[] = [];

    for (let i = 0; i < 20; i++) {
      values.push(weightedPick(rng, options));
    }

    generatorAbility(actorName).storeSequence('weightedSequence2', values);
  },
);

Then('both weighted pick sequences should be identical', async () => {
  const first = generatorAbility('QATester').getSequence('weightedSequence1');
  const second = generatorAbility('QATester').getSequence('weightedSequence2');

  await actorCalled('QATester').attemptsTo(
    Ensure.that(JSON.stringify(first), equals(JSON.stringify(second))),
  );
});

Then('all weighted values should be from the original options', async () => {
  const values = generatorAbility('QATester').getSequence('weightedSequence1') as string[];
  const options = generatorAbility('QATester').getSequence('weightedOptions') as WeightedOption<string>[];
  const validValues = options.map((opt) => opt.value);
  const allValid = values.every((value) => validValues.includes(value));

  await actorCalled('QATester').attemptsTo(Ensure.that(allValid, isTrue()));
});

When(
  '{word} uses weighted options {int} times with seed {int}:',
  (actorName: string, count: number, seed: number, table: DataTable) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const options = parseWeightedOptions(table);
    const values: string[] = [];

    for (let i = 0; i < count; i++) {
      values.push(weightedPick(rng, options));
    }

    generatorAbility(actorName).storeSequence('weightedDistribution', values);
    generatorAbility(actorName).storeSequence('distributionOptions', options);
  },
);

Then('{string} should be selected approximately {int}% of the time', async (expectedValue: string, expectedPercent: number) => {
  const values = generatorAbility('QATester').getSequence('weightedDistribution') as string[];
  const count = values.filter((value) => value === expectedValue).length;
  const actualPercent = (count / values.length) * 100;
  const tolerance = expectedPercent * 0.25; // 25% tolerance for statistical variation

  const valid = Math.abs(actualPercent - expectedPercent) < tolerance;

  await actorCalled('QATester').attemptsTo(Ensure.that(valid, isTrue()));
});

Given('a schema with fields:', (schemaText: string) => {
  UseGenerateDataAPI.as(actorCalled('QATester')).storeDSLSource(schemaText);
});

When('{word} generates {int} selection records with seed {int}', async (actorName: string, count: number, seed: number) => {
  const api = UseGenerateDataAPI.as(actorCalled(actorName));
  await api.generateRecordsWithSeed(count, seed);
  generatorAbility(actorName).storeSequence('generatedRecords', api.getRecords());
});

Then(
  'all {string} values should be one of {string}',
  async (fieldName: string, allowedValuesString: string) => {
    const records = generatorAbility('QATester').getSequence('generatedRecords') as Record<string, unknown>[];
    const allowedValues = parseArray(allowedValuesString);
    const allValid = records.every((record) => {
      const value = record[fieldName];
      return typeof value === 'string' && allowedValues.includes(value);
    });

    await actorCalled('QATester').attemptsTo(Ensure.that(allValid, isTrue()));
  },
);

Then(
  'approximately {int}% of records should have {word} {string}',
  async (expectedPercent: number, fieldName: string, expectedValue: string) => {
    const records = generatorAbility('QATester').getSequence('generatedRecords') as Record<string, unknown>[];
    const count = records.filter((record) => record[fieldName] === expectedValue).length;
    const actualPercent = (count / records.length) * 100;
    const tolerance = expectedPercent * 0.3; // 30% tolerance for statistical variation

    const valid = Math.abs(actualPercent - expectedPercent) < tolerance;

    await actorCalled('QATester').attemptsTo(Ensure.that(valid, isTrue()));
  },
);

When('{word} generates a selection snapshot with seed {int}', (actorName: string, seed: number) => {
  const rng = generatorAbility(actorName).createRNG(seed);

  const snapshot: SelectionSnapshot = {
    pickValue: pick(rng, ['option1', 'option2', 'option3']),
    weightedValue: weightedPick(rng, [
      { value: 'common', weight: 80 },
      { value: 'rare', weight: 20 },
    ]),
  };

  generatorAbility(actorName).storeSequence('selectionSnapshot1', [snapshot]);
});

When('{word} generates the same selection snapshot with seed {int} again', (actorName: string, seed: number) => {
  const rng = generatorAbility(actorName).createRNG(seed);

  const snapshot: SelectionSnapshot = {
    pickValue: pick(rng, ['option1', 'option2', 'option3']),
    weightedValue: weightedPick(rng, [
      { value: 'common', weight: 80 },
      { value: 'rare', weight: 20 },
    ]),
  };

  generatorAbility(actorName).storeSequence('selectionSnapshot2', [snapshot]);
});

Then('both selection snapshots should be identical', async () => {
  const firstArray = generatorAbility('QATester').getSequence('selectionSnapshot1');
  const secondArray = generatorAbility('QATester').getSequence('selectionSnapshot2');
  const first = firstArray[0];
  const second = secondArray[0];

  await actorCalled('QATester').attemptsTo(
    Ensure.that(JSON.stringify(first), equals(JSON.stringify(second))),
  );
});
