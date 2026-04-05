Feature: History Command
  As a QA manager
  I want to inspect recent generations
  So that I can audit and troubleshoot generated data runs

  Background:
    Given the history test CLI workspace is ready
    And the history test fixture "valid-simple.td" exists in the workspace

  @history
  Scenario: Show the last generations newest first
    When the history test runner executes "td generate valid-simple.td --count 1"
    And the history test runner executes "td generate valid-simple.td --count 2"
    And the history test runner executes "td history --last 10"
    Then the history command should print 2 entries
    And the history command output should list the newest entry first
    And the history command exit code should be 0

  @history
  Scenario: Diff preserved root pattern versions after a pattern edit
    When the history test runner executes "td generate valid-simple.td --count 1"
    And the history test file "valid-simple.td" is updated to:
      """
      schema User {
        id: number
        name: string
        active: boolean
        email: string
      }
      """
    And the history test runner executes "td generate valid-simple.td --count 1"
    And the history test runner diffs the latest two history hashes
    Then the diff command output should contain "modified | root-pattern | valid-simple.td"
    And the diff command output should contain "classification | potentially-breaking"
    And the diff command exit code should be 0

  @history
  Scenario: Diff preserved imported pattern versions after an imported file edit
    Given the history test file "common.td" contains:
      """
      schema SharedProfile {
        id: uuid generator=uuid
      }
      """
    And the history test file "main.td" contains:
      """
      @import "./common.td"

      schema User {
        account: SharedProfile
      }
      """
    When the history test runner executes "td generate main.td --count 1"
    And the history test file "common.td" is updated to:
      """
      schema SharedProfile {
        id: uuid generator=uuid
        email: string
      }
      """
    And the history test runner executes "td generate main.td --count 1"
    And the history test runner diffs the latest two history hashes
    Then the diff command output should contain "modified | imported-pattern | common.td"
    And the diff command exit code should be 0

  @history
  Scenario: Report no changes for identical pattern hashes
    When the history test runner executes "td generate valid-simple.td --count 1"
    And the history test runner executes "td generate valid-simple.td --count 2"
    And the history test runner diffs the latest two history hashes
    Then the diff command output should contain "No changes between pattern versions"
    And the diff command exit code should be 0

  @history
  Scenario: Return a clear error when a requested pattern hash is unknown
    When the history test runner executes "td generate valid-simple.td --count 1"
    And the history test runner diffs the latest history hash against an unknown hash
    Then the diff command stderr should contain "Unknown pattern hash"
    And the diff command exit code should be 1