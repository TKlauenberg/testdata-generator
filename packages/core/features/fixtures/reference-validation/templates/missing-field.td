schema User {
  firstName: string
  email: string generator=pick(array=["{{fristName}}@example.com"])
}