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

  @uniqueness @generation
  Scenario: Enforce single-field uniqueness during generation
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema User {
        id: number generator=randomInt(min=1, max=50) unique
      }
      """
    When Dev generates 50 records for uniqueness constraints
    Then all generated values for field "id" should be unique

  @uniqueness @generation @failure
  Scenario: Report clear failure when uniqueness cannot be satisfied
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema User {
        status: string generator=pick(array=["same-value"]) unique
      }
      """
    When Dev attempts to generate 2 records for uniqueness constraints
    Then uniqueness generation should fail
    And uniqueness failure should mention field "status"
    And uniqueness failure should suggest increasing value variety

  @uniqueness @generation @session-reset
  Scenario: Uniqueness tracking resets between separate generation sessions
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema User {
        status: string generator=pick(array=["only-value"]) unique
      }
      """
    When Dev generates 1 records for uniqueness constraints
    And Dev generates 1 records for uniqueness constraints
    Then all generated values for field "status" should be unique

  @uniqueness @generation @composite
  Scenario: Composite email+tenantId remains unique across 50 records
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema User {
        email: string generator=pick(array=["a@test.com", "b@test.com", "c@test.com", "d@test.com", "e@test.com", "f@test.com", "g@test.com", "h@test.com", "i@test.com", "j@test.com"])
        tenantId: string generator=pick(array=["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"])
        unique(email, tenantId)
      }
      """
    When Dev generates 50 records for uniqueness constraints
    Then all generated composite values for fields "email,tenantId" should be unique

  @uniqueness @generation @composite
  Scenario: Composite userId+resourceId remains unique across 30 records
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema Access {
        userId: string generator=pick(array=["u1", "u2", "u3", "u4", "u5", "u6"])
        resourceId: string generator=pick(array=["r1", "r2", "r3", "r4", "r5", "r6"])
        action: string generator=pick(array=["read", "write", "delete"])
        unique(userId, resourceId)
      }
      """
    When Dev generates 30 records for uniqueness constraints
    Then all generated composite values for fields "userId,resourceId" should be unique

  @uniqueness @generation @composite @failure
  Scenario: Composite uniqueness failure reports clear field list
    Given Dev has uniqueness-enforced DSL source code:
      """
      schema User {
        email: string generator=pick(array=["same@test.com"])
        tenantId: string generator=pick(array=["tenant-only"])
        unique(email, tenantId)
      }
      """
    When Dev attempts to generate 2 records for uniqueness constraints
    Then uniqueness generation should fail
    And uniqueness failure should mention composite fields "email,tenantId"
