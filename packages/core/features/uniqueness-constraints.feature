Feature: Uniqueness Constraint Tracking
  As a developer
  I want to track generated values for uniqueness constraints
  So that duplicates can be detected before enforcement logic runs

  @uniqueness @tracker
  Scenario: Track first-seen and duplicate single-field values
    Given Dev has a fresh uniqueness tracker
    When Dev tracks value "ada@example.com" for field "email"
    And Dev tracks value "ada@example.com" for field "email" again
    Then the first tracking result should be true
    And the second tracking result should be false

  @uniqueness @tracker @composite
  Scenario: Track composite uniqueness keys deterministically
    Given Dev has a fresh uniqueness tracker
    When Dev tracks composite fields "firstName,lastName" with values "Ada,Lovelace"
    And Dev tracks composite fields "firstName,lastName" with values "Ada,Lovelace" again
    Then the first tracking result should be true
    And the second tracking result should be false

  @uniqueness @tracker @reset
  Scenario: Reset tracker state between sessions
    Given Dev has a fresh uniqueness tracker
    When Dev tracks value "42" for field "id"
    And Dev clears the uniqueness tracker
    And Dev tracks value "42" for field "id" again
    Then the second tracking result should be true
