Feature: Context tagging and filtered selection
  As a QA tester
  I want to tag loaded context sources and filter them in DSL references
  So that seeded data can be reused by environment and region without duplication

  Background:
    Given the actor QATester
    And QATester has context collection "users" loaded from fixture "users.staging.us.json" with tags "Staging, REGION-US"
    And QATester has context collection "users" loaded from fixture "users.staging.eu.json" with tags "staging, region-eu"
    And QATester has context collection "users" loaded from fixture "users.untagged.json"

  Scenario: Select tagged context with combined environment and region filters
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["@context.users@staging AND @region-us.random.email"])
      }
      ```
    When QATester generates 4 records with seed 42 using the public generateData API
    Then each generated record should have field "email" in set "staging.us.one@example.com,staging.us.two@example.com"

  Scenario: Untagged references still work without tag filters
    Given QATester has DSL source code:
      ```
      schema User {
        email: string generator=pick(array=["@context.users[3].email"])
      }
      ```
    When QATester generates 1 records using the public generateData API
    Then each generated record should have field "email" in set "untagged.one@example.com"

  Scenario: Missing tag matches surface a runtime error
    Given QATester has DSL source code with semantic error:
      ```
      schema User {
        email: string generator=pick(array=["@context.users@production.random.email"])
      }
      ```
    When QATester attempts to generate records using the public generateData API
    Then a generation error should be thrown
    And the error message should mention "matches tags"