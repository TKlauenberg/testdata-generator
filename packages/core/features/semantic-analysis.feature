Feature: Semantic Analysis
  As a developer
  I want semantic analysis to validate my DSL schemas
  So that I catch errors before attempting data generation

  Background:
    Given the testdata-ai core library is initialized

  @semantic-analysis @happy-path
  Scenario: Valid schema passes semantic analysis
    Given QA Tester has a valid DSL schema:
      """
      schema User {
        id: uuid
        name: string
        age: number
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis succeeded
    And the validated program should contain schema "User"
    And the validated program should have 3 fields

  @semantic-analysis @error-handling
  Scenario: Unsupported type produces error with suggestion
    Given QA Tester has a DSL schema with unsupported type:
      """
      schema User {
        id: uuuid
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And QA Tester should see error with code "analyzer.unsupportedType"
    And the analysis error message should contain "uuuid"
    And the analysis error suggestion should contain "uuid"

  @semantic-analysis @error-handling
  Scenario: Unrecognized generator produces error with suggestion
    Given QA Tester has a DSL schema with unrecognized generator:
      """
      schema User {
        id: string generator = uuidd
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And QA Tester should see error with code "analyzer.unrecognizedGenerator"
    And the analysis error message should contain "uuidd"
    And the analysis error suggestion should contain "uuid"

  @semantic-analysis @circular-dependencies
  Scenario: Circular dependency between schemas is detected
    Given QA Tester has DSL schemas with circular dependency:
      """
      schema User {
        userProfile: Profile
      }
      schema Profile {
        profileUser: User
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And QA Tester should see error with code "analyzer.circularDependency"
    And the analysis error message should match pattern "User.*Profile.*User"

  @semantic-analysis @error-handling
  Scenario: Multiple semantic errors are collected together
    Given QA Tester has a DSL schema with multiple errors:
      """
      schema User {
        id: uuuid generator = uuidd
        userProfile: Profile
      }
      schema Profile {
        profileUser: User
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And QA Tester should see at least 3 errors
    And QA Tester should see error with code "analyzer.unsupportedType"
    And QA Tester should see error with code "analyzer.unrecognizedGenerator"
    And QA Tester should see error with code "analyzer.circularDependency"

  @semantic-analysis @error-handling
  Scenario: Undefined template reference is reported
    Given QA Tester has a DSL schema with undefined template reference:
      """
      schema User {
        firstName: string
        fullName: string generator=randomString(format="{{missingField}}")
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And QA Tester should see error with code "analyzer.undefinedTemplateField"
    And the analysis error message should contain "missingField"

  @semantic-analysis @suggestions
  Scenario: Error messages include helpful suggestions
    Given QA Tester has a DSL schema with typo:
      """
      schema User {
        created: timestampp
      }
      """
    When QA Tester runs semantic analysis
    Then QA Tester should see analysis failed
    And the analysis error suggestion should contain "timestamp"
