Feature: Temporal Data Generation
  As a QA tester
  I want to generate temporal data (dates, timestamps, times, and ranges) for my test schemas
  So that I can create time-based test scenarios with deterministic results

  Background:
    Given QA Tester is working with the testdata-ai system

  @temporal @dates
  Scenario: Generate events with random dates in last year
    Given QA Tester has a schema with date field:
      """
      schema Event {
        id: uuid;
        name: string;
        eventDate: date;
      }
      """
    When QA Tester generates 10 records with seed 12345
    Then all records should have eventDate field
    And all eventDate values should be between 1 year ago and now
    And repeated generation with seed 12345 produces identical dates

  @temporal @timestamps
  Scenario: Generate log entries with Unix timestamps
    Given QA Tester has a schema with timestamp field:
      """
      schema LogEntry {
        id: sequential(1);
        timestamp: timestamp;
        message: string;
      }
      """
    When QA Tester generates 5 records with seed 99999
    Then all records should have timestamp field
    And all timestamp values should be valid Unix timestamps
    And timestamps should be within default range

  @temporal @daterange
  Scenario: Generate date ranges for reservations
    Given QA Tester has a schema with dateRange field:
      """
      schema Reservation {
        id: uuid;
        dateRange: dateRange(86400000);
      }
      """
    When QA Tester generates 8 records with seed 55555
    Then all records should have dateRange field
    And all dateRange values should have start and end properties
    And each dateRange end should equal start plus 86400000 milliseconds

  @temporal @time
  Scenario: Generate time-of-day for scheduling
    Given QA Tester has a schema with time field:
      """
      schema Appointment {
        id: uuid;
        time: time;
      }
      """
    When QA Tester generates 20 records with seed 55555
    Then all records should have time field
    And all time values should match HH:MM:SS format
    And hours should be between 00 and 23
    And minutes should be between 00 and 59
    And seconds should be between 00 and 59

  @temporal @datetime
  Scenario: Generate ISO datetime strings for API responses
    Given QA Tester has a schema with datetime field:
      """
      schema ApiResponse {
        id: uuid;
        datetime: datetime;
      }
      """
    When QA Tester generates 10 records with seed 77777
    Then all records should have datetime field
    And all datetime values should be valid ISO 8601 format
    And datetime values should be parseable as Date objects

  @temporal @customrange
  Scenario: Generate dates with custom range for specific month
    Given QA Tester has a schema with custom date range:
      """
      schema HistoricalEvent {
        id: nanoid;
        occurredOn: date("2024-01-01", "2024-01-31");
      }
      """
    When QA Tester generates 15 records with seed 11111
    Then all records should have occurredOn field
    And all occurredOn values should be in January 2024

  @temporal @determinism
  Scenario: Verify determinism - same seed produces identical temporal data
    Given QA Tester has a schema with multiple temporal fields:
      """
      schema TemporalRecord {
        id: sequential(1);
        createdDate: date;
        createdTimestamp: timestamp;
        scheduledTime: time;
        lastModified: datetime;
      }
      """
    When QA Tester generates 5 records with seed 42424
    And QA Tester generates another 5 records with seed 42424
    Then both generations should produce identical temporal data

  @temporal @validation
  Scenario: Verify date range validity - all dates fall within specified bounds
    Given QA Tester has a schema with constrained date range:
      """
      schema QuarterlyReport {
        id: uuid;
        reportDate: date("2024-07-01", "2024-09-30");
      }
      """
    When QA Tester generates 50 records with seed 88888
    Then all records should have reportDate field
    And all reportDate values should be between 2024-07-01 and 2024-09-30
    And no reportDate should be outside the specified range
