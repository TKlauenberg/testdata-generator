Feature: Schema extension from real fixture files
  As a QA tester
  I want schemas to extend other schemas through the active BDD runner
  So that inherited, overridden, and derived fields generate correctly end to end

  Scenario: Imported base schemas can be extended and generated
    Given schema extension fixture "apps/extended.td" is loaded as the current schema file
    When the schema extension fixture is validated
    Then schema extension validation should succeed
    And validated schema extensions should include "User"
    And validated schema extensions should include "ExtendedUser"
    When records are generated from the schema extension fixture
    Then generated record for schema "ExtendedUser" field "id" should equal "base-id"
    And generated record for schema "ExtendedUser" field "fullName" should equal "Base User"
    And generated record for schema "ExtendedUser" field "email" should equal "extended@example.com"
    And generated record for schema "ExtendedUser" field "slug" should equal "base-id-qa"

  Scenario: Missing base schemas are reported from the extends clause
    Given schema extension fixture "missing-base.td" is loaded as the current schema file
    When the schema extension fixture is validated
    Then schema extension validation should fail with diagnostic code "analyzer.undefinedSchema"

  Scenario: Circular inheritance is reported from the extends clause
    Given schema extension fixture "circular.td" is loaded as the current schema file
    When the schema extension fixture is validated
    Then schema extension validation should fail with diagnostic code "analyzer.circularDependency"
