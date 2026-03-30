export function createLoginController(input) {
  return {
    onSubmit: input.handleLogin,
    onChangeUsername: (value) =>
      input.setLoginForm((p) => ({ ...p, username: value })),
    onChangePassword: (value) =>
      input.setLoginForm((p) => ({ ...p, password: value })),
    onTogglePassword: () => input.setShowLoginPassword((prev) => !prev),
    onToggleAdminLogin: (checked) =>
      input.setLoginForm((p) => ({ ...p, adminLogin: checked })),
    goForgotPassword: () => {
      input.setAuthMode("forgot-password");
      input.clearFeedback();
    },
    goRegister: () => {
      input.setAuthMode("register");
      input.clearFeedback();
    },
  };
}
