schema User extends Admin {
  id: string
}

schema Admin extends User {
  role: string
}
