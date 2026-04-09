function LoginFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card" onSubmit={controller.onSubmit}>
      <h2>Sign in</h2>
      <p className="auth-card-subtitle">Continue with your NeuShare account.</p>
      <input
        placeholder="Username"
        value={model.loginForm.username}
        onChange={(e) => controller.onChangeUsername(e.target.value)}
      />
      <div className="password-field">
        <input
          placeholder="Password"
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
      <button type="submit" className="primary-btn">
        Login
      </button>
      <button type="button" onClick={controller.goRegister}>
        Create account
      </button>
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default LoginFormView;
