function ForgotPasswordVerifyFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card" onSubmit={controller.onSubmit}>
      <h2>Reset password</h2>
      <input value={model.forgotEmail} readOnly />
      <input
        placeholder="Enter OTP code"
        value={model.forgotOtp}
        onChange={(e) => controller.onChangeOtp(e.target.value)}
      />
      <div className="password-field">
        <input
          placeholder="New password"
          type={model.showForgotNewPassword ? "text" : "password"}
          className={model.forgotPasswordInvalid ? "input-invalid" : ""}
          value={model.forgotNewPassword}
          onChange={(e) => controller.onChangeNewPassword(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={controller.onToggleNewPassword}
          aria-label={model.showForgotNewPassword ? "Hide password" : "Show password"}
          title={model.showForgotNewPassword ? "Hide password" : "Show password"}
        >
          {model.showForgotNewPassword ? "Hide" : "Show"}
        </button>
      </div>
      {model.hasForgotPasswordInput && (
        <>
          <div className="password-strength">
            <div className="password-strength-track">
              <div
                className={`password-strength-fill ${model.forgotPasswordStrength.className}`}
                style={{
                  width: `${(model.forgotPasswordStrength.score / 5) * 100}%`,
                }}
              />
            </div>
            <span
              className={`password-strength-label ${model.forgotPasswordStrength.className}`}
            >
              {model.forgotPasswordStrength.label}
            </span>
          </div>
          <p className="hint">
            Password rule: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1
            special.
          </p>
        </>
      )}
      <div className="password-field">
        <input
          placeholder="Confirm new password"
          type={model.showForgotConfirmPassword ? "text" : "password"}
          value={model.forgotConfirmPassword}
          onChange={(e) => controller.onChangeConfirmPassword(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={controller.onToggleConfirmPassword}
          aria-label={model.showForgotConfirmPassword ? "Hide password" : "Show password"}
          title={model.showForgotConfirmPassword ? "Hide password" : "Show password"}
        >
          {model.showForgotConfirmPassword ? "Hide" : "Show"}
        </button>
      </div>
      <div className="auth-actions">
        <button type="submit" className="primary-btn">
          Reset password
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
      <button type="button" onClick={controller.goLogin}>
        Back to login
      </button>
      {model.forgotOtpPreview && <p className="hint">Dev OTP: {model.forgotOtpPreview}</p>}
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default ForgotPasswordVerifyFormView;
