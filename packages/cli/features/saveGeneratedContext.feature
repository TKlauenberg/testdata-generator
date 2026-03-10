Feature: Save generated data as reusable context through the CLI
  As a QA tester
  I want td generate to persist generated records as reusable context
  So that the command-line workflow proves the save-context path works end to end

  Scenario: Save generated records into the default contexts directory
    Given a temporary CLI workspace
    And a DSL schema file "seed-users.td" with contents:
      """
      schema SeedUser {
        email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com"])
      }
      """
    When the tester runs "td generate seed-users.td --count 2 --save-context generated-users"
    Then the CLI exit code should be 0
    And the saved context file "contexts/generated-users.json" should exist
    And the saved context file "contexts/generated-users.json" should contain 2 records
    And the saved context file "contexts/generated-users.json" should record source pattern "seed-users.td"

  Scenario: Automatically load global defaults for omitted generate options
    Given a temporary CLI workspace
    And a global CLI config file with contents:
      """
      {
        "defaults": {
          "count": 3,
          "format": "json"
        },
        "context": {
          "saveDirectory": "global-contexts"
        }
      }
      """
    And a DSL schema file "seed-users.td" with contents:
      """
      schema SeedUser {
        email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com", "qa.three@example.com"])
      }
      """
    When the tester runs "td generate seed-users.td --save-context generated-users"
    Then the CLI exit code should be 0
    And stdout should contain 3 generated records
    And the saved context file "global-contexts/generated-users.json" should exist

  Scenario: Explicit CLI flags override global defaults
    Given a temporary CLI workspace
    And a global CLI config file with contents:
      """
      {
        "defaults": {
          "count": 6,
          "format": "json"
        },
        "context": {
          "saveDirectory": "global-contexts"
        }
      }
      """
    And a DSL schema file "seed-users.td" with contents:
      """
      schema SeedUser {
        email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com", "qa.three@example.com"])
      }
      """
    When the tester runs "td generate seed-users.td --count 2 --save-context generated-users --save-context-dir explicit-contexts"
    Then the CLI exit code should be 0
    And stdout should contain 2 generated records
    And the saved context file "explicit-contexts/generated-users.json" should exist

  Scenario: Workspace config overrides global defaults from a nested working directory
    Given a temporary CLI workspace
    And a global CLI config file with contents:
      """
      {
        "defaults": {
          "count": 5,
          "format": "json"
        },
        "context": {
          "saveDirectory": "global-contexts"
        }
      }
      """
    And a workspace CLI config file with contents:
      """
      {
        "defaults": {
          "count": 2,
          "format": "json"
        },
        "context": {
          "saveDirectory": "workspace-contexts"
        }
      }
      """
    And a nested working directory "nested/team"
    And a DSL schema file "nested/team/seed-users.td" with contents:
      """
      schema SeedUser {
        email: string generator=pick(array=["qa.one@example.com", "qa.two@example.com", "qa.three@example.com"])
      }
      """
    When the tester runs "td generate seed-users.td --save-context generated-users"
    Then the CLI exit code should be 0
    And stdout should contain 2 generated records
    And the saved context file "nested/team/workspace-contexts/generated-users.json" should exist
