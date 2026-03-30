function ForgotPasswordRequestFormView(props) {
  const { model, controller } = props;

  return (
    <form className="auth-card" onSubmit={controller.onSubmit}>
      <h2>Forgot password</h2>
      <input
        placeholder="Your account email"
        type="email"
        value={model.forgotEmail}
        onChange={(e) => controller.onChangeEmail(e.target.value)}
      />
      <button type="submit" className="primary-btn">
        Send reset OTP
      </button>
      <button type="button" onClick={controller.goLogin}>
        Back to login
      </button>
      {model.error && <p className="err">{model.error}</p>}
    </form>
  );
}

export default ForgotPasswordRequestFormView;
