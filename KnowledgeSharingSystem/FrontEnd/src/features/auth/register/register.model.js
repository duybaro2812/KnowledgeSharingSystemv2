export function createRegisterModel(input) {
  return {
    registerForm: input.registerForm,
    showRegisterPassword: !!input.showRegisterPassword,
    showRegisterConfirmPassword: !!input.showRegisterConfirmPassword,
    hasRegisterPasswordInput: !!input.hasRegisterPasswordInput,
    registerPasswordInvalid: !!input.registerPasswordInvalid,
    registerPasswordStrength: input.registerPasswordStrength,
    resendCooldown: input.resendCooldown || 0,
    isRegisterOtpSending: !!input.isRegisterOtpSending,
    error: input.error || "",
  };
}
