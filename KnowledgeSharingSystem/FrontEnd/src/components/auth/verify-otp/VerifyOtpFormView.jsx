function VerifyOtpFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card" onSubmit={controller.onSubmit}>
      <h2>Verify OTP</h2>
      <input value={model.otpEmail} readOnly />
      <input
        placeholder="Enter OTP code"
        value={model.otpCode}
        onChange={(e) => controller.onChangeOtpCode(e.target.value)}
      />
      <div className="auth-actions">
        <button type="submit" className="primary-btn">
          Verify OTP
        </button>
        <button
          type="button"
          onClick={controller.onResendOtp}
          disabled={model.resendCooldown > 0}
          title={model.resendCooldown > 0 ? `Wait ${model.resendCooldown}s` : "Resend OTP"}
        >
          {model.resendCooldown > 0
            ? `Resend in ${model.resendCooldown}s`
            : "Resend OTP"}
        </button>
      </div>
      <button type="button" onClick={controller.goRegister}>
        Back
      </button>
      {model.otpPreview && <p className="hint">Dev OTP: {model.otpPreview}</p>}
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default VerifyOtpFormView;
