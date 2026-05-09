import AuthLeftPanel from "./AuthLeftPanel";
import ForgotPasswordRequestForm from "./ForgotPasswordRequestForm";
import ForgotPasswordVerifyForm from "./ForgotPasswordVerifyForm";
import GuestLanding from "./GuestLanding";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import VerifyOtpForm from "./VerifyOtpForm";

function AuthShellView(props) {
  const { model, controller, sharedProps } = props;
  const mode = sharedProps.authMode || "login";

  return (
    <div className={`auth-shell mode-${mode}`}>
      <AuthLeftPanel />

      <div className="auth-form-stage">
        {controller.isMode("guest") && <GuestLanding {...sharedProps} />}
        {controller.isMode("login") && <LoginForm {...sharedProps} />}
        {controller.isMode("forgot-password") && (
          <ForgotPasswordRequestForm {...sharedProps} />
        )}
        {controller.isMode("forgot-verify") && <ForgotPasswordVerifyForm {...sharedProps} />}
        {controller.isMode("register") && <RegisterForm {...sharedProps} />}
        {controller.isMode("verify-otp") && <VerifyOtpForm {...sharedProps} />}

        {model.status && <p className="ok auth-status-message">{model.status}</p>}
      </div>
    </div>
  );
}

export default AuthShellView;
