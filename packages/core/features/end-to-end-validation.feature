Feature: End-to-End Schema Validation
  As a QA tester
  I want to validate my DSL schema files and receive clear error messages
  So that I can fix issues before attempting data generation

  Background:
    Given the validation API is available

  Scenario: Valid schema file validates successfully
    Given I have a schema file with the content:
      """
      schema User {
        id: uuid
        name: string
        email: string
      }
      """
    When I validate the schema
    Then the validation should succeed
    And the result should contain 1 schema
    And the result should contain 3 fields

  Scenario: Schema with lexical error reports clear message
    Given I have a schema file with the content:
      """
      schema User {
        name: "unterminated string
      }
      """
    When I validate the schema
    Then the validation should fail
    And I should see an error message containing "unterminated"
    And the error code should start with "scanner"

  Scenario: Schema with syntax error reports clear message
    Given I have a schema file with the content:
      """
      schema User
        id: uuid
      }
      """
    When I validate the schema
    Then the validation should fail
    And I should see an error message containing "expected"
    And the error should have location information

  Scenario: Schema with semantic error reports suggestions
    Given I have a schema file with the content:
      """
      schema User {
        id: unknownType
      }
      """
    When I validate the schema
    Then the validation should fail
    And the error code should start with "analyzer"
    And I should see an error message containing "not supported"

  Scenario: Schema with multiple errors reports all sorted
    Given I have a schema file with the content:
      """
      schema User {
        id: unknownType1
        name: unknownType2
        email: unknownType3
      }
      """
    When I validate the schema
    Then the validation should fail
    And I should see 3 errors
    And the errors should be sorted by line number

  Scenario: Large schema file validates within performance requirement
    Given I have a schema file with 50 schemas and 10 fields each
    When I validate the schema
    Then the validation should complete in under 1000 milliseconds
    And the validation should succeed

  Scenario: Multiple schemas validate successfully
    Given I have a schema file with the content:
      """
      schema User {
        id: uuid
        name: string
      }

      schema Post {
        id: uuid
        title: string
        authorId: uuid
      }
      """
    When I validate the schema
    Then the validation should succeed
    And the result should contain 2 schemas

  Scenario: Duplicate schema definition is detected
    Given I have a schema file with the content:
      """
      schema User {
        id: uuid
      }

      schema User {
        name: string
      }
      """
    When I validate the schema
    Then the validation should fail
    And the error code should match "analyzer.duplicateSchema"
    And I should see an error message containing "already defined"

  Scenario: Duplicate field in schema is detected
    Given I have a schema file with the content:
      """
      schema User {
        id: uuid
        id: string
      }
      """
    When I validate the schema
    Then the validation should fail
    And the error code should match "analyzer.duplicateField"
    And I should see an error message containing "already defined"

  Scenario: Empty schema file validates successfully
    Given I have a schema file with the content:
      """
      """
    When I validate the schema
    Then the validation should succeed
    And the result should contain 0 schemas
