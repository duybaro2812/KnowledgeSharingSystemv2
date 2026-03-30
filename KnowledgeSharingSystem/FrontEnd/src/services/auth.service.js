import { apiRequest } from "../api";
import { hasModeratorRole, initialRegister } from "../models/app.constants";

export function createAuthFeature(ctx) {
  const {
    call,
    loginForm,
    registerForm,
    forgotEmail,
    otpEmail,
    otpCode,
    forgotOtp,
    forgotNewPassword,
    forgotConfirmPassword,
    isStrongPassword,
    setSession,
    setActiveTab,
    setStatus,
    setAuthMode,
    setOtpEmail,
    setOtpPreview,
    setResendCooldown,
    setRegisterForm,
    setOtpCode,
    setForgotEmail,
    setForgotOtpPreview,
    setForgotOtp,
    setForgotNewPassword,
    setForgotConfirmPassword,
    loadMyDocuments,
    loadNotifications,
    loadPendingDocuments,
  } = ctx;

  const handleLogin = async (e) => {
    e.preventDefault();
    await call(async () => {
      const path = loginForm.adminLogin ? "/auth/login/admin" : "/auth/login";
      const payload = await apiRequest(path, {
        method: "POST",
        body: { username: loginForm.username, password: loginForm.password },
      });
      const nextToken = payload.data.token;
      const nextUser = payload.data.user;
      setSession(nextToken, nextUser);
      setActiveTab("home");
      setStatus("Login successful.");
      await loadMyDocuments();
      if (!hasModeratorRole(nextUser?.role)) await loadNotifications();
      if (hasModeratorRole(nextUser?.role)) await loadPendingDocuments(nextToken);
    });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    await call(async () => {
      if (!isStrongPassword(registerForm.password)) {
        throw new Error(
          "Password must be at least 8 chars and include uppercase, lowercase, number, and special character.",
        );
      }
      const payload = await apiRequest("/auth/register/request-otp", {
        method: "POST",
        body: registerForm,
      });
      setOtpEmail(payload.data.email);
      setOtpPreview(payload.data.otpPreview || "");
      setAuthMode("verify-otp");
      setResendCooldown(60);
      setStatus("OTP sent. Please check your email.");
    });
  };

  const handleResendOtp = async () => {
    await call(async () => {
      const payload = await apiRequest("/auth/register/request-otp", {
        method: "POST",
        body: registerForm,
      });
      setOtpEmail(payload.data.email);
      setOtpPreview(payload.data.otpPreview || "");
      setResendCooldown(60);
      setStatus("OTP resent. Please check your email.");
    });
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    await call(async () => {
      await apiRequest("/auth/register/verify-otp", {
        method: "POST",
        body: {
          email: otpEmail,
          otp: otpCode,
        },
      });
      setStatus("Register successful. Please login now.");
      setAuthMode("login");
      setRegisterForm(initialRegister);
      setOtpCode("");
      setOtpEmail("");
      setOtpPreview("");
    });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    await call(async () => {
      if (!forgotEmail.trim()) throw new Error("Please input your email.");
      const payload = await apiRequest("/auth/forgot-password/request-otp", {
        method: "POST",
        body: { email: forgotEmail.trim().toLowerCase() },
      });
      setForgotEmail(payload.data.email);
      setForgotOtpPreview(payload.data.otpPreview || "");
      setAuthMode("forgot-verify");
      setResendCooldown(60);
      setStatus("Password reset OTP sent. Please check your email.");
    });
  };

  const handleResendForgotOtp = async () => {
    await call(async () => {
      const payload = await apiRequest("/auth/forgot-password/request-otp", {
        method: "POST",
        body: { email: forgotEmail.trim().toLowerCase() },
      });
      setForgotEmail(payload.data.email);
      setForgotOtpPreview(payload.data.otpPreview || "");
      setResendCooldown(60);
      setStatus("Password reset OTP resent. Please check your email.");
    });
  };

  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    await call(async () => {
      if (!isStrongPassword(forgotNewPassword)) {
        throw new Error(
          "New password must be at least 8 chars and include uppercase, lowercase, number, and special character.",
        );
      }
      await apiRequest("/auth/forgot-password/reset", {
        method: "POST",
        body: {
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword,
        },
      });
      setStatus("Password reset successful. Please login now.");
      setAuthMode("login");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotOtpPreview("");
      setResendCooldown(0);
    });
  };

  return {
    handleLogin,
    handleRequestOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleForgotPassword,
    handleResendForgotOtp,
    handleResetPasswordWithOtp,
  };
}
