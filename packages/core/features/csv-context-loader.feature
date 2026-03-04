Feature: CSV Context Loader
  As a QA tester
  I want to load existing CSV data as context
  So that I can use database exports in my test scenarios

  Scenario: Load a database-export CSV context file
    Given QA Tester has CSV context fixture "users.export.csv"
    When QA Tester loads the CSV context fixture
    Then the loaded CSV context should contain 2 records
    And the loaded CSV context metadata format should be "csv"
    And loaded CSV record 0 should have field "email" with value "qa.one@example.com"
    And loaded CSV record 1 should have field "id" with number value 2

  Scenario: Parse quoted fields with embedded commas
    Given QA Tester has CSV context fixture "users.quoted.csv"
    When QA Tester loads the CSV context fixture
    Then loaded CSV record 0 should have field "name" with value "Doe, Jane"
    And loaded CSV record 0 should have field "notes" with value "Said \"hello, world\""

  Scenario: Malformed CSV context file reports understandable failure
    Given QA Tester has CSV context fixture "users.malformed.csv"
    When QA Tester attempts to load the CSV context fixture
    Then CSV context loading should fail
    And the CSV context loading error should mention "Malformed"