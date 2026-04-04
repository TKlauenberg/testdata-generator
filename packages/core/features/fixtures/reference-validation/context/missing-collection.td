schema User {
  email: string generator=pick(array=["@context.usres.random.email"])
}