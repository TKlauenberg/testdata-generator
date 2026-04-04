schema User {
  email: string generator=@workspace.generators.sharedEmail
}