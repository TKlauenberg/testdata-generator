Feature: Generate Data from DSL Source (Public API)
  As a QA tester
  I want to generate test data from DSL schemas with a simple API call
  So that I can quickly create test datasets for my testing scenarios

  Background:
    Given the actor QATester

  Scenario: Generate small dataset from valid schema
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 10 public API records using generateData
    Then exactly 10 public API records should be generated
    And each public API record should have field "id"
    And each public API record should have field "name"
    And public API field "id" should be of type number
    And public API field "name" should be of type string

  Scenario: Generate dataset with specific seed for reproducibility
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 5 public API records with seed 42 using generateData
    And QATester generates another 5 public API records with the same seed 42
    Then both public API record sequences should be identical

  Scenario: Invalid schema returns validation errors
    Given QATester has invalid public API DSL source code:
      ```
      schema User { id: invalidType }
      ```
    When QATester attempts to generate public API records using generateData
    Then a public API ValidationError should be thrown
    And the public API error should include diagnostic information
    And the public API error message should mention "validation"

  Scenario: Syntax error in schema returns clear error message
    Given QATester has public API DSL source code with syntax error:
      ```
      schema User { id number }
      ```
    When QATester attempts to generate public API records using generateData
    Then a public API ValidationError should be thrown
    And the public API error should include diagnostic information about syntax

  Scenario: Semantic error in schema returns clear error message
    Given QATester has public API DSL source code with semantic error:
      ```
      schema User {
        id: unknownType
      }
      ```
    When QATester attempts to generate public API records using generateData
    Then a public API ValidationError should be thrown
    And the public API error should include diagnostic information about semantic errors

  Scenario: Performance test - 1000 records in under 1 minute
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
        name: string
        active: boolean
      }
      ```
    When QATester generates 1000 public API records using generateData
    Then all 1000 public API records should be generated successfully
    And public API generation should complete in under 60 seconds

  Scenario: Memory efficiency - 100k records without memory issues
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 100000 public API records using generateData
    Then all 100000 public API records should be generated successfully
    And public API memory usage should remain reasonable
    And the public API process should not run out of memory

  Scenario: Multi-schema source generates all schemas
    Given QATester has public API DSL source code with multiple schemas:
      ```
      schema User {
        id: number
      }
      schema Product {
        sku: string
      }
      ```
    When QATester generates 2 public API records per schema using generateData
    Then exactly 4 public API records should be generated total
    And 2 public API records should have field "id"
    And 2 public API records should have field "sku"

  Scenario: Empty schema source generates no records
    Given QATester has empty public API DSL source code
    When QATester generates public API records using generateData
    Then no public API records should be generated

  Scenario: Different seeds produce different data
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
      }
      ```
    When QATester generates 5 public API records with seed 42
    And QATester generates another 5 public API records with seed 99
    Then the two public API record sequences should be different

  Scenario: Zero count generates no records
    Given QATester has public API DSL source code:
      ```
      schema User {
        id: number
      }
      ```
    When QATester generates 0 public API records using generateData
    Then no public API records should be generated

  Scenario: Validation happens before generation starts
    Given QATester has invalid public API DSL source code:
      ```
      schema User { id: whoops }
      ```
    When QATester attempts to generate 1000 public API records using generateData
    Then a public API ValidationError should be thrown immediately
    And no public API generation should have started

  Scenario: Generated records match schema structure exactly
    Given QATester has public API DSL source code:
      ```
      schema Item {
        id: number
        name: string
        active: boolean
        price: number
      }
      ```
    When QATester generates 3 public API records using generateData
    Then each public API record should have exactly 4 fields
    And each public API record should have field "id" of type number
    And each public API record should have field "name" of type string
    And each public API record should have field "active" of type boolean
    And each public API record should have field "price" of type number
