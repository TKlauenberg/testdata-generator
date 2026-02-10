Feature: Generate Data from DSL Source (Public API)
  As a QA tester
  I want to generate test data from DSL schemas with a simple API call
  So that I can quickly create test datasets for my testing scenarios

  Background:
    Given the actor QATester

  Scenario: Generate small dataset from valid schema
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 10 records using the public generateData API
    Then exactly 10 records should be generated
    And each record should have field "id"
    And each record should have field "name"
    And field "id" should be of type number
    And field "name" should be of type string

  Scenario: Generate dataset with specific seed for reproducibility
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 5 records with seed 42 using the public generateData API
    And QATester generates another 5 records with the same seed 42
    Then both record sequences should be identical

  Scenario: Invalid schema returns validation errors
    Given QATester has invalid DSL source code:
      ```
      schema User { id: invalidType }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a ValidationError should be thrown
    And the error should include diagnostic information
    And the error message should mention "validation"

  Scenario: Syntax error in schema returns clear error message
    Given QATester has DSL source code with syntax error:
      ```
      schema User { id number }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a ValidationError should be thrown
    And the error should include diagnostic information about syntax

  Scenario: Semantic error in schema returns clear error message
    Given QATester has DSL source code with semantic error:
      ```
      schema User {
        id: unknownType
      }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a ValidationError should be thrown
    And the error should include diagnostic information about semantic errors

  Scenario: Performance test - 1000 records in under 1 minute
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
        name: string
        active: boolean
      }
      ```
    When QATester generates 1000 records using the public generateData API
    Then all 1000 records should be generated successfully
    And generation should complete in under 60 seconds

  Scenario: Memory efficiency - 100k records without memory issues
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 100000 records using the public generateData API
    Then all 100000 records should be generated successfully
    And memory usage should remain reasonable
    And the process should not run out of memory

  Scenario: Multi-schema source generates all schemas
    Given QATester has DSL source code with multiple schemas:
      ```
      schema User {
        id: number
      }
      schema Product {
        sku: string
      }
      ```
    When QATester generates 2 records per schema using the public generateData API
    Then exactly 4 records should be generated total
    And 2 records should have field "id"
    And 2 records should have field "sku"

  Scenario: Empty schema source generates no records
    Given QATester has empty DSL source code
    When QATester generates records using the public generateData API
    Then no records should be generated

  Scenario: Different seeds produce different data
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
      }
      ```
    When QATester generates 5 records with seed 42
    And QATester generates another 5 records with seed 99
    Then the two record sequences should be different

  Scenario: Zero count generates no records
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
      }
      ```
    When QATester generates 0 records using the public generateData API
    Then no records should be generated

  Scenario: Validation happens before generation starts
    Given QATester has invalid DSL source code:
      ```
      schema User { id: whoops }
      ```
    When QATester attempts to generate 1000 records using the public generateData API
    Then a ValidationError should be thrown immediately
    And no generation should have started

  Scenario: Generated records match schema structure exactly
    Given QATester has DSL source code:
      ```
      schema Item {
        id: number
        name: string
        active: boolean
        price: number
      }
      ```
    When QATester generates 3 records using the public generateData API
    Then each record should have exactly 4 fields
    And each record should have field "id" of type number
    And each record should have field "name" of type string
    And each record should have field "active" of type boolean
    And each record should have field "price" of type number
