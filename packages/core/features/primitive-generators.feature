Feature: Primitive Field Generators
  As a QA tester
  I want basic field generators for primitive data types
  So that I can generate integers, floats, strings, and booleans in my schemas

  Background:
    Given the actor Tester

  Scenario: Generate deterministic integers with seeded RNG
    When Tester generates 20 random integers between 0 and 100 with seed 12345
    And Tester generates 20 random integers between 0 and 100 with seed 12345 again
    Then both integer sequences should be identical
    And all integer values should be between 0 and 100 inclusive
    And all integer values should be integers

  Scenario: Generate deterministic floats with seeded RNG
    When Tester generates 20 random floats between 0.0 and 1.0 with seed 54321
    And Tester generates 20 random floats between 0.0 and 1.0 with seed 54321 again
    Then both float sequences should be identical
    And all float values should be between 0.0 and 1.0
    And all float values should be floats

  Scenario: Generate deterministic booleans with seeded RNG
    When Tester generates 50 random booleans with seed 33333
    And Tester generates 50 random booleans with seed 33333 again
    Then both boolean sequences should be identical
    And the boolean sequence should contain both true and false values
    And the boolean distribution should be approximately balanced

  Scenario: Generate deterministic strings with seeded RNG
    When Tester generates 10 random strings of length 20 with seed 99999
    And Tester generates 10 random strings of length 20 with seed 99999 again
    Then both string sequences should be identical
    And all strings should have length 20
    And all strings should contain only alphanumeric characters

  Scenario: Custom character sets produce valid strings
    Given Tester wants to generate strings with only letters
    When Tester generates 20 random strings of length 10 using alphabetic charset with seed 88888
    Then all strings should contain only alphabetic characters
    And no strings should contain numeric characters

  Scenario: Parameter validation prevents invalid inputs for randomInt
    When Tester tries to generate an integer with min 10 greater than max 5
    Then an error should be thrown with message "Invalid range"

  Scenario: Parameter validation prevents invalid inputs for randomString
    When Tester tries to generate a string with negative length -1
    Then an error should be thrown with message "Invalid length"

  Scenario: Parameter validation prevents empty charset
    When Tester tries to generate a string with empty charset
    Then an error should be thrown with message "Character set cannot be empty"
