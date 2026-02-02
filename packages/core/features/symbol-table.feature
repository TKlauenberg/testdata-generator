Feature: Symbol Table
  As a semantic analyzer
  I want to track all defined symbols with their kinds and locations
  So that I can validate references and detect duplicate definitions

  Background:
    Given a new symbol table

  Scenario: Define and lookup schema symbol
    When I define a schema "User" at line 1, column 1
    Then the schema "User" should exist in the symbol table
    And the symbol "User" should have kind "schema"
    And the symbol "User" should have location line 1, column 1

  Scenario: Define and lookup field symbol within schema
    Given I define a schema "User" at line 1, column 1
    When I define a field "email" in schema "User" at line 2, column 3
    Then the field "email" in schema "User" should exist
    And the field symbol should have kind "field"
    And the field symbol should have location line 2, column 3

  Scenario: Detect duplicate schema definition
    Given I define a schema "User" at line 5, column 1
    When I attempt to define a schema "User" at line 10, column 1
    Then the operation should fail with error code "analyzer.duplicateSchema"
    And the error message should contain "User"
    And the error location should be line 10, column 1
    And the error should reference the original definition at line 5, column 1

  Scenario: Detect duplicate field within same schema
    Given I define a schema "User" at line 1, column 1
    And I define a field "email" in schema "User" at line 2, column 3
    When I attempt to define a field "email" in schema "User" at line 5, column 3
    Then the operation should fail with error code "analyzer.duplicateField"
    And the error message should contain "email"
    And the error location should be line 5, column 3
    And the error should reference the original definition at line 2, column 3

  Scenario: Fields with same name in different schemas are allowed
    Given I define a schema "User" at line 1, column 1
    And I define a schema "Product" at line 10, column 1
    When I define a field "id" in schema "User" at line 2, column 3
    And I define a field "id" in schema "Product" at line 11, column 3
    Then both field definitions should succeed
    And the field "id" in schema "User" should exist
    And the field "id" in schema "Product" should exist

  Scenario: Lookup undefined symbol returns undefined
    When I lookup a schema "NonExistent"
    Then the lookup should return undefined

  Scenario: Context and profile symbols are tracked separately
    Given I define a schema "Entity" at line 1, column 1
    And I define a context "TestContext" at line 10, column 1
    And I define a profile "TestProfile" at line 20, column 1
    Then the schema "Entity" should exist
    And the context "TestContext" should exist
    And the profile "TestProfile" should exist
    And all three symbols should be independently accessible

  Scenario: Schema, context, and profile with same name are tracked separately
    Given I define a schema "Entity" at line 1, column 1
    When I define a context "Entity" at line 10, column 1
    And I define a profile "Entity" at line 20, column 1
    Then the schema "Entity" should exist
    And the context "Entity" should exist
    And the profile "Entity" should exist

  Scenario: Nested scope lookup resolves to parent scope
    Given I define a schema "User" at line 1, column 1
    When I enter scope "User" with kind "schema"
    Then I should be able to lookup schema "User" from the nested scope
    When I exit scope
    Then I should still be able to lookup schema "User"

  Scenario: Symbol table reports all defined symbols
    Given I define a schema "User" at line 1, column 1
    And I define a schema "Product" at line 10, column 1
    And I define a field "id" in schema "User" at line 2, column 3
    And I define a field "name" in schema "User" at line 3, column 3
    When I retrieve all symbols
    Then I should get at least 4 symbols
    And the symbols should include "User" with kind "schema"
    And the symbols should include "Product" with kind "schema"
    And the symbols should include "id" with kind "field"
    And the symbols should include "name" with kind "field"
