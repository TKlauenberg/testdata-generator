Feature: Record Generation from Validated Schema
  As a developer
  I want to generate complete test data records from schemas
  So that all fields are populated according to their definitions

  Background:
    Given the actor Developer

  Scenario: Generate single record from simple schema
    Given Developer has a validated schema with fields:
      | name  | type  | min | max |
      | id    | int   | 1   | 100 |
      | score | float | 0.0 | 1.0 |
    And Developer has a seeded RNG with seed 12345
    When Developer generates a record from the schema
    Then the record should have field "id" of type number
    And the record should have field "score" of type number
    And the "id" value should be between 1 and 100 inclusive
    And the "score" value should be between 0.0 and 1.0

  Scenario: Deterministic generation with same seed
    Given Developer has a validated schema with field "value" of type "int" with min 0 and max 100
    And Developer has a seeded RNG with seed 99999
    When Developer generates a record from the schema
    And Developer creates a new RNG with the same seed 99999
    And Developer generates another record from the same schema
    Then both records should be identical

  Scenario: All primitive field types in one record
    Given Developer has a validated schema with fields:
      | name   | type    | params             |
      | id     | int     | min=1, max=1000    |
      | price  | float   | min=0.0, max=100.0 |
      | name   | string  | length=10          |
      | active | boolean |                    |
    And Developer has a seeded RNG with seed 42
    When Developer generates a record from the schema
    Then all fields should be present in the record
    And field "id" should be of type number
    And field "price" should be of type number
    And field "name" should be of type string
    And field "active" should be of type boolean

  Scenario: Field values respect generator parameters
    Given Developer has a validated schema with field "age" of type "int" with min 18 and max 65
    And Developer has a seeded RNG with seed 777
    When Developer generates 100 records from the schema
    Then all "age" values should be between 18 and 65 inclusive
    And at least one "age" value should be 18
    And at least one "age" value should be 65

  Scenario: String length parameter is respected
    Given Developer has a validated schema with field "code" of type "string" with length 15
    And Developer has a seeded RNG with seed 333
    When Developer generates 50 records from the schema
    Then all "code" values should have length 15

  Scenario: Error handling for unknown generator
    Given Developer has a validated schema with field "weird" of type "invalid-type"
    And Developer has a seeded RNG with seed 123
    When Developer attempts to generate a record from the schema
    Then a clear error should be thrown
    And the error message should mention "invalid-type"
    And the error message should mention field name "weird"

  Scenario: Empty schema produces empty record
    Given Developer has a validated schema with no fields
    And Developer has a seeded RNG with seed 555
    When Developer generates a record from the schema
    Then the record should be an empty object with 0 fields

  Scenario: Generator type aliases work correctly
    Given Developer has a validated schema with fields:
      | name | type    | params             |
      | a    | integer | min=0, max=10      |
      | b    | double  | min=0.0, max=1.0   |
      | c    | text    | length=8           |
      | d    | bool    |                    |
    And Developer has a seeded RNG with seed 999
    When Developer generates a record from the schema
    Then field "a" should be of type number
    And field "b" should be of type number
    And field "c" should be of type string
    And field "d" should be of type boolean

  Scenario: Default parameters are used when not specified
    Given Developer has a validated schema with fields:
      | name          | type   |
      | defaultInt    | int    |
      | defaultFloat  | float  |
      | defaultString | string |
    And Developer has a seeded RNG with seed 7777
    When Developer generates a record from the schema
    Then field "defaultInt" should be of type number
    And field "defaultFloat" should be of type number
    And field "defaultString" should be of type string
    And the "defaultInt" value should be between 0 and 100 inclusive
    And the "defaultFloat" value should be between 0.0 and 1.0
    And the "defaultString" value should have length 10
