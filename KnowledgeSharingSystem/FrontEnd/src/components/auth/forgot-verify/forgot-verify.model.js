export function createForgotVerifyModel(input) {
  return {
    forgotEmail: input.forgotEmail,
    forgotOtp: input.forgotOtp,
    forgotNewPassword: input.forgotNewPassword,
    forgotConfirmPassword: input.forgotConfirmPassword,
    showForgotNewPassword: !!input.showForgotNewPassword,
    showForgotConfirmPassword: !!input.showForgotConfirmPassword,
    hasForgotPasswordInput: !!input.hasForgotPasswordInput,
    forgotPasswordInvalid: !!input.forgotPasswordInvalid,
    forgotPasswordStrength: input.forgotPasswordStrength,
    resendCooldown: input.resendCooldown || 0,
    forgotOtpPreview: input.forgotOtpPreview || "",
    error: input.error || "",
  };
}
