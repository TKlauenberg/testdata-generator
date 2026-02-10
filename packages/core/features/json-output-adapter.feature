Feature: JSON Output Adapter
  As a QA tester
  I want to output generated data as JSON files
  So that I can use the test data in my applications and test frameworks

  Background:
    Given the actor QATester

  Scenario: Generate small dataset to JSON array format
    Given QATester has DSL source code:
      ```
      schema User {
        id: number
        name: string
      }
      ```
    When QATester generates 5 records using the public generateData API
    And QATester writes the records to JSON file "users.json" in array format
    Then the JSON file should exist at "users.json"
    And the JSON file should contain a valid JSON array
    And the array should have exactly 5 elements
    And each element should have fields "id" and "name"

  Scenario: Generate dataset to JSONL format
    Given QATester has DSL source code:
      ```
      schema Product {
        sku: string
        price: number
      }
      ```
    When QATester generates 10 records using the public generateData API
    And QATester writes the records to JSON file "products.jsonl" in JSONL format
    Then the JSONL file should exist at "products.jsonl"
    And the file should contain exactly 10 lines of JSON
    And each line should be valid JSON
    And each line should have fields "sku" and "price"

  Scenario: Verify metadata in JSON output
    Given QATester has DSL source code:
      ```
      schema Item {
        id: number
      }
      ```
    When QATester generates 3 records with seed 42 using the public generateData API
    And QATester writes the records to JSON file "items-with-metadata.json" in array format with metadata
    Then the JSON file should contain metadata
    And the metadata should include "timestamp"
    And the metadata should include "count" with value 3
    And the metadata should include "seed" with value 42

  Scenario: Large dataset written incrementally without memory issues
    Given QATester has DSL source code:
      ```
      schema Record {
        id: number
        data: string
      }
      ```
    When QATester generates 50000 records using the public generateData API
    And QATester writes the records to JSON file "large-dataset.json" in array format
    Then the JSON file should be created successfully
    And memory usage should remain reasonable
    And the JSON array should contain 50000 records

  Scenario: Output can be parsed by standard JSON parsers
    Given QATester has DSL source code:
      ```
      schema TestData {
        value: string
        count: number
        active: boolean
      }
      ```
    When QATester generates 100 records using the public generateData API
    And QATester writes the records to JSON file "parsable.json" in array format
    Then the JSON file can be parsed by the standard JSON parser
    And all 100 records should be present in the parsed data

  Scenario: Special characters are properly escaped in JSON
    Given QATester has DSL source code with special characters:
      ```
      schema SpecialChars {
        text: string
        count: number
      }
      ```
    When QATester generates 5 records using the public generateData API
    And QATester writes the records to JSON file "special-chars.json" in array format
    Then the JSON file should be valid JSON
    And special characters should be properly escaped
    And the file can be parsed without errors

  Scenario: Empty record set produces valid output
    Given QATester has empty DSL source code
    When QATester generates 0 records using the public generateData API
    And QATester writes the records to JSON file "empty.json" in array format
    Then the JSON file should contain an empty array
    And the file should be valid JSON

  Scenario: JSONL format for streaming large datasets
    Given QATester has DSL source code:
      ```
      schema StreamingData {
        id: number
        value: string
      }
      ```
    When QATester generates 10000 records using the public generateData API
    And QATester writes the records to JSON file "streaming.jsonl" in JSONL format
    Then the JSONL file should be created successfully
    And the file should contain 10000 lines
    And each line should be independently parsable JSON
    And memory usage should remain constant throughout

  Scenario: JSON array format with nested objects
    Given QATester has DSL source code with complex structure:
      ```
      schema ComplexData {
        id: number
        name: string
        active: boolean
      }
      ```
    When QATester generates 20 records using the public generateData API
    And QATester writes the records to JSON file "complex.json" in array format
    Then the JSON file should contain valid nested JSON structures
    And all 20 records should be properly formatted

  Scenario: Concurrent writes to different files
    Given QATester has DSL source code:
      ```
      schema ConcurrentData {
        value: number
      }
      ```
    When QATester generates 100 records for file "concurrent1.json" in array format
    And QATester generates 100 records for file "concurrent2.json" in JSONL format
    Then both JSON files should exist
    And "concurrent1.json" should contain a valid JSON array with 100 records
    And "concurrent2.json" should contain 100 lines of valid JSONL

  Scenario: Metadata includes source pattern information
    Given QATester has DSL source code:
      ```
      schema User {
        username: string
        email: string
      }
      ```
    When QATester generates 5 records using the public generateData API
    And QATester writes the records with source pattern "User" to file "user-data.json"
    Then the metadata should include sourcePattern "User"
    And the metadata should have correct record count
