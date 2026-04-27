function LoginFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card auth-card-animated" onSubmit={controller.onSubmit}>
      <div className="auth-card-head">
        <span className="auth-form-badge">Welcome back</span>
        <h2>Sign in</h2>
        <p className="auth-card-subtitle">Continue with your NeuShare account.</p>
      </div>

      <label className="auth-field auth-field-drop" style={{ "--delay": "60ms" }}>
        <span>Username</span>
        <div className="auth-input-wrap">
          <span className="auth-input-icon">ID</span>
          <input
            placeholder="Enter your username"
            value={model.loginForm.username}
            onChange={(e) => controller.onChangeUsername(e.target.value)}
          />
        </div>
      </label>

      <label className="auth-field auth-field-drop" style={{ "--delay": "120ms" }}>
        <span>Password</span>
        <div className="password-field auth-input-wrap">
          <span className="auth-input-icon">PW</span>
          <input
            placeholder="Enter your password"
            type={model.showLoginPassword ? "text" : "password"}
            value={model.loginForm.password}
            onChange={(e) => controller.onChangePassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={controller.onTogglePassword}
            aria-label={model.showLoginPassword ? "Hide password" : "Show password"}
            title={model.showLoginPassword ? "Hide password" : "Show password"}
          >
            {model.showLoginPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="auth-row auth-login-row">
        <label className="auth-check">
          <input
            type="checkbox"
            checked={model.loginForm.adminLogin}
            onChange={(e) => controller.onToggleAdminLogin(e.target.checked)}
          />
          <span>Use admin login endpoint</span>
        </label>
        <button type="button" className="link-btn auth-help-link" onClick={controller.goForgotPassword}>
          Forgot password?
        </button>
      </div>

      <button type="submit" className="primary-btn auth-submit-btn">
        <span>Login</span>
        <span className="auth-btn-arrow">{"->"}</span>
      </button>
      <button type="button" className="auth-secondary-btn" onClick={controller.goRegister}>
        Create account
      </button>
      <button type="button" className="link-btn" onClick={controller.goGuest}>
        Continue as guest
      </button>
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default LoginFormView;
