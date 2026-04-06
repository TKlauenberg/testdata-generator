Feature: Init Command - Schema Template Initialization
  As a QA tester
  I want to initialize new schemas from templates
  So that I can quickly start with example schemas

  Background:
    Given the testdata-generator CLI is installed
    And QA Tester is in an empty directory

  @init @happy-path
  Scenario: Create basic template successfully
    When QA Tester runs "td init"
    Then the command should succeed with exit code 0
    And a file named "basic.td" should be created
    And the file should contain a valid schema definition
    And QA Tester should see "✓ Created basic.td"
    And QA Tester should see "Next steps"
    And QA Tester should see "td validate basic.td"
    And QA Tester should see "td generate basic.td"

  @init @template-selection
  Scenario: Create basic template explicitly
    When QA Tester runs "td init basic"
    Then the command should succeed with exit code 0
    And a file named "basic.td" should be created
    And the file should contain a valid schema definition

  @init @error-handling
  Scenario: Invalid template name
    When QA Tester runs "td init nonexistent"
    Then the command should fail with exit code 3
    And the error output should contain "Template 'nonexistent' not found"
    And the error output should contain "Available templates: basic"
    And no file should be created

  @init @file-handling
  Scenario: File already exists - cancel operation
    Given a file named "basic.td" already exists
    When QA Tester runs "td init" and answers "n"
    Then the command should fail with exit code 3
    And QA Tester should see "Operation cancelled"
    And the existing file should not be modified

  @init @file-handling
  Scenario: File already exists - confirm overwrite
    Given a file named "basic.td" already exists with content "old schema"
    When QA Tester runs "td init" and answers "y"
    Then the command should succeed with exit code 0
    And the file "basic.td" should be overwritten
    And the file should contain the template content
    And the file should not contain "old schema"

  @init @guidance
  Scenario: Display helpful next steps after creation
    When QA Tester runs "td init"
    Then QA Tester should see guidance with:
      | Next Step | Description                            |
      | Edit      | Edit basic.td to customize your schema |
      | Validate  | td validate basic.td                   |
      | Generate  | td generate basic.td --count 10        |
    And QA Tester should see "docs/dsl-reference.md" reference

  @init @template-validity
  Scenario: Created template should be valid
    When QA Tester runs "td init"
    And QA Tester runs "td validate basic.td"
    Then the validate command should succeed
    And QA Tester should see "✓ Schema is valid"

  @init @integration
  Scenario: Created template can be used for generation
    When QA Tester runs "td init"
    And QA Tester runs "td generate basic.td --count 5"
    Then the generate command should succeed
    And QA Tester should see generated data

  @init @user-experience
  Scenario: Complete workflow from init to generation
    Given QA Tester is learning testdata-generator DSL
    When QA Tester runs "td init"
    Then a file named "basic.td" should be created
    And QA Tester should see clear next steps
    When QA Tester runs "td validate basic.td"
    Then QA Tester should see "✓ Schema is valid"
    When QA Tester runs "td generate basic.td --count 3"
    Then QA Tester should see 3 generated records
    And QA Tester has successfully learned the DSL workflow
