export function createVerifyOtpController(input) {
  return {
    onSubmit: input.handleVerifyOtp,
    onChangeOtpCode: (value) => input.setOtpCode(value),
    onResendOtp: input.handleResendOtp,
    goRegister: () => {
      input.setAuthMode("register");
      input.clearFeedback();
    },
  };
}
