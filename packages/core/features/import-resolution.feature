Feature: Import resolution from filesystem fixtures
  As a QA tester
  I want import statements to resolve real files on disk
  So that reusable schemas can be validated through the active BDD runner

  Scenario: Relative imports merge declarations from fixture files
    Given import fixture "relative/main.td" is loaded as the current schema file
    When the import fixture is validated
    Then import validation should succeed
    And validated schemas should include "Profile"
    And validated schemas should include "User"

  Scenario: Workspace imports resolve from the configured workspace root fixture
    Given import fixture workspace root "workspace"
    And import fixture "workspace/apps/main.td" is loaded as the current schema file
    When the import fixture is validated
    Then import validation should succeed
    And validated schemas should include "SharedProfile"
    And validated schemas should include "User"

  Scenario: Circular imports are reported from fixture files
    Given import fixture "circular/a.td" is loaded as the current schema file
    When the import fixture is validated
    Then import validation should fail with diagnostic code "analyzer.circularDependency"