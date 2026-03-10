Feature: Schema-level defaults
  As a QA tester
  I want schema-level defaults to participate in validation with clear precedence
  So that real schemas inherit common settings without losing explicit overrides

  Background:
    Given the validation API is available

  Scenario: Schema defaults apply a generator mapping to matching fields
    Given I have a schema file with the content:
      """
      schema User {
        @defaults {
          string generator=randomString(length=14)
        }

        name: string
      }
      """
    When I validate the schema
    Then the validation should succeed
    And field "name" in schema "User" should resolve generator "randomString"

  Scenario: Schema uniqueness defaults mark fields as unique
    Given I have a schema file with the content:
      """
      schema User {
        @defaults {
          unique=true
        }

        email: string
      }
      """
    When I validate the schema
    Then the validation should succeed
    And field "email" in schema "User" should be marked unique

  Scenario: Schema defaults override configured workspace-style defaults
    Given I have a schema file with the content:
      """
      schema User {
        @defaults {
          string generator=randomString(length=9)
        }

        alias: string
      }
      """
    And I validate using configured generator defaults:
      | fieldType | generator | array             |
      | string    | pick      | workspace-default |
    When I validate the schema
    Then the validation should succeed
    And field "alias" in schema "User" should resolve generator "randomString"

  Scenario: Field-level generators override schema defaults
    Given I have a schema file with the content:
      """
      schema User {
        @defaults {
          string generator=randomString(length=18)
        }

        email: string generator=email
      }
      """
    When I validate the schema
    Then the validation should succeed
    And field "email" in schema "User" should resolve generator "email"