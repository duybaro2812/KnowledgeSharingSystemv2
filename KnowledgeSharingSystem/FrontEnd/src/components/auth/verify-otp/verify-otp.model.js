export function createVerifyOtpModel(input) {
  return {
    otpEmail: input.otpEmail,
    otpCode: input.otpCode,
    resendCooldown: input.resendCooldown || 0,
    otpPreview: input.otpPreview || "",
    error: input.error || "",
  };
}
