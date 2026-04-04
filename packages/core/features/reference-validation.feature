Feature: Reference validation diagnostics from real fixture files
  As a QA tester
  I want broken references to fail before generation with helpful suggestions
  So that I can fix imports, inheritance, context references, template references, and workspace generators quickly

  Scenario: Relative import typos suggest a nearby fixture file
    Given reference validation fixture workspace root "reference-validation/imports/typo"
    And reference validation fixture "main.td" is loaded as the current schema file
    When the reference validation fixture is validated
    Then reference validation should fail with diagnostic code "analyzer.unresolvedImport"
    And the reference validation suggestion should contain "./common/profile.td"

  Scenario: Broken inherited schema references suggest a close schema name
    Given reference validation fixture "reference-validation/inheritance/missing-base.td" is loaded as the current schema file
    When the reference validation fixture is validated
    Then reference validation should fail with diagnostic code "analyzer.undefinedSchema"
    And the reference validation suggestion should contain "BaseUser"

  Scenario: Broken context references suggest a close collection name
    Given reference validation fixture "reference-validation/context/missing-collection.td" is loaded as the current schema file
    And available context collections are:
      | users |
      | orders |
    When the reference validation fixture is validated
    Then reference validation should fail with diagnostic code "analyzer.undefinedContextCollection"
    And the reference validation suggestion should contain "users"

  Scenario: Broken template references suggest a close field name
    Given reference validation fixture "reference-validation/templates/missing-field.td" is loaded as the current schema file
    When the reference validation fixture is validated
    Then reference validation should fail with diagnostic code "analyzer.undefinedTemplateField"
    And the reference validation suggestion should contain "firstName"

  Scenario: Broken workspace generator references suggest a close generator name
    Given reference validation fixture workspace root "reference-validation/workspace/project"
    And reference validation fixture "apps/user-with-typo.td" is loaded as the current schema file
    When the reference validation fixture is validated
    Then reference validation should fail with diagnostic code "analyzer.undefinedWorkspaceGenerator"
    And the reference validation suggestion should contain "@workspace.generators.sharedEmail"