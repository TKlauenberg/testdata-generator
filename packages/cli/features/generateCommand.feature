Feature: Generate Command
  As a QA tester
  I want to generate test data from DSL schemas
  So that I can create test datasets quickly

  Background:
    Given the testdata-ai CLI is installed

  @generate @happy-path
  Scenario: Generate data to stdout
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td"
    Then QA Tester should see JSON output on stdout
    And the exit code should be 0
    And the generation summary should be displayed

  @generate @options
  Scenario: Generate with custom count
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 50"
    Then QA Tester should see 50 records in JSON output
    And the exit code should be 0

  @generate @determinism
  Scenario: Deterministic generation with seed
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --seed 12345 --count 10"
    And QA Tester runs "td generate valid-simple.td --seed 12345 --count 10" again
    Then both outputs should be identical

  @generate @file-output
  Scenario: Generate to file
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --output output.json"
    Then the file "output.json" should contain valid JSON
    And the exit code should be 0

  @generate @validation-error
  Scenario: Handle validation errors
    Given QA Tester has an invalid DSL schema file "invalid-syntax.td"
    When QA Tester runs "td generate invalid-syntax.td"
    Then QA Tester should see validation error messages
    And the exit code should be 1

  @generate @file-error
  Scenario: Handle missing file
    When QA Tester runs "td generate nonexistent.td"
    Then QA Tester should see a "file not found" error
    And the exit code should be 3

  @generate @progress
  Scenario: Show progress for large datasets
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 500"
    Then QA Tester should see progress indicators during generation
    And the exit code should be 0

  @generate @shorthand-options
  Scenario: Use shorthand options
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td -c 25 -s 99999"
    Then QA Tester should see 25 records in JSON output
    And the exit code should be 0
