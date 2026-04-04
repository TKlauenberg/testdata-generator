Feature: Workspace shared generators from real config fixtures
  As a QA tester
  I want shared workspace generators to validate and generate through real fixture files
  So that team-defined generator patterns work end to end in actual schemas

  Scenario: Template-backed workspace generator resolves and generates from fixture config
    Given workspace generator fixture workspace root "project"
    And workspace generator fixture schema "apps/user.td" is loaded
    When the workspace generator fixture is validated
    Then workspace generator validation should succeed
    And schema "User" field "email" should resolve generator "@workspace.generators.sharedEmail"
    When records are generated from the workspace generator fixture
    Then generated record field "email" should equal "qa.team@example.com"

  Scenario: Composition-backed workspace generator generates from fixture config
    Given workspace generator fixture workspace root "project"
    And workspace generator fixture schema "apps/ticket.td" is loaded
    When the workspace generator fixture is validated
    Then workspace generator validation should succeed
    And schema "Ticket" field "code" should resolve generator "@workspace.generators.ticketCode"
    When records are generated from the workspace generator fixture
    Then generated record field "code" should equal "QA-007"