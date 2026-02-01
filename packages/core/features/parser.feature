Feature: Parser - Recursive Descent Implementation
  As a developer using the testdata-ai DSL
  I want the parser to build an AST from tokens
  So that DSL schemas can be transformed into structured data for validation

  Background:
    Given the testdata-ai core library is initialized

  @parser @valid-schemas
  Scenario: Parse valid schema with single field
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the AST should contain a Program node
    And the Program should contain 1 schema
    And the schema should be named "User"
    And the schema should contain 1 field
    And the field should have name "id" and type "string"

  @parser @valid-schemas
  Scenario: Parse valid schema with multiple fields
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string
        email: string
        age: number
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the Program should contain 1 schema
    And the schema should contain 3 fields

  @parser @generators
  Scenario: Parse schema with generator specifications
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string generator=uuid
        email: string generator=email
        age: number generator=randomInt(min=18, max=100)
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the first field should have generator "uuid" with no parameters
    And the second field should have generator "email" with no parameters
    And the third field should have generator "randomInt" with parameters

  @parser @constraints
  Scenario: Parse schema with constraints
    Given QA Tester has DSL source code:
      """
      schema User {
        email: string unique
        username: string generator=randomString(length=10) unique
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the first field should have unique constraint
    And the second field should have both generator and unique constraint

  @parser @multiple-schemas
  Scenario: Parse multiple schemas in one program
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string
      }
      schema Product {
        name: string
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the Program should contain 2 schemas

  @parser @error-handling
  Scenario: Syntax error - missing colon after field name
    Given QA Tester has DSL source code:
      """
      schema User {
        email string
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing failed
    And the error message should contain "Expected ':'"
    And the error location should be at line 2

  @parser @error-handling
  Scenario: Syntax error - unclosed schema brace
    Given QA Tester has DSL source code:
      """
      schema User {
        email: string
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing failed
    And the error message should contain "Expected '}'"

  @parser @error-handling
  Scenario: Syntax error - invalid generator syntax
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string generator
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing failed
    And the error message should contain "Expected '=' after 'generator'"

  @parser @error-recovery
  Scenario: Multiple syntax errors reported together
    Given QA Tester has DSL source code:
      """
      schema User {
        email
        age: number generator
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing failed
    And there should be at least 2 errors
    And one error should mention "Expected ':'"
    And one error should mention "Expected '='"

  @parser @location-tracking
  Scenario: Parser tracks source locations accurately
    Given QA Tester has DSL source code:
      """
      schema User {
        id: string
      }
      """
    When QA Tester scans and parses the source code
    Then QA Tester should see the parsing succeeded
    And the schema location should start at line 1
    And the first field location should start at line 2
