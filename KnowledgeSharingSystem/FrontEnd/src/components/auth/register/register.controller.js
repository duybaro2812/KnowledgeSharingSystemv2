export function createRegisterController(input) {
  return {
    onSubmit: input.handleRequestOtp,
    onChangeName: (value) => input.setRegisterForm((p) => ({ ...p, name: value })),
    onChangeUsername: (value) =>
      input.setRegisterForm((p) => ({ ...p, username: value })),
    onChangeEmail: (value) => input.setRegisterForm((p) => ({ ...p, email: value })),
    onChangePassword: (value) =>
      input.setRegisterForm((p) => ({ ...p, password: value })),
    onChangeConfirmPassword: (value) =>
      input.setRegisterForm((p) => ({ ...p, confirmPassword: value })),
    onTogglePassword: () => input.setShowRegisterPassword((prev) => !prev),
    onToggleConfirmPassword: () =>
      input.setShowRegisterConfirmPassword((prev) => !prev),
    goLogin: () => {
      input.setAuthMode("login");
      input.clearFeedback();
    },
    goGuest: () => {
      input.setAuthMode("guest");
      input.clearFeedback();
    },
  };
}
