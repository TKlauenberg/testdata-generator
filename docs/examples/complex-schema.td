# Complex Schema Example
# Demonstrates multiple schemas and relationships

schema Organization {
  orgId: uuid @generate(uuid)
  name: string @generate(word)
  employeeCount: number @generate(randomInt, min: 10, max: 1000)
  foundedDate: date @generate(dateRange, start: "1990-01-01", end: "2020-12-31")
}

schema Department {
  deptId: uuid @generate(uuid)
  name: string @generate(pick, choices: ["Engineering", "Sales", "Marketing", "HR"])
  orgId: uuid  # Reference to Organization
  budget: number @generate(randomInt, min: 100000, max: 5000000)
  headCount: number @generate(randomInt, min: 5, max: 50)
}

schema Employee {
  empId: uuid @generate(uuid)
  firstName: string @generate(firstName)
  lastName: string @generate(lastName)
  email: string  # Template: {{firstName}}.{{lastName}}@example.com
  deptId: uuid  # Reference to Department
  salary: number @generate(randomInt, min: 50000, max: 200000)
  hireDate: date @generate(dateRange, start: "2015-01-01", end: "2024-12-31")
  position: string @generate(pick, choices: ["Junior", "Senior", "Lead", "Manager"])
  isManager: boolean @generate(pick, choices: [true, false])
}
