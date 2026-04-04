schema User {
  id: string generator=pick(array=["base-id"])
  email: string generator=pick(array=["base@example.com"])
  fullName: string generator=pick(array=["Base User"])
}
