import { defineParameterType } from '@cucumber/cucumber';

/**
 * Custom parameter type for actor names.
 * 
 * This allows matching actor names like "QA Tester" or "Developer" without quotes.
 * Usage in step definitions: {actor} instead of {string}
 * 
 * Matches: one or more words starting with a capital letter
 * Examples: "QA Tester", "Developer", "Product Manager"
 */
defineParameterType({
  name: 'actor',
  regexp: /[A-Z][A-Za-z0-9 ]+/,
  transformer: (name: string) => name.trim(),
});
