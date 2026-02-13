Feature: Rust-Style Error Formatting
  As a QA tester
  I want beautiful, actionable error messages
  So that I can fix issues without developer help

  Background:
    Given the testdata-ai CLI is installed

  @error-formatting @happy-path
  Scenario: Display single error with visual pointer
    Given QA Tester has a DSL schema file "test-unterminated.td" with content:
      """
      schema User {
        name: string = "unterminated
      }
      """
    When QA Tester validates the schema file
    Then QA Tester should see a Rust-style error message
    And the error message should display the error code "scanner.unterminatedString"
    And the error message should show the problematic line
    And the error message should show a visual pointer at the error location
    And the error message should include a helpful suggestion

  @error-formatting
  Scenario: Display multiple errors sorted by location
    Given QA Tester has a DSL schema file "test-multi-error.td" with content:
      """
      schema User {
        name: string = "unterminated
        email: invalid_type
      }
      """
    When QA Tester validates the schema file
    Then QA Tester should see multiple error messages
    And the errors should be sorted by line number
    And each error should have its own visual pointer

  @error-formatting
  Scenario: Display "Did you mean?" suggestion for typos
    Given QA Tester has a DSL schema file "test-typo.td" with content:
      """
      schema User {
        id: uuuid
      }
      """
    When QA Tester validates the schema file
    Then QA Tester should see error code "analyzer.undefinedReference"
    And QA Tester should see a suggestion about using "uuid"

  @error-formatting
  Scenario: Color-coded error vs warning display
    Given QA Tester has a DSL schema file "test-warnings.td" with warnings
    When QA Tester validates the schema file
    Then QA Tester should see color-coded output differentiating errors and warnings

  @error-formatting
  Scenario: Error code display for debugging
    Given QA Tester has a DSL schema file with a validation error
    When QA Tester validates the schema file
    Then QA Tester should see the error code in the format "Error: <code>"
    And the error code should help identify the error type

  @error-formatting
  Scenario: Long line wrapping for narrow terminals
    Given QA Tester has a DSL schema file with very long lines
    When QA Tester validates the schema file with terminal width limit
    Then the error formatter should truncate or wrap long lines appropriately
    And the error message should remain readable

  @error-formatting
  Scenario: JSON output mode unaffected by formatter
    Given QA Tester has a DSL schema file with errors
    When QA Tester validates the schema file with "--json" flag
    Then QA Tester should see JSON output with error details
    And the output should not include Rust-style formatting

  @error-formatting
  Scenario: Error without location information
    Given QA Tester has a validation error without specific location
    When QA Tester displays the error
    Then QA Tester should see the error code and message
    And the error should not show file location information

  @error-formatting
  Scenario: Generate command uses error formatter
    Given QA Tester has an invalid DSL schema file for generation
    When QA Tester runs the generate command
    Then QA Tester should see Rust-style error formatting
    And the errors should match the same format as validate command
