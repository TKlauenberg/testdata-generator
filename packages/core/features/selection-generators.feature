Feature: Selection Generators
  As a QA tester
  I want to select values from predefined lists with optional weights
  So that test data includes realistic enum-like fields and distribution patterns

  Background:
    Given QATester uses selection generators

  @selection @pick
  Scenario: Generate uniform selections deterministically
    When QATester picks from array ["active", "inactive", "pending"] with seed 11111
    And QATester picks from array ["active", "inactive", "pending"] with seed 11111 again
    Then both pick sequences should be identical
    And all picked values should be from the original array

  @selection @pick @distribution
  Scenario: Verify uniform distribution for pick
    When QATester picks from array ["A", "B", "C", "D"] 1000 times with seed 22222
    Then each element should be selected approximately 25% of the time

  @selection @weightedPick
  Scenario: Generate weighted selections deterministically
    When QATester uses weighted options with seed 33333:
      | value      | weight |
      | active     | 70     |
      | inactive   | 20     |
      | suspended  | 10     |
    And QATester uses weighted options with seed 33333 again:
      | value      | weight |
      | active     | 70     |
      | inactive   | 20     |
      | suspended  | 10     |
    Then both weighted pick sequences should be identical
    And all weighted values should be from the original options

  @selection @weightedPick @distribution
  Scenario: Verify weighted distribution respects probabilities
    When QATester uses weighted options 1000 times with seed 44444:
      | value      | weight |
      | active     | 70     |
      | inactive   | 20     |
      | suspended  | 10     |
    Then "active" should be selected approximately 70% of the time
    And "inactive" should be selected approximately 20% of the time
    And "suspended" should be selected approximately 10% of the time

  @selection @schema @enum
  Scenario: Generate schema with enum-like field using pick
    Given a schema with fields:
      """
      schema User {
        id: uuid
        status: pick(["active", "inactive", "pending", "suspended"])
      }
      """
    When QATester generates 20 records with seed 55555
    Then all "status" values should be one of ["active", "inactive", "pending", "suspended"]

  @selection @schema @weighted
  Scenario: Generate schema with weighted field for realistic distributions
    Given a schema with fields:
      """
      schema User {
        id: uuid
        accountType: weightedPick([
          {value: "free", weight: 70},
          {value: "premium", weight: 25},
          {value: "enterprise", weight: 5}
        ])
      }
      """
    When QATester generates 100 records with seed 66666
    Then approximately 70% of records should have accountType "free"
    And approximately 25% of records should have accountType "premium"
    And approximately 5% of records should have accountType "enterprise"

  @selection @determinism
  Scenario: Verify determinism across all selection generators
    When QATester generates a selection snapshot with seed 77777
    And QATester generates the same selection snapshot with seed 77777 again
    Then both selection snapshots should be identical
