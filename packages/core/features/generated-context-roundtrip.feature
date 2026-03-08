Feature: Generated context roundtrip
  As a QA tester
  I want to save generated data as context for later generations
  So that I can build incremental test scenarios from prior outputs

  Background:
    Given the actor QATester

  Scenario: Generate records, save them as context, and reuse them in a later generation
    Given QATester has DSL source code:
      """
      schema SeedUser {
        email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com"])
      }
      """
    When QATester generates 2 records using the public generateData API
    And QATester saves the generated records as context "generated-users" with tags "Regression, smoke" and source pattern "schemas/generated-users.td"
    And QATester loads the saved context as collection "users"
    And QATester has DSL source code:
      """
      schema FollowUpInvite {
        email: string generator=pick(array=["@context.users.random.email"])
      }
      """
    And QATester generates 5 records with seed 42 using the public generateData API
    Then exactly 5 records should be generated
    And each generated record should have field "email" in set "qa.one@example.com, qa.two@example.com"
    And the saved context metadata should include tags "regression, smoke"
    And the saved context metadata should include source pattern "schemas/generated-users.td"