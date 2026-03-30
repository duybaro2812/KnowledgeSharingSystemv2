function RegisterFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card" onSubmit={controller.onSubmit}>
      <h2>Create account</h2>
      <input
        placeholder="Name"
        value={model.registerForm.name}
        onChange={(e) => controller.onChangeName(e.target.value)}
      />
      <input
        placeholder="Username"
        value={model.registerForm.username}
        onChange={(e) => controller.onChangeUsername(e.target.value)}
      />
      <input
        placeholder="Email"
        type="email"
        value={model.registerForm.email}
        onChange={(e) => controller.onChangeEmail(e.target.value)}
      />
      <div className="password-field">
        <input
          placeholder="Password"
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
      <div className="password-field">
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
      <button type="submit" className="primary-btn">
        Register & send OTP
      </button>
      <button type="button" onClick={controller.goLogin}>
        Back to login
      </button>
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default RegisterFormView;
