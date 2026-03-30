export function createForgotRequestController(input) {
  return {
    onSubmit: input.handleForgotPassword,
    onChangeEmail: (value) => input.setForgotEmail(value),
    goLogin: () => {
      input.setAuthMode("login");
      input.clearFeedback();
    },
  };
}
