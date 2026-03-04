Feature: Context reference syntax and resolution
  As a QA tester
  I want to reference loaded context data in generator parameters
  So that generated records can reuse existing seeded data deterministically

  Background:
    Given the actor QATester
    And QATester has context collection "users" loaded from JSON fixture "users.array.json"

  Scenario: Select random item field from a context collection
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["@context.users.random.email"])
      }
      ```
    When QATester generates 5 records using the public generateData API
    Then each generated record should have field "email" in set "qa.one@example.com,qa.two@example.com"

  Scenario: Select indexed item field from a context collection
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["@context.users[0].email"])
      }
      ```
    When QATester generates 3 records using the public generateData API
    Then each generated record should have field "email" equal to "qa.one@example.com"

  Scenario: Random context selection is deterministic with same seed
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["@context.users.random.email"])
      }
      ```
    When QATester generates 5 records with seed 123 using the public generateData API
    And QATester generates another 5 records with the same seed 123
    Then both record sequences should be identical

  Scenario: Missing context collection raises actionable error
    Given QATester has DSL source code with semantic error:
      ```
      schema User {
        email: string generator=pick(array=["@context.missing.random.email"])
      }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a generation error should be thrown
    And the error message should mention "missing"

  Scenario: Unsupported context reference syntax is rejected
    Given QATester has DSL source code with semantic error:
      ```
      schema User {
        email: string generator=pick(array=["@context.users.where(role=admin)"])
      }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a generation error should be thrown
    And the error message should mention "Invalid context reference"
