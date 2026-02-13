Feature: Identity Field Generators
  As a QA tester
  I want to generate unique identifiers for test data
  So that records have realistic primary keys and IDs

  Background:
    Given the actor Tester

  @identity @uuid
  Scenario: Generate deterministic UUIDs with seeded RNG
    When Tester generates 10 UUIDs with seed 12345
    And Tester generates 10 UUIDs with seed 12345 again
    Then both UUID sequences should be identical
    And all UUIDs should match RFC4122 v4 format
    And all UUIDs should have correct length of 36 characters

  @identity @uuid
  Scenario: Generate unique UUIDs with different seeds
    When Tester generates 10 UUIDs with seed 42
    And Tester generates 10 UUIDs with seed 999
    Then the two UUID sequences should be different

  @identity @sequential
  Scenario: Generate sequential IDs starting from 1
    When Tester generates 5 sequential IDs starting from 1
    Then the sequential IDs should be 1, 2, 3, 4, 5 in order

  @identity @sequential
  Scenario: Generate sequential IDs starting from custom value
    When Tester generates 3 sequential IDs starting from 1000
    Then the sequential IDs should be 1000, 1001, 1002 in order

  @identity @sequential
  Scenario: Independent sequential generators maintain separate state
    When Tester creates sequential generator A starting from 10
    And Tester creates sequential generator B starting from 100
    And Tester generates 1 ID from generator A
    And Tester generates 1 ID from generator B
    And Tester generates 1 ID from generator A again
    Then generator A should have produced 10, 11
    And generator B should have produced 100

  @identity @nanoid
  Scenario: Generate deterministic NanoIDs with seeded RNG
    When Tester generates 10 NanoIDs of length 21 with seed 54321
    And Tester generates 10 NanoIDs of length 21 with seed 54321 again
    Then both NanoID sequences should be identical
    And all NanoIDs should have length 21
    And all NanoIDs should use only URL-safe characters

  @identity @nanoid
  Scenario: Generate NanoIDs with custom length
    When Tester generates 5 NanoIDs of length 16 with seed 11111
    Then all NanoIDs should have length 16
    And all NanoIDs should use only URL-safe characters

  @identity @validation
  Scenario: Sequential generator validates start value
    When Tester tries to create sequential generator with non-integer start 1.5
    Then an error should be thrown with message "must be an integer"

  @identity @validation
  Scenario: NanoID generator validates length parameter
    When Tester tries to generate NanoID with length 0 and seed 12345
    Then an error should be thrown with message "positive integer"

  @identity @integration
  Scenario: Generate records with UUID primary keys
    Given Tester has a schema with UUID field "id"
    When Tester generates 5 records with seed 42
    Then all records should have unique UUID values in "id" field
    And all "id" values should match RFC4122 v4 format

  @identity @integration
  Scenario: Generate records with NanoID fields
    Given Tester has a schema with NanoID field "token" of length 16
    When Tester generates 5 records with seed 77777
    Then all records should have "token" values of length 16
    And all "token" values should be unique
    And all "token" values should use only URL-safe characters
