Feature: AST Node Construction and Validation
  As a parser implementation
  I want to construct type-safe AST nodes
  So that I can represent parsed DSL structures with immutability guarantees

  Background:
    Given QA Tester can construct AST nodes

  Scenario: construct a valid Program node
    When QA Tester constructs a Program node with 0 declarations
    Then QA Tester should see the node has kind "program"
    And QA Tester should see the node has an empty declarations array

  Scenario: construct a valid SchemaNode
    When QA Tester constructs a SchemaNode named "User" with 0 fields
    Then QA Tester should see the node has kind "schema"
    And QA Tester should see the node has name "User"
    And QA Tester should see the node has an empty fields array

  Scenario: construct a FieldNode with generator
    When QA Tester constructs a FieldNode named "id" with type "string" and generator "uuid"
    Then QA Tester should see the node has kind "field"
    And QA Tester should see the node has name "id"
    And QA Tester should see the node has type "string"
    And QA Tester should see the node has generator "uuid"

  Scenario: construct a FieldNode with constraints
    When QA Tester constructs a FieldNode named "email" with uniqueness constraint
    Then QA Tester should see the node has kind "field"
    And QA Tester should see the node has unique constraint set to true

  Scenario: construct a complete schema with fields
    When QA Tester constructs a SchemaNode named "User" with fields:
      | name  | type   | generator |
      | id    | string | uuid      |
      | email | string | email     |
    Then QA Tester should see the node has 2 fields
    And QA Tester should see field 0 has name "id"
    And QA Tester should see field 1 has name "email"

  Scenario: Type guard identifies SchemaNode correctly
    Given QA Tester has constructed a SchemaNode named "Product"
    When QA Tester checks if the node is a SchemaNode
    Then QA Tester should see the SchemaNode type guard returns true

  Scenario: Type guard rejects non-matching node type
    Given QA Tester has constructed a FieldNode named "id"
    When QA Tester checks if the node is a SchemaNode
    Then QA Tester should see the SchemaNode type guard returns false

  Scenario: FieldNode type guard identifies correctly
    Given QA Tester has constructed a FieldNode named "age"
    When QA Tester checks if the node is a FieldNode
    Then QA Tester should see the FieldNode type guard returns true

  Scenario: All nodes include source location
    When QA Tester constructs a SchemaNode named "User"
    Then QA Tester should see the node has a location property
    And QA Tester should see the location has file "test.td"
    And QA Tester should see the location has line 1

  Scenario: construct ProfileNode for future use
    When QA Tester constructs a ProfileNode named "Standard" with 0 defaults
    Then QA Tester should see the node has kind "profile"
    And QA Tester should see the node has name "Standard"
    And QA Tester should see the node has an empty defaults array

  Scenario: immutable operations preserve original nodes
    Given QA Tester has constructed a SchemaNode named "User" with 1 field
    When QA Tester creates a new schema by adding a field immutably
    Then QA Tester should see the original schema still has 1 field
    And QA Tester should see the new schema has 2 fields
