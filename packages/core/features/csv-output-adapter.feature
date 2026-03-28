Feature: CSV Output Adapter
  As a QA tester
  I want to output generated data as CSV files
  So that I can import the data into spreadsheets and databases

  Background:
    Given the actor QATester

  Scenario: Generate CSV that can be re-imported through the existing CSV loader
    Given QATester has DSL source code:
      """
      schema CsvUser {
        id: number
        name: string
        active: boolean
      }
      """
    When QATester generates 5 records using the public generateData API
    And QATester writes the records to CSV file "users.csv"
    And QATester loads the generated CSV output
    Then the loaded CSV output should contain 5 records
    And the loaded CSV output metadata format should be "csv"
    And loaded CSV output record 0 should include fields "id", "name", and "active"
    And loaded CSV output record 0 field "id" should be numeric
    And loaded CSV output record 0 field "name" should be a non-empty string
    And loaded CSV output record 0 field "active" should be boolean

  Scenario: CSV output preserves quoted values through round-trip parsing
    Given QATester has CSV-ready generated records:
      | id | notes                 | comment         |
      | 1  | Doe, Jane             | He said "hello" |
      | 2  | Line 1\nLine 2       | plain           |
    When QATester writes the prepared records to CSV file "quoted.csv"
    And QATester loads the generated CSV output
    Then loaded CSV output record 0 field "notes" should equal string "Doe, Jane"
    And loaded CSV output record 0 field "comment" should equal string "He said \"hello\""
    And loaded CSV output record 1 field "notes" should equal string "Line 1\nLine 2"