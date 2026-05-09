export function createForgotRequestModel(input) {
  return {
    forgotEmail: input.forgotEmail,
    error: input.error || "",
  };
}
