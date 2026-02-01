Feature: Scanner - Lexical Analysis
  As a developer using the testdata-ai DSL
  I want the scanner to tokenize my source code correctly
  So that the parser can build an accurate AST

  Background:
    Given the testdata-ai core library is initialized

  @scanner @keywords
  Scenario: Scanner tokenizes DSL keywords
    Given QA Tester has DSL source code "schema User { }"
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the tokens should contain a keyword token with value "schema"
    And the tokens should contain an identifier token with value "User"

  @scanner @identifiers
  Scenario: Scanner tokenizes identifiers
    Given QA Tester has DSL source code "myField _private field123"
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the tokens should contain 3 identifier tokens

  @scanner @strings
  Scenario: Scanner tokenizes string literals with escape sequences
    Given QA Tester has DSL source code "\"hello\\nworld\""
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the first token should be a string with value "hello\nworld"

  @scanner @numbers
  Scenario: Scanner tokenizes numeric literals
    Given QA Tester has DSL source code "42 123.45 0.5"
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the tokens should contain 3 number tokens

  @scanner @operators
  Scenario: Scanner tokenizes operators
    Given QA Tester has DSL source code ": { } [ ] ->"
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the tokens should contain operator tokens

  @scanner @error-handling
  Scenario: Scanner detects unterminated string
    Given QA Tester has DSL source code with an unterminated string
    When QA Tester scans the source code
    Then QA Tester should see the scan failed
    And the error code should be "scanner.unterminatedString"
    And the scan error message should contain "Unterminated string"

  @scanner @error-handling
  Scenario: Scanner detects invalid characters
    Given QA Tester has DSL source code "@invalid"
    When QA Tester scans the source code
    Then QA Tester should see the scan failed
    And the error code should be "scanner.invalidCharacter"

  @scanner @location-tracking
  Scenario: Scanner tracks source locations with 1-indexed lines and columns
    Given QA Tester has DSL source code "schema"
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the first token location should have line 1 and column 1
    And the first token location should have length 6

  @scanner @multiline
  Scenario: Scanner tracks line numbers across multiple lines
    Given QA Tester has multiline DSL source code
    When QA Tester scans the source code
    Then QA Tester should see the scan succeeded
    And the tokens should have correct line numbers
