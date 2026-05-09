export function createSettingsController(input) {
  return {
    onChangePassword: input.changeMyPassword,
    onUpdateProfile: input.updateMyProfile,
    onRequestAdditionalEmailOtp: input.requestAdditionalEmailOtp,
    onVerifyAdditionalEmailOtp: input.verifyAdditionalEmailOtp,
    onUpdateAvatar: input.updateMyAvatar,
    resolveFileUrl: input.resolveFileUrl,
  };
}
