/**
 * Step definitions for Personal Data Generators feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { UseGenerators } from '../support/abilities/UseGenerators';
import {
  firstName,
  lastName,
  fullName,
  email,
  phoneNumber,
  uuid,
} from '../../src/generator/generators';
import {
  GenerateFirstNames,
  GenerateLastNames,
  GenerateFullNames,
  GenerateEmails,
  GeneratePhoneNumbers,
} from '../support/tasks/GeneratorTasks';
import { GeneratedSequence } from '../support/questions/GeneratorQuestions';

// First Name Generation
When(
  '{word} generates {int} first names with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFirstNames.count(count, seed, 'firstNameSeq1'),
    );
  },
);

When(
  '{word} generates {int} first names with seed {int} again',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFirstNames.count(count, seed, 'firstNameSeq2'),
    );
  },
);

Then('both first name sequences should be identical', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('firstNameSeq1', 'firstNameSeq2'),
      equals(true),
    ),
  );
});

Then('all first names should be non-empty strings', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allNonEmptyStrings('firstNameSeq1'), isTrue()),
  );
});

Then('at least {int} unique first names should be generated', async (minUnique: number) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.atLeastNUniqueValues('firstNameSeq1', minUnique),
      isTrue(),
    ),
  );
});

// Last Name Generation
When(
  '{word} generates {int} last names with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateLastNames.count(count, seed, 'lastNameSeq1'),
    );
  },
);

When(
  '{word} generates {int} last names with seed {int} again',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateLastNames.count(count, seed, 'lastNameSeq2'),
    );
  },
);

Then('both last name sequences should be identical', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('lastNameSeq1', 'lastNameSeq2'),
      equals(true),
    ),
  );
});

Then('all last names should be non-empty strings', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allNonEmptyStrings('lastNameSeq1'), isTrue()),
  );
});

Then('at least {int} unique last names should be generated', async (minUnique: number) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.atLeastNUniqueValues('lastNameSeq1', minUnique),
      isTrue(),
    ),
  );
});

// Full Name Generation
When(
  '{word} generates {int} full names with seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFullNames.count(count, seed, 'fullNameSeq1'),
    );
  },
);

When(
  '{word} generates {int} full names with seed {int} again',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateFullNames.count(count, seed, 'fullNameSeq2'),
    );
  },
);

Then('both full name sequences should be identical', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('fullNameSeq1', 'fullNameSeq2'),
      equals(true),
    ),
  );
});

Then('all full names should contain exactly one space', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allContainOneSpace('fullNameSeq1'), isTrue()),
  );
});

Then('all full names should be non-empty strings', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allNonEmptyStrings('fullNameSeq1'), isTrue()),
  );
});

Then('all full names should have at least two parts', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allHaveTwoParts('fullNameSeq1'), isTrue()),
  );
});

// Email Generation
When(
  '{word} generates {int} emails with default domain and seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateEmails.withDefaultDomain(count, seed, 'emailSeq1'),
    );
  },
);

When(
  '{word} generates {int} emails with domain {string} and seed {int}',
  async (actorName: string, count: number, domain: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateEmails.withDomain(domain, count, seed, 'emailSeq1'),
    );
  },
);

When(
  '{word} generates {int} emails with domain {string} and seed {int} again',
  async (actorName: string, count: number, domain: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GenerateEmails.withDomain(domain, count, seed, 'emailSeq2'),
    );
  },
);

Then('all emails should end with {string}', async (domain: string) => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allEndWithDomain('emailSeq1', domain), isTrue()),
  );
});

Then('all emails should match valid email format', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allMatchEmailFormat('emailSeq1'), isTrue()),
  );
});

Then('all emails should be lowercase', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(GeneratedSequence.allAreLowercase('emailSeq1'), isTrue()),
  );
});

Then('all emails should use firstname.lastname pattern', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.allMatchFirstnameLastnamePattern('emailSeq1'),
      isTrue(),
    ),
  );
});

Then('both email sequences should be identical', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('emailSeq1', 'emailSeq2'),
      equals(true),
    ),
  );
});

// Phone Number Generation
When(
  '{word} generates {int} phone numbers with default format and seed {int}',
  async (actorName: string, count: number, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GeneratePhoneNumbers.withDefaultFormat(count, seed, 'phoneSeq1'),
    );
  },
);

When(
  '{word} generates {int} phone numbers with format {string} and seed {int}',
  async (actorName: string, count: number, format: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GeneratePhoneNumbers.withFormat(format, count, seed, 'phoneSeq1'),
    );
  },
);

When(
  '{word} generates {int} phone numbers with format {string} and seed {int} again',
  async (actorName: string, count: number, format: string, seed: number) => {
    await actorCalled(actorName).attemptsTo(
      GeneratePhoneNumbers.withFormat(format, count, seed, 'phoneSeq2'),
    );
  },
);

Then(
  'all phone numbers should match format {string}',
  async (format: string) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allMatchPhoneFormat('phoneSeq1', format),
        isTrue(),
      ),
    );
  },
);

Then(
  'all phone numbers should contain exactly {int} digits',
  async (digitCount: number) => {
    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allContainNDigits('phoneSeq1', digitCount),
        isTrue(),
      ),
    );
  },
);

Then('both phone number sequences should be identical', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('phoneSeq1', 'phoneSeq2'),
      equals(true),
    ),
  );
});

// Integration scenarios
Given(
  '{word} has a schema with personal fields:',
  (actorName: string, schemaDoc: string) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('schemaDoc', [schemaDoc]);
  },
);

Given(
  '{word} has a schema with full name field:',
  (actorName: string, schemaDoc: string) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('schemaDoc', [schemaDoc]);
  },
);

Given(
  '{word} has a schema with first and last name fields',
  (actorName: string) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('fieldInfo', [
      { name: 'firstName', type: 'firstName' },
      { name: 'lastName', type: 'lastName' },
    ]);
  },
);

Given(
  '{word} has a schema with multiple personal fields',
  (actorName: string) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    generators.storeSequence('fieldInfo', [
      { name: 'firstName', type: 'firstName' },
      { name: 'lastName', type: 'lastName' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phoneNumber' },
    ]);
  },
);

When(
  '{word} generates {int} records with seed {int}',
  (actorName: string, count: number, seed: number) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    const fieldInfo = generators.getSequence('fieldInfo') as Array<{
      name: string;
      type: string;
    }>;

    if (!fieldInfo) {
      return; // Schema doc based - handled separately
    }

    const rng = generators.createRNG(seed);
    const records: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      const record: Record<string, unknown> = {};
      for (const field of fieldInfo) {
        if (field.type === 'firstName') {
          record[field.name] = firstName(rng);
        } else if (field.type === 'lastName') {
          record[field.name] = lastName(rng);
        } else if (field.type === 'email') {
          record[field.name] = email(rng);
        } else if (field.type === 'phoneNumber') {
          record[field.name] = phoneNumber(rng);
        } else if (field.type === 'uuid') {
          record[field.name] = uuid(rng);
        } else if (field.type === 'fullName') {
          record[field.name] = fullName(rng);
        }
      }
      records.push(record);
    }

    generators.storeSequence('records', records);
  },
);

When(
  '{word} generates {int} records with seed {int} again',
  (actorName: string, count: number, seed: number) => {
    const generators = UseGenerators.as(actorCalled(actorName));
    const fieldInfo = generators.getSequence('fieldInfo') as Array<{
      name: string;
      type: string;
    }>;

    const rng = generators.createRNG(seed);
    const records: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      const record: Record<string, unknown> = {};
      for (const field of fieldInfo) {
        if (field.type === 'firstName') {
          record[field.name] = firstName(rng);
        } else if (field.type === 'lastName') {
          record[field.name] = lastName(rng);
        } else if (field.type === 'email') {
          record[field.name] = email(rng);
        } else if (field.type === 'phoneNumber') {
          record[field.name] = phoneNumber(rng);
        } else if (field.type === 'uuid') {
          record[field.name] = uuid(rng);
        } else if (field.type === 'fullName') {
          record[field.name] = fullName(rng);
        }
      }
      records.push(record);
    }

    generators.storeSequence('records2', records);
  },
);

Then(
  'all records should have valid UUID in {string} field',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const uuids = records.map((r) => r[fieldName] as string);
    generators.storeSequence('uuidCheck', uuids);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(GeneratedSequence.allMatchUUIDFormat('uuidCheck'), isTrue()),
    );
  },
);

Then(
  'all records should have non-empty {string} field',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const values = records.map((r) => r[fieldName] as string);
    generators.storeSequence('fieldCheck', values);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(GeneratedSequence.allNonEmptyStrings('fieldCheck'), isTrue()),
    );
  },
);

Then(
  'all records should have valid email in {string} field',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const emails = records.map((r) => r[fieldName] as string);
    generators.storeSequence('emailCheck', emails);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(GeneratedSequence.allMatchEmailFormat('emailCheck'), isTrue()),
    );
  },
);

Then(
  'all records should have valid phone in {string} field',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const phones = records.map((r) => r[fieldName] as string);
    generators.storeSequence('phoneCheck', phones);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allMatchPhoneFormat('phoneCheck', '(###) ###-####'),
        isTrue(),
      ),
    );
  },
);

Then(
  'all {string} fields should contain full names with first and last parts',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const names = records.map((r) => r[fieldName] as string);
    generators.storeSequence('nameCheck', names);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(GeneratedSequence.allHaveTwoParts('nameCheck'), isTrue()),
    );
  },
);

Then(
  'all {string} fields should be valid emails with default domain',
  async (fieldName: string) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const emails = records.map((r) => r[fieldName] as string);
    generators.storeSequence('emailDomainCheck', emails);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.allEndWithDomain('emailDomainCheck', 'example.com'),
        isTrue(),
      ),
    );
  },
);

Then('both record sets should have identical personal data', async () => {
  await actorCalled('QATester').attemptsTo(
    Ensure.that(
      GeneratedSequence.areIdentical('records', 'records2'),
      equals(true),
    ),
  );
});

Then(
  'at least {int} unique first names should appear',
  async (minUnique: number) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const firstNames = records.map((r) => r.firstName as string);
    generators.storeSequence('firstNameDiversity', firstNames);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.atLeastNUniqueValues('firstNameDiversity', minUnique),
        isTrue(),
      ),
    );
  },
);

Then(
  'at least {int} unique last names should appear',
  async (minUnique: number) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const lastNames = records.map((r) => r.lastName as string);
    generators.storeSequence('lastNameDiversity', lastNames);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.atLeastNUniqueValues('lastNameDiversity', minUnique),
        isTrue(),
      ),
    );
  },
);

Then(
  'at least {int} unique full name combinations should appear',
  async (minUnique: number) => {
    const generators = UseGenerators.as(actorCalled('QATester'));
    const records = generators.getSequence('records') as Record<string, unknown>[];
    const fullNames = records.map(
      (r) => `${r.firstName} ${r.lastName}`,
    );
    generators.storeSequence('fullNameDiversity', fullNames);

    await actorCalled('QATester').attemptsTo(
      Ensure.that(
        GeneratedSequence.atLeastNUniqueValues('fullNameDiversity', minUnique),
        isTrue(),
      ),
    );
  },
);
