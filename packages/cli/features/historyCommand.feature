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