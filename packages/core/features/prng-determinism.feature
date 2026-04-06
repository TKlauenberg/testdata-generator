Feature: PRNG Deterministic Generation
  As a developer
  I want a deterministic pseudo-random number generator
  So that I can generate reproducible test data

  Background:
    Given the testdata-generator core library is initialized

  @prng @determinism
  Scenario: Same seed produces identical sequences
    Given Developer creates RNG with seed 12345
    And Developer generates 20 random floats from RNG A
    When Developer creates another RNG with seed 12345
    And Developer generates 20 random floats from RNG B
    Then the sequences from RNG A and RNG B should be identical

  @prng @independence
  Scenario: Different seeds produce different sequences
    Given Developer creates RNG with seed 11111
    And Developer generates 10 random floats from RNG A
    When Developer creates RNG with seed 22222
    And Developer generates 10 random floats from RNG B
    Then the sequences from RNG A and RNG B should be different

  @prng @distribution
  Scenario: Random floats are uniformly distributed
    Given Developer creates RNG with seed 99999
    When Developer generates 10000 random floats
    Then the average should be approximately 0.5 with 5% tolerance
    And all values should be in the range [0, 1)

  @prng @ranges
  Scenario: Integer ranges are respected
    Given Developer creates RNG with seed 777
    When Developer generates 600 random integers between 1 and 6
    Then all generated integers should be between 1 and 6 inclusive
    And each value from 1 to 6 should appear at least once

  @prng @determinism @large-scale
  Scenario: Large sequence generation maintains determinism
    Given Developer creates RNG with seed 555555
    And Developer generates 100000 random floats from RNG A
    When Developer creates another RNG with seed 555555
    And Developer generates 100000 random floats from RNG B
    Then the sequences from RNG A and RNG B should be identical
    And all values in sequence A should be in the range [0, 1)
    And all values in sequence B should be in the range [0, 1)
