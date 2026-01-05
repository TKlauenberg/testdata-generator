Feature: Result Type Pattern with Screenplay
  As a developer writing tests
  I want to see how Screenplay integrates with Result<T, E> pattern
  So that I can write tests for scanner/parser/analyzer operations

  Background:
    Given the testdata-ai core library is initialized

  @result-pattern @success-case
  Scenario: Successful operation returns Result with value
    Given QA Tester performs an operation that succeeds with value "parsed successfully"
    Then QA Tester should see the operation succeeded
    And the success value should be "parsed successfully"

  @result-pattern @error-case
  Scenario: Failed operation returns Result with diagnostics
    Given QA Tester performs an operation that fails with error "scanner.unterminatedString" at line 3
    Then QA Tester should see the operation failed
    And the first error message should contain "unterminated string"
    And the error should be at line 3

  @result-pattern @type-safety
  Scenario: Result type enables type-safe error handling
    Given QA Tester performs an operation that succeeds with value "valid data"
    Then QA Tester should see the operation succeeded
    And QA Tester can safely access the success value
