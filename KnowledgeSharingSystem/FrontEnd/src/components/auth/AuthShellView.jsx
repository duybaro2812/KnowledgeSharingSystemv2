import AuthLeftPanel from "./AuthLeftPanel";
import ForgotPasswordRequestForm from "./ForgotPasswordRequestForm";
import ForgotPasswordVerifyForm from "./ForgotPasswordVerifyForm";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import VerifyOtpForm from "./VerifyOtpForm";

function AuthShellView(props) {
  const { model, controller, sharedProps } = props;

  return (
    <div className="auth-shell">
      <AuthLeftPanel />

      {controller.isMode("login") && <LoginForm {...sharedProps} />}
      {controller.isMode("forgot-password") && (
        <ForgotPasswordRequestForm {...sharedProps} />
      )}
      {controller.isMode("forgot-verify") && <ForgotPasswordVerifyForm {...sharedProps} />}
      {controller.isMode("register") && <RegisterForm {...sharedProps} />}
      {controller.isMode("verify-otp") && <VerifyOtpForm {...sharedProps} />}

      {model.status && <p className="ok">{model.status}</p>}
    </div>
  );
}

export default AuthShellView;
