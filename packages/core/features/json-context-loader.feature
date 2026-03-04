Feature: JSON Context Loader
  As a QA tester
  I want to load existing JSON data as context
  So that I can reference real data in test data generation

  Scenario: Load a single-object JSON context file
    Given QA Tester has JSON context fixture "users.single.json"
    When QA Tester loads the JSON context fixture
    Then the loaded context should contain 1 records
    And the loaded context metadata format should be "json"
    And loaded record 0 should have field "email" with value "qa.one@example.com"

  Scenario: Load an array-of-objects JSON context file
    Given QA Tester has JSON context fixture "users.array.json"
    When QA Tester loads the JSON context fixture
    Then the loaded context should contain 2 records
    And loaded record 1 should have field "id" with value "u-2"

  Scenario: Malformed JSON context file reports understandable failure
    Given QA Tester has JSON context fixture "users.malformed.json"
    When QA Tester attempts to load the JSON context fixture
    Then JSON context loading should fail
    And the JSON context loading error should mention "Invalid JSON"
