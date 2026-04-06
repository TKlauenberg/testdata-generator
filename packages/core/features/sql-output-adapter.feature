Feature: SQL Output Adapter
  As a QA tester
  I want to generate SQL INSERT statements
  So that I can seed databases with test data

  Background:
    Given the actor QATester

  Scenario: PostgreSQL SQL generated through the public API executes successfully
    Given QATester has DSL source code:
      """
      schema SqlUser {
        id: number
        name: string
        active: boolean
      }
      """
    When QATester generates 3 records using the public generateData API
    And QATester writes the records to SQL file "users-postgres.sql" for table "sql_users" using postgres dialect
    And QATester prepares an in-memory SQL table "sql_users" with columns:
      """
      id REAL, name TEXT, active INTEGER
      """
    And QATester executes the generated SQL against the in-memory table
    Then the generated SQL should contain "-- testdata-generator-metadata:"
    Then the generated SQL should contain "INSERT INTO \"sql_users\""
    And the executed SQL should insert 3 rows
    And executed SQL row 0 field "id" should be numeric
    And executed SQL row 0 field "name" should be a non-empty string

  Scenario: MySQL SQL preserves escaped payloads during SQLite execution
    Given QATester has SQL-ready generated records:
      | id | notes                            | active |
      | 1  | O'Brien'); DROP TABLE users; -- | true   |
      | 2  | plain                            | false  |
    When QATester writes the prepared records to SQL file "users-mysql.sql" for table "qa_users" using mysql dialect and batch size 2
    And QATester prepares an in-memory SQL table "qa_users" with columns:
      """
      id INTEGER, notes TEXT, active INTEGER
      """
    And QATester executes the generated SQL against the in-memory table
    Then the generated SQL should contain "-- testdata-generator-metadata:"
    Then the generated SQL should contain "INSERT INTO `qa_users`"
    And the executed SQL should insert 2 rows
    And executed SQL row 0 field "notes" should equal string "O'Brien'); DROP TABLE users; --"