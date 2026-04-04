schema BaseUser {
  id: uuid
}

schema ExtendedUser extends BaseUsr {
  email: string
}