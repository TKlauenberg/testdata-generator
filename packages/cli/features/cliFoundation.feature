Feature: CLI Foundation
  As a QA tester
  I want a working command-line interface
  So that I can use testdata-ai from the command line

  Background:
    Given the testdata-ai CLI is installed

  @cli @happy-path
  Scenario: Display version information
    When QA Tester runs "td --version"
    Then QA Tester should see the version number "0.1.0"
    And the exit code should be 0

  @cli @happy-path
  Scenario: Display version with short flag
    When QA Tester runs "td -V"
    Then QA Tester should see the version number "0.1.0"
    And the exit code should be 0

  @cli @happy-path
  Scenario: Display help information
    When QA Tester runs "td --help"
    Then QA Tester should see "testdata-ai"
    And QA Tester should see "Declarative test data generation"
    And QA Tester should see "Options:"
    And the exit code should be 0

  @cli @happy-path
  Scenario: Display help with short flag
    When QA Tester runs "td -h"
    Then QA Tester should see "testdata-ai"
    And the exit code should be 0

  @cli @error-handling
  Scenario: Handle invalid flags gracefully
    When QA Tester runs "td --invalid-flag"
    Then QA Tester should see an error message
    And the exit code should not be 0

  @cli @error-handling
  Scenario: Handle unknown commands gracefully
    When QA Tester runs "td unknown-command"
    Then QA Tester should see an error message
    And the exit code should not be 0

  @cli @information
  Scenario: CLI displays correct program name
    When QA Tester runs "td --help"
    Then QA Tester should see "Usage: td"

  @cli @information
  Scenario: CLI shows available options
    When QA Tester runs "td --help"
    Then QA Tester should see "-V, --version"
    And QA Tester should see "-h, --help"
