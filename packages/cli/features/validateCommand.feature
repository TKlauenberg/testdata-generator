Feature: Validate Command
  As a QA tester
  I want to validate my DSL schemas before generation
  So that I can fix syntax errors quickly

  Background:
    Given the testdata-generator CLI is installed

  @validate @happy-path
  Scenario: Validate valid schema
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td validate fixtures/valid-simple.td"
    Then QA Tester should see "✓ Schema is valid"
    And the exit code should be 0

  @validate @error-handling
  Scenario: Detect syntax errors
    Given QA Tester has an invalid DSL schema file "invalid-syntax.td"
    When QA Tester runs "td validate fixtures/invalid-syntax.td"
    Then QA Tester should see validation error messages
    And QA Tester should see the error location with line and column numbers
    And the exit code should be 1

  @validate @error-handling
  Scenario: Detect semantic errors
    Given QA Tester has a schema with semantic errors "invalid-semantic.td"
    When QA Tester runs "td validate fixtures/invalid-semantic.td"
    Then QA Tester should see validation error messages
    And QA Tester should see error problem descriptions
    And the exit code should be 1

  @validate @error-handling
  Scenario: Display multiple errors
    Given QA Tester has a schema with validation errors
    When QA Tester runs "td validate fixtures/invalid-syntax.td"
    Then QA Tester should see validation error messages
    And QA Tester should see "Validation failed" summary
    And the exit code should be 1

  @validate @json-output
  Scenario: JSON output for valid schema
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td validate fixtures/valid-simple.td --json"
    Then QA Tester should see JSON output with "valid": true
    And the JSON output should have an empty "errors" array
    And the exit code should be 0

  @validate @json-output
  Scenario: JSON output for invalid schema
    Given QA Tester has an invalid DSL schema file "invalid-syntax.td"
    When QA Tester runs "td validate fixtures/invalid-syntax.td --json"
    Then QA Tester should see JSON output with "valid": false
    And the JSON output should have error details with location information
    And the exit code should be 1

  @validate @file-error
  Scenario: Handle missing file
    When QA Tester runs "td validate nonexistent.td"
    Then QA Tester should see a "File" error message mentioning "not found"
    And the exit code should be 3

  @validate @performance
  Scenario: Fast validation
    Given QA Tester has a valid DSL schema file "valid-simple.td"
    When QA Tester runs "td validate fixtures/valid-simple.td"
    Then validation should complete in under 1 second
    And QA Tester should see "✓ Schema is valid"
    And the exit code should be 0
