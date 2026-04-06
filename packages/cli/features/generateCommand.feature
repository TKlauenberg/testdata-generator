Feature: Generate Command
  As a QA tester
  I want to generate test data from DSL schemas
  So that I can create test datasets in the format I need

  Background:
    Given the testdata-generator CLI is installed

  @generate @json
  Scenario: Generate JSON to stdout by default
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td"
    Then QA Tester should see JSON output on stdout
    And QA Tester should see generation metadata in JSON output on stdout
    And the generate command exit code should be 0

  @generate @csv
  Scenario: Infer CSV output from the output file extension
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --output reports/users.csv"
    Then the generated file "reports/users.csv" should contain generation metadata comment
    Then the generated file "reports/users.csv" should start with "id,name,active"
    And the generate command exit code should be 0

  @generate @sql
  Scenario: Infer SQL output and table name from the output file extension
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --output reports/audit-log.sql"
    Then the generated file "reports/audit-log.sql" should contain generation metadata comment
    Then the generated file "reports/audit-log.sql" should contain SQL inserts for table "audit-log"
    And the generate command exit code should be 0

  @generate @sql
  Scenario: Generate SQL to stdout with an explicit table name
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --format sql --table-name qa_users"
    Then QA Tester should see SQL output for table "qa_users" on stdout
    And QA Tester should see SQL metadata comment on stdout
    And the generate command exit code should be 0

  @generate @precedence
  Scenario: Let explicit format override the output file extension
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --format csv --output reports/users.json"
    Then the generated file "reports/users.json" should contain generation metadata comment
    Then the generated file "reports/users.json" should start with "id,name,active"
    And the generate command exit code should be 0

  @generate @context
  Scenario: Save generated context as JSON even when CSV output is selected
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --format csv --save-context csv-users"
    Then QA Tester should see CSV output on stdout
    And QA Tester should see CSV metadata comment on stdout
    And the generated context file "contexts/csv-users.json" should exist
    And the generated context file "contexts/csv-users.json" should contain 2 records
    And the generate command exit code should be 0

  @generate @history
  Scenario: Create and accumulate generation history by default
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 1"
    And QA Tester runs "td generate valid-simple.td --count 2"
    Then the history log file ".td-history.jsonl" should exist
    And the history log file ".td-history.jsonl" should contain 2 entries
    And the history log file ".td-history.jsonl" should contain a "success" entry
    And the generate command exit code should be 0

  @generate @history
  Scenario: Disable generation history with --no-history
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --count 2 --no-history"
    Then QA Tester should see JSON output on stdout
    Then the history log file ".td-history.jsonl" should not exist
    And the generate command exit code should be 0

  @generate @validation
  Scenario: Reject SQL table names for non-SQL formats
    Given QA Tester has a valid DSL schema fixture "valid-simple.td"
    When QA Tester runs "td generate valid-simple.td --format json --table-name qa_users"
    Then stderr should contain "--table-name can only be used when the effective output format is sql"
    And the generate command exit code should be 1
