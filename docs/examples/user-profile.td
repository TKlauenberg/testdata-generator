# User Profile Schema
# Demonstrates generators and field types

schema UserProfile {
  # Generated identity
  userId: uuid @generate(uuid)

  # Personal information with generators
  firstName: string @generate(firstName)
  lastName: string @generate(lastName)
  email: string @generate(email)

  # Temporal data
  createdAt: timestamp @generate(timestamp)
  birthDate: date @generate(dateRange, start: "1950-01-01", end: "2005-12-31")

  # Numeric fields
  age: number @generate(randomInt, min: 18, max: 90)
  score: number @generate(randomFloat, min: 0.0, max: 100.0)

  # Boolean flags
  isActive: boolean @generate(pick, choices: [true, false])
  isVerified: boolean @generate(pick, choices: [true, false])
}
