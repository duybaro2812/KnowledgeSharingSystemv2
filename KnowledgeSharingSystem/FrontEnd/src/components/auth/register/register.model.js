export function createRegisterModel(input) {
  return {
    registerForm: input.registerForm,
    showRegisterPassword: !!input.showRegisterPassword,
    showRegisterConfirmPassword: !!input.showRegisterConfirmPassword,
    hasRegisterPasswordInput: !!input.hasRegisterPasswordInput,
    registerPasswordInvalid: !!input.registerPasswordInvalid,
    registerPasswordStrength: input.registerPasswordStrength,
    error: input.error || "",
  };
}
