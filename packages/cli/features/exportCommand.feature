Feature: Export Command
  As an operator preparing for future platform migration
  I want to export existing local artifacts into a deterministic bundle
  So that future platform import has complete lineage and metadata

  Background:
    Given the export test workspace exists

  Scenario: Export a context-backed generated artifact as a platform-ready bundle
    Given a context-backed generated JSON artifact "reports/exportable.json" with matching audit history
    When the operator runs "td export reports/exportable.json --platform-ready"
    Then the export command exit code should be 0
    And stdout should contain a platform-ready export bundle
    And the platform-ready bundle should describe artifact type "generated-json"
    And the platform-ready bundle should preserve context reference metadata
    And the platform-ready bundle should include matching history and pattern snapshot data

  Scenario: Write a platform-ready bundle to a file
    Given a saved-context export artifact "contexts/exportable.json" with matching audit history
    When the operator runs "td export contexts/exportable.json --platform-ready --output exports/platform-ready.json"
    Then the export command exit code should be 0
    And the file "exports/platform-ready.json" should contain a platform-ready export bundle
    And the platform-ready bundle file "exports/platform-ready.json" should describe artifact type "saved-context-json"