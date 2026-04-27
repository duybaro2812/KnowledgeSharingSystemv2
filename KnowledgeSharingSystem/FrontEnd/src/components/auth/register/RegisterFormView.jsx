function RegisterFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card auth-card-animated" onSubmit={controller.onSubmit}>
      <div className="auth-card-head">
        <span className="auth-form-badge">Join NeuShare</span>
        <h2>Create account</h2>
        <p className="auth-card-subtitle">
          Build your library, share documents, and unlock reviewed resources.
        </p>
      </div>

      <div className="auth-step-row" aria-hidden="true">
        <span className="active">Profile</span>
        <span>Security</span>
        <span>OTP</span>
      </div>

      <label className="auth-field auth-field-drop" style={{ "--delay": "60ms" }}>
        <span>Name</span>
        <div className="auth-input-wrap">
          <span className="auth-input-icon">NM</span>
          <input
            placeholder="Your full name"
            value={model.registerForm.name}
            onChange={(e) => controller.onChangeName(e.target.value)}
          />
        </div>
      </label>

      <label className="auth-field auth-field-drop" style={{ "--delay": "120ms" }}>
        <span>Username</span>
        <div className="auth-input-wrap">
          <span className="auth-input-icon">ID</span>
          <input
            placeholder="Choose a username"
            value={model.registerForm.username}
            onChange={(e) => controller.onChangeUsername(e.target.value)}
          />
        </div>
      </label>

      <label className="auth-field auth-field-drop" style={{ "--delay": "180ms" }}>
        <span>Email</span>
        <div className="auth-input-wrap">
          <span className="auth-input-icon">@</span>
          <input
            placeholder="you@example.com"
            type="email"
            value={model.registerForm.email}
            onChange={(e) => controller.onChangeEmail(e.target.value)}
          />
        </div>
      </label>

      <label className="auth-field auth-field-drop" style={{ "--delay": "240ms" }}>
        <span>Password</span>
        <div className="password-field auth-input-wrap">
          <span className="auth-input-icon">PW</span>
          <input
            placeholder="Create a strong password"
            type={model.showRegisterPassword ? "text" : "password"}
            className={model.registerPasswordInvalid ? "input-invalid" : ""}
            value={model.registerForm.password}
            onChange={(e) => controller.onChangePassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={controller.onTogglePassword}
            aria-label={model.showRegisterPassword ? "Hide password" : "Show password"}
            title={model.showRegisterPassword ? "Hide password" : "Show password"}
          >
            {model.showRegisterPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {model.hasRegisterPasswordInput && (
        <>
          <div className="password-strength">
            <div className="password-strength-track">
              <div
                className={`password-strength-fill ${model.registerPasswordStrength.className}`}
                style={{
                  width: `${(model.registerPasswordStrength.score / 5) * 100}%`,
                }}
              />
            </div>
            <span
              className={`password-strength-label ${model.registerPasswordStrength.className}`}
            >
              {model.registerPasswordStrength.label}
            </span>
          </div>
          <p className="hint">
            Password rule: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1
            special.
          </p>
        </>
      )}

      <label className="auth-field auth-field-drop" style={{ "--delay": "300ms" }}>
        <span>Confirm password</span>
        <div className="password-field auth-input-wrap">
          <span className="auth-input-icon">OK</span>
          <input
            placeholder="Confirm password"
            type={model.showRegisterConfirmPassword ? "text" : "password"}
            value={model.registerForm.confirmPassword}
            onChange={(e) => controller.onChangeConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={controller.onToggleConfirmPassword}
            aria-label={model.showRegisterConfirmPassword ? "Hide password" : "Show password"}
            title={model.showRegisterConfirmPassword ? "Hide password" : "Show password"}
          >
            {model.showRegisterConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <button
        type="submit"
        className="primary-btn auth-submit-btn"
        disabled={model.isRegisterOtpSending || model.resendCooldown > 0}
      >
        <span>
          {model.isRegisterOtpSending
            ? "Sending OTP..."
            : model.resendCooldown > 0
              ? `Resend in ${model.resendCooldown}s`
              : "Register & send OTP"}
        </span>
        <span className="auth-btn-arrow">{"->"}</span>
      </button>
      <button type="button" className="auth-secondary-btn" onClick={controller.goLogin}>
        Back to login
      </button>
      <button type="button" className="link-btn" onClick={controller.goGuest}>
        Continue as guest
      </button>
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default RegisterFormView;
