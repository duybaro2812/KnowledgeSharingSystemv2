export function createLoginModel(input) {
  return {
    loginForm: input.loginForm,
    showLoginPassword: !!input.showLoginPassword,
    error: input.error || "",
  };
}
