Feature: Configuration priority model
  As a developer
  I want clear configuration priority rules
  So that configuration merging is predictable and correct

  Background:
    Given the validation API is available

  Scenario: Built-in defaults apply when no configuration is provided
    Given I have a schema file with the content:
      """
      schema Product {
        id: uuid generator=uuid
        name: string
      }
      """
    When I validate the schema
    Then the validation should succeed
    And the result should contain 1 schema(s)

  Scenario: Global-level generator defaults apply when workspace defaults are absent
    Given I have a schema file with the content:
      """
      schema Order {
        label: string
      }
      """
    And I validate using configured generator defaults:
      | fieldType | generator |
      | string    | pick      |
    When I validate the schema
    Then the validation should succeed
    And field "label" in schema "Order" should resolve generator "pick"

  Scenario: Workspace defaults override global defaults for the same field type
    Given I have a schema file with the content:
      """
      schema Customer {
        tag: string
      }
      """
    And I validate using configured generator defaults:
      | fieldType | generator    |
      | string    | randomString |
    When I validate the schema
    Then the validation should succeed
    And field "tag" in schema "Customer" should resolve generator "randomString"

  Scenario: Schema-level defaults override workspace-level defaults
    Given I have a schema file with the content:
      """
      schema Inventory {
        @defaults {
          string generator=email
        }

        code: string
      }
      """
    And I validate using configured generator defaults:
      | fieldType | generator |
      | string    | pick      |
    When I validate the schema
    Then the validation should succeed
    And field "code" in schema "Inventory" should resolve generator "email"

  Scenario: Field-level declarations override all lower-priority layers
    Given I have a schema file with the content:
      """
      schema Account {
        @defaults {
          string generator=randomString(length=12)
        }

        username: string generator=firstName
      }
      """
    And I validate using configured generator defaults:
      | fieldType | generator |
      | string    | pick      |
    When I validate the schema
    Then the validation should succeed
    And field "username" in schema "Account" should resolve generator "firstName"
