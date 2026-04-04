@import "../common/base.td"

schema ExtendedUser extends User {
  email: string generator=pick(array=["extended@example.com"])
  slug: string generator=pick(array=["{{id}}-qa"])
}
