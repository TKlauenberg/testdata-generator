Feature: Example BDD Test with Screenplay Pattern
  As a developer
  I want to see an example of BDD testing with Screenplay pattern
  So that I can write similar tests for actual features

  Background:
    Given the testdata-generator core library is initialized

  @example @happy-path
  Scenario: Simple calculation demonstration
    Given QA Tester has two numbers: 2 and 3
    When QA Tester adds the numbers together
    Then QA Tester should see the result is 5

  @example @multiple-operations
  Scenario: Multiple operations in sequence
    Given QA Tester has two numbers: 10 and 5
    When QA Tester subtracts the second from the first
    Then QA Tester should see the result is 5
    When QA Tester multiplies the result by 2
    Then QA Tester should see the result is 10

  @example @screenplay-pattern
  Scenario: Demonstrating Screenplay pattern structure
    Given Developer wants to understand Screenplay pattern
    Then Developer should know that Actors represent users
    And Developer should know that Abilities define what Actors can do
    And Developer should know that Tasks represent high-level actions
    And Developer should know that Questions query system state
