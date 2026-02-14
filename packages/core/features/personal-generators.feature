Feature: Personal Data Generation
  As a QA tester
  I want to generate realistic personal data
  So that my test datasets look like production data

  Background:
    Given the actor QATester

  @personal @firstName
  Scenario: Generate first names deterministically
    When QATester generates 10 first names with seed 12345
    And QATester generates 10 first names with seed 12345 again
    Then both first name sequences should be identical
    And all first names should be non-empty strings

  @personal @firstName
  Scenario: Generate diverse first names
    When QATester generates 50 first names with seed 99999
    Then at least 10 unique first names should be generated

  @personal @lastName
  Scenario: Generate last names deterministically
    When QATester generates 10 last names with seed 54321
    And QATester generates 10 last names with seed 54321 again
    Then both last name sequences should be identical
    And all last names should be non-empty strings

  @personal @lastName
  Scenario: Generate diverse last names
    When QATester generates 50 last names with seed 88888
    Then at least 10 unique last names should be generated

  @personal @fullName
  Scenario: Generate full names combining first and last
    When QATester generates 10 full names with seed 77777
    Then all full names should contain exactly one space
    And all full names should be non-empty strings
    And all full names should have at least two parts

  @personal @fullName
  Scenario: Full names are deterministic with seed
    When QATester generates 5 full names with seed 11111
    And QATester generates 5 full names with seed 11111 again
    Then both full name sequences should be identical

  @personal @email
  Scenario: Generate emails with default domain
    When QATester generates 10 emails with default domain and seed 12345
    Then all emails should end with "@example.com"
    And all emails should match valid email format
    And all emails should be lowercase

  @personal @email
  Scenario: Generate emails with custom domain
    When QATester generates 10 emails with domain "testco.dev" and seed 54321
    Then all emails should end with "@testco.dev"
    And all emails should match valid email format
    And all emails should use firstname.lastname pattern

  @personal @email
  Scenario: Email generation is deterministic
    When QATester generates 5 emails with domain "acme.com" and seed 99999
    And QATester generates 5 emails with domain "acme.com" and seed 99999 again
    Then both email sequences should be identical

  @personal @phoneNumber
  Scenario: Generate phone numbers with default US format
    When QATester generates 10 phone numbers with default format and seed 12345
    Then all phone numbers should match format "(###) ###-####"
    And all phone numbers should contain exactly 10 digits

  @personal @phoneNumber
  Scenario: Generate phone numbers with custom format
    When QATester generates 5 phone numbers with format "###-###-####" and seed 54321
    Then all phone numbers should match format "###-###-####"
    And all phone numbers should contain exactly 10 digits

  @personal @phoneNumber
  Scenario: Generate international phone numbers
    When QATester generates 5 phone numbers with format "+## ### ### ####" and seed 77777
    Then all phone numbers should match format "+## ### ### ####"
    And all phone numbers should contain exactly 12 digits

  @personal @phoneNumber
  Scenario: Phone number generation is deterministic
    When QATester generates 5 phone numbers with format "### ### ####" and seed 11111
    And QATester generates 5 phone numbers with format "### ### ####" and seed 11111 again
    Then both phone number sequences should be identical

  @personal @integration
  Scenario: Generate user records with personal data
    Given QATester has a schema with personal fields:
      """
      schema User {
        id: uuid;
        firstName: firstName;
        lastName: lastName;
        email: email;
        phone: phoneNumber;
      }
      """
    When QATester generates 5 records with seed 42
    Then all records should have valid UUID in "id" field
    And all records should have non-empty "firstName" field
    And all records should have non-empty "lastName" field
    And all records should have valid email in "email" field
    And all records should have valid phone in "phone" field

  @personal @integration
  Scenario: Generate employee directory with full names
    Given QATester has a schema with full name field:
      """
      schema Employee {
        employeeId: sequential;
        name: fullName;
        email: email;
      }
      """
    When QATester generates 10 records with seed 12345
    Then all "name" fields should contain full names with first and last parts
    And all "email" fields should be valid emails with default domain

  @personal @integration @determinism
  Scenario: Personal data is deterministic across schema generation
    Given QATester has a schema with multiple personal fields
    When QATester generates 10 records with seed 99999
    And QATester generates 10 records with seed 99999 again
    Then both record sets should have identical personal data

  @personal @diversity
  Scenario: Verify name diversity across many records
    Given QATester has a schema with first and last name fields
    When QATester generates 100 records with seed 55555
    Then at least 30 unique first names should appear
    And at least 30 unique last names should appear
    And at least 50 unique full name combinations should appear
