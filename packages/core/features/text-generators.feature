Feature: Text Generators
  As a QA tester
  I want to generate words, sentences, and paragraphs
  So that test records include realistic text content

  Background:
    Given QATester uses text generators

  @text @word
  Scenario: Generate single words deterministically
    When QATester generates 20 single words with seed 12345
    And QATester generates 20 single words with seed 12345 again
    Then both single-word sequences should be identical
    And all generated single words should be non-empty

  @text @words
  Scenario: Generate multiple words with explicit count
    When QATester generates 10 multi-word values with count 6 and seed 23456
    Then every multi-word value should contain exactly 6 words

  @text @sentence
  Scenario: Generate sentences with default and explicit counts
    When QATester generates 8 sentences with default length and seed 34567
    And QATester generates 8 sentences with explicit word count 9 and seed 34567
    Then all default sentences should contain between 5 and 15 words
    And all explicit sentences should contain exactly 9 words
    And every generated sentence should start with uppercase and end with period

  @text @paragraph
  Scenario: Generate paragraphs with default and explicit sentence counts
    When QATester generates 6 paragraphs with default sentence count and seed 45678
    And QATester generates 6 paragraphs with explicit sentence count 4 and seed 45678
    Then all default paragraphs should contain between 3 and 5 sentences
    And all explicit paragraphs should contain exactly 4 sentences
    And every generated paragraph sentence should end with period

  @text @determinism
  Scenario: Verify determinism across all public text generators
    When QATester generates a text snapshot with seed 56789
    And QATester generates the same text snapshot with seed 56789 again
    Then both text snapshots should be identical
