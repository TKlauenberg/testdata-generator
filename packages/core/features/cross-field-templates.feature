Feature: Cross-Field Template Evaluation
  As a QA tester
  I want template placeholders to resolve from previously generated fields
  So that generated records can contain realistic cross-field values

  Background:
    Given the actor QATester

  Scenario: Email template uses first and last name fields
    Given QATester has DSL source code:
      ```
      schema User {
        firstName: string generator=pick(array=["Ada"])
        lastName: string generator=pick(array=["Lovelace"])
        email: string generator=pick(array=["{{firstName}}.{{lastName}}@test.com"])
      }
      ```
    When QATester generates 3 records using the public generateData API
    Then each generated record should have field "email" equal to "Ada.Lovelace@test.com"

  Scenario: Multiple placeholders resolve in one field
    Given QATester has DSL source code:
      ```
      schema User {
        firstName: string generator=pick(array=["Ada"])
        lastName: string generator=pick(array=["Lovelace"])
        userHandle: string generator=pick(array=["{{firstName}}.{{lastName}}"])
      }
      ```
    When QATester generates 2 records using the public generateData API
    Then each generated record should have field "userHandle" equal to "Ada.Lovelace"

  Scenario: Missing referenced field produces actionable error
    Given QATester has DSL source code with semantic error:
      ```
      schema User {
        firstName: string generator=pick(array=["Ada"])
        email: string generator=pick(array=["{{firstName}}.{{missingField}}@test.com"])
      }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a generation error should be thrown
    And the error message should mention "missingField"

  Scenario: Field declared before its dependency resolves correctly (out-of-order DSL declaration)
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["{{firstName}}@test.com"])
        firstName: string generator=pick(array=["Ada"])
      }
      ```
    When QATester generates 1 records using the public generateData API
    Then each generated record should have field "email" equal to "Ada@test.com"

  Scenario: Fixed seed keeps template output deterministic
    Given QATester has DSL source code:
      ```
      schema User {
        firstName: string generator=pick(array=["Ada", "Grace", "Linus"])
        lastName: string generator=pick(array=["Lovelace", "Hopper", "Torvalds"])
        email: string generator=pick(array=["{{firstName}}.{{lastName}}@test.com"])
      }
      ```
    When QATester generates 5 records with seed 42 using the public generateData API
    And QATester generates another 5 records with the same seed 42
    Then both record sequences should be identical

  Scenario: Many-to-one style related entity generation via @schema reference
    Given QATester has DSL source code:
      ```
      schema Company {
        name: string generator=pick(array=["Acme Corp"])
      }

      schema Employee {
        company: @schema:Company
      }
      ```
    When QATester generates 3 records using the public generateData API
    Then each generated record should have nested field "company.name" equal to "Acme Corp"

  Scenario: One-to-many style related entity generation via nested @schema references
    Given QATester has DSL source code:
      ```
      schema Author {
        name: string generator=pick(array=["Ada"])
      }

      schema Book {
        author: @schema:Author
      }

      schema Review {
        book: @schema:Book
      }
      ```
    When QATester generates 2 records using the public generateData API
    Then each generated record should have nested field "book.author.name" equal to "Ada"
