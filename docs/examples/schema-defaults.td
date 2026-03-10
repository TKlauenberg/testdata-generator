schema User {
  @defaults {
    string generator=randomString(length=14)
    unique=true
  }

  id: uuid generator=uuid
  name: string
  username: string
  email: string generator=email
}

schema Product {
  @defaults {
    string generator=pick(array=["staging", "production", "preview"])
  }

  sku: string generator=randomString(length=8)
  environment: string
  channel: string
}