export function createForgotVerifyController(input) {
  return {
    onSubmit: input.handleResetPasswordWithOtp,
    onChangeOtp: (value) => input.setForgotOtp(value),
    onChangeNewPassword: (value) => input.setForgotNewPassword(value),
    onChangeConfirmPassword: (value) => input.setForgotConfirmPassword(value),
    onToggleNewPassword: () => input.setShowForgotNewPassword((prev) => !prev),
    onToggleConfirmPassword: () =>
      input.setShowForgotConfirmPassword((prev) => !prev),
    onResendOtp: input.handleResendForgotOtp,
    goLogin: () => {
      input.setAuthMode("login");
      input.clearFeedback();
    },
  };
}
