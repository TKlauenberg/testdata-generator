import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import { word, words, sentence, paragraph } from '../../src/generator/generators';

type TextSnapshot = {
  singleWord: string;
  manyWords: string;
  oneSentence: string;
  oneParagraph: string;
};

function generatorAbility(actorName: string): UseGenerators {
  return UseGenerators.as(actorCalled(actorName));
}

function sentenceWordCount(value: string): number {
  const withoutPeriod = value.endsWith('.') ? value.slice(0, -1) : value;
  if (withoutPeriod.length === 0) {
    return 0;
  }
  return withoutPeriod.split(' ').filter((token) => token.length > 0).length;
}

function paragraphSentenceCount(value: string): number {
  const matches = value.match(/[^.]+\./g);
  return matches ? matches.length : 0;
}

Given('QATester uses text generators', () => {
  generatorAbility('QATester');
});

When(
  '{word} generates {int} single words with seed {int}',
  (actorName: string, count: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(word(rng));
    }

    generatorAbility(actorName).storeSequence('singleWords1', values);
  },
);

When(
  '{word} generates {int} single words with seed {int} again',
  (actorName: string, count: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(word(rng));
    }

    generatorAbility(actorName).storeSequence('singleWords2', values);
  },
);

Then('both single-word sequences should be identical', async () => {
  const first = generatorAbility('QATester').getSequence('singleWords1');
  const second = generatorAbility('QATester').getSequence('singleWords2');

  await actorCalled('QATester').attemptsTo(
    Ensure.that(JSON.stringify(first), equals(JSON.stringify(second))),
  );
});

Then('all generated single words should be non-empty', async () => {
  const values = generatorAbility('QATester').getSequence('singleWords1') as string[];
  const allValid = values.length > 0 && values.every((entry) => typeof entry === 'string' && entry.length > 0);

  await actorCalled('QATester').attemptsTo(
    Ensure.that(allValid, isTrue()),
  );
});

When(
  '{word} generates {int} multi-word values with count {int} and seed {int}',
  (actorName: string, count: number, tokenCount: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(words(rng, tokenCount));
    }

    generatorAbility(actorName).storeSequence('multiWords', values);
  },
);

Then(
  'every multi-word value should contain exactly {int} words',
  async (expectedCount: number) => {
    const values = generatorAbility('QATester').getSequence('multiWords') as string[];
    const valid = values.every((entry) => entry.split(' ').length === expectedCount);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

When(
  '{word} generates {int} sentences with default length and seed {int}',
  (actorName: string, count: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(sentence(rng));
    }

    generatorAbility(actorName).storeSequence('defaultSentences', values);
  },
);

When(
  '{word} generates {int} sentences with explicit word count {int} and seed {int}',
  (actorName: string, count: number, explicitCount: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(sentence(rng, explicitCount));
    }

    generatorAbility(actorName).storeSequence('explicitSentences', values);
  },
);

Then(
  'all default sentences should contain between {int} and {int} words',
  async (minWords: number, maxWords: number) => {
    const values = generatorAbility('QATester').getSequence('defaultSentences') as string[];
    const valid = values.every((entry) => {
      const count = sentenceWordCount(entry);
      return count >= minWords && count <= maxWords;
    });

    await actorCalled('QATester').attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

Then(
  'all explicit sentences should contain exactly {int} words',
  async (expectedWords: number) => {
    const values = generatorAbility('QATester').getSequence('explicitSentences') as string[];
    const valid = values.every((entry) => sentenceWordCount(entry) === expectedWords);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

Then('every generated sentence should start with uppercase and end with period', async () => {
  const defaultValues = generatorAbility('QATester').getSequence('defaultSentences') as string[];
  const explicitValues = generatorAbility('QATester').getSequence('explicitSentences') as string[];
  const all = [...defaultValues, ...explicitValues];

  const valid = all.every((entry) => /^[A-Z].*\.$/.test(entry));

  await actorCalled('QATester').attemptsTo(
    Ensure.that(valid, isTrue()),
  );
});

When(
  '{word} generates {int} paragraphs with default sentence count and seed {int}',
  (actorName: string, count: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(paragraph(rng));
    }

    generatorAbility(actorName).storeSequence('defaultParagraphs', values);
  },
);

When(
  '{word} generates {int} paragraphs with explicit sentence count {int} and seed {int}',
  (actorName: string, count: number, explicitCount: number, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const values: string[] = [];

    for (let index = 0; index < count; index++) {
      values.push(paragraph(rng, explicitCount));
    }

    generatorAbility(actorName).storeSequence('explicitParagraphs', values);
  },
);

Then(
  'all default paragraphs should contain between {int} and {int} sentences',
  async (minSentences: number, maxSentences: number) => {
    const values = generatorAbility('QATester').getSequence('defaultParagraphs') as string[];
    const valid = values.every((entry) => {
      const count = paragraphSentenceCount(entry);
      return count >= minSentences && count <= maxSentences;
    });

    await actorCalled('QATester').attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

Then(
  'all explicit paragraphs should contain exactly {int} sentences',
  async (expectedSentences: number) => {
    const values = generatorAbility('QATester').getSequence('explicitParagraphs') as string[];
    const valid = values.every((entry) => paragraphSentenceCount(entry) === expectedSentences);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(valid, isTrue()),
    );
  },
);

Then('every generated paragraph sentence should end with period', async () => {
  const defaultValues = generatorAbility('QATester').getSequence('defaultParagraphs') as string[];
  const explicitValues = generatorAbility('QATester').getSequence('explicitParagraphs') as string[];
  const all = [...defaultValues, ...explicitValues];

  const valid = all.every((entry) => {
    const sentenceMatches = entry.match(/[^.]+\./g);
    return sentenceMatches !== null && sentenceMatches.length > 0;
  });

  await actorCalled('QATester').attemptsTo(
    Ensure.that(valid, isTrue()),
  );
});

When('{word} generates a text snapshot with seed {int}', (actorName: string, seed: number) => {
  const rng = generatorAbility(actorName).createRNG(seed);
  const snapshot: TextSnapshot = {
    singleWord: word(rng),
    manyWords: words(rng, 7),
    oneSentence: sentence(rng, 8),
    oneParagraph: paragraph(rng, 3),
  };

  generatorAbility(actorName).storeSequence('textSnapshot1', [snapshot]);
});

When(
  '{word} generates the same text snapshot with seed {int} again',
  (actorName: string, seed: number) => {
    const rng = generatorAbility(actorName).createRNG(seed);
    const snapshot: TextSnapshot = {
      singleWord: word(rng),
      manyWords: words(rng, 7),
      oneSentence: sentence(rng, 8),
      oneParagraph: paragraph(rng, 3),
    };

    generatorAbility(actorName).storeSequence('textSnapshot2', [snapshot]);
  },
);

Then('both text snapshots should be identical', async () => {
  const first = generatorAbility('QATester').getSequence('textSnapshot1');
  const second = generatorAbility('QATester').getSequence('textSnapshot2');

  await actorCalled('QATester').attemptsTo(
    Ensure.that(JSON.stringify(first), equals(JSON.stringify(second))),
  );
});
